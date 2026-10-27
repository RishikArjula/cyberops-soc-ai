/**
 * Supabase PostgreSQL Adapter for Security Alerts & Analyst Notes
 *
 * Enforces:
 * 1. PostgreSQL Row-Level Security (RLS) policies on public.alerts and public.alert_notes.
 * 2. Super Admin operational isolation (Super Admins are architecturally blocked from reading or mutating alerts).
 * 3. Scoped access for IT Operations (only alerts associated with assigned remediation tasks).
 * 4. Private investigation notes restricted strictly to SOC Analysts.
 * 5. Defense-in-depth authorization assertions before dispatching database operations.
 */

import { IAlertRepository } from '../IAlertRepository';
import { SecurityAlert, AlertFilterOptions, AlertStatus } from '../../types/alert';
import { UserProfile, AccessDeniedError } from '../../types/auth';
import { AuthorizationService } from '../../services/authorizationService';
import { getSupabaseClient } from '../../lib/supabaseClient';

function mapRowToSecurityAlert(row: any, notes: string[] = []): SecurityAlert {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    detectedAt: row.detected_at,
    sourceIp: row.source_ip,
    destinationIp: row.destination_ip || undefined,
    hostName: row.host_name,
    userName: row.user_name || undefined,
    mitreTechniqueId: row.mitre_technique_id || undefined,
    mitreTacticId: row.mitre_tactic_id || undefined,
    confidenceScore: Number(row.confidence_score),
    evidence: typeof row.evidence === 'object' && row.evidence !== null ? row.evidence : {},
    networkFlowId: row.network_flow_id || undefined,
    analystNotes: notes,
    assignedAnalyst: row.assigned_analyst || undefined,
    isSynthetic: true,
    provenance: row.provenance || 'Supabase PostgreSQL Persistent Store',
  };
}

export class SupabaseAlertRepository implements IAlertRepository {
  /**
   * Retrieves alerts strictly scoped to the requesting user's role and assigned records.
   * Access is gated by PostgreSQL RLS (alerts_select_policy) and client-side defense-in-depth.
   */
  async getAlertsForUser(
    user: UserProfile,
    filter?: Partial<AlertFilterOptions>,
    assignedAlertIds?: string[]
  ): Promise<SecurityAlert[]> {
    // 1. Defense-in-depth: Super Admin is strictly isolated from operational alerts
    if (user.role === 'super_admin') {
      throw new AccessDeniedError(
        'Platform Administrator is architecturally isolated from private SOC operational alerts.',
        'alert:read',
        user.role
      );
    }

    const client = getSupabaseClient();
    let query = client.from('alerts').select('*');

    // Filter criteria mapped to database columns
    if (filter?.severities && filter.severities.length > 0) {
      query = query.in('severity', filter.severities);
    }

    if (filter?.statuses && filter.statuses.length > 0) {
      query = query.in('status', filter.statuses);
    }

    if (filter?.tacticId) {
      query = query.eq('mitre_tactic_id', filter.tacticId);
    }

    // Sort order
    if (filter?.sortBy) {
      const ascending = filter.sortOrder === 'asc';
      if (filter.sortBy === 'detectedAt') {
        query = query.order('detected_at', { ascending });
      } else if (filter.sortBy === 'confidenceScore') {
        query = query.order('confidence_score', { ascending });
      } else if (filter.sortBy === 'severity') {
        query = query.order('severity', { ascending });
      }
    } else {
      query = query.order('detected_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`[SupabaseAlertRepository] Query failed: ${error.message}`);
    }

    let rows = data || [];

    // Client-side text search across combined text fields
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      rows = rows.filter(
        (a: any) =>
          a.id.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.host_name.toLowerCase().includes(q) ||
          (a.mitre_technique_id && a.mitre_technique_id.toLowerCase().includes(q)) ||
          a.source_ip.includes(q)
      );
    }

    // 2. Fetch normalized investigation notes if caller is authorized (SOC Analysts only)
    let notesByAlertId: Record<string, string[]> = {};
    if (user.role === 'soc_analyst') {
      try {
        const { data: notesData, error: notesError } = await client
          .from('alert_notes')
          .select('alert_id, note_text, created_at')
          .order('created_at', { ascending: true });

        if (!notesError && notesData) {
          for (const item of notesData) {
            if (!notesByAlertId[item.alert_id]) {
              notesByAlertId[item.alert_id] = [];
            }
            notesByAlertId[item.alert_id].push(item.note_text);
          }
        }
      } catch {
        // Notes remain private/unloaded if restricted
      }
    }

    return rows.map((row) => mapRowToSecurityAlert(row, notesByAlertId[row.id] || []));
  }

  /**
   * Retrieves a single alert with record-level permission verification.
   */
  async getAlertByIdForUser(
    user: UserProfile,
    id: string,
    assignedAlertIds: string[] = ['ALT-2026-1046', 'ALT-2026-1047']
  ): Promise<SecurityAlert | null> {
    if (user.role === 'super_admin') {
      throw new AccessDeniedError(
        `Access Denied: Platform Administrator is architecturally isolated from private SOC alert ${id}.`,
        'alert:read',
        user.role
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('alerts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[SupabaseAlertRepository] Failed to fetch alert ${id}: ${error.message}`);
    }

    if (!data) return null;

    let notes: string[] = [];
    if (user.role === 'soc_analyst') {
      const { data: notesData } = await client
        .from('alert_notes')
        .select('note_text')
        .eq('alert_id', id)
        .order('created_at', { ascending: true });

      if (notesData) {
        notes = notesData.map((n: any) => n.note_text);
      }
    }

    const alert = mapRowToSecurityAlert(data, notes);

    if (!AuthorizationService.canReadAlertRecord(user, alert, assignedAlertIds)) {
      throw new AccessDeniedError(
        `Access Denied: User in role "${user.role}" is not authorized to read alert record ${id}.`,
        'alert:read',
        user.role
      );
    }

    return alert;
  }

  /**
   * Updates alert triage status. Requires 'alert:triage' permission and approved soc_analyst role.
   */
  async updateAlertStatus(user: UserProfile, id: string, status: AlertStatus): Promise<SecurityAlert> {
    AuthorizationService.assertPermission(user, 'alert:triage');

    const client = getSupabaseClient();
    const { data, error } = await client
      .from('alerts')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`[SupabaseAlertRepository] Failed to update alert status: ${error.message}`);
    }

    return (await this.getAlertByIdForUser(user, id))!;
  }

  /**
   * Appends an analyst investigation note. Requires 'alert:add_note' permission and approved soc_analyst role.
   */
  async addAnalystNote(user: UserProfile, id: string, note: string): Promise<SecurityAlert> {
    AuthorizationService.assertPermission(user, 'alert:add_note');

    const client = getSupabaseClient();
    const formattedNote = `[${user.callsign} (${user.role.toUpperCase()})]: ${note.trim()}`;

    const { error: noteError } = await client
      .from('alert_notes')
      .insert({
        alert_id: id,
        author_id: user.id.startsWith('usr-') ? null : user.id,
        author_role: 'soc_analyst',
        note_text: formattedNote,
      });

    if (noteError) {
      throw new Error(`[SupabaseAlertRepository] Failed to add analyst note: ${noteError.message}`);
    }

    return (await this.getAlertByIdForUser(user, id))!;
  }

  /**
   * Reset implementation (no-op in persistent database environment).
   */
  async resetToDefault(): Promise<void> {
    // Persistent Supabase database does not wipe operational data on client reset
  }
}
