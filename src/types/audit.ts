/**
 * Audit Log Data Contract
 * Records simulated containment & remediation actions with user role and rationale.
 */

import { UserRole } from './auth';

export type ResponseActionType =
  | 'isolate_host'
  | 'unisolate_host'
  | 'block_ip'
  | 'unblock_ip'
  | 'lock_account'
  | 'unlock_account'
  | 'revoke_token'
  | 'collect_forensics';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  actionType: ResponseActionType;
  targetResource: string;
  justification: string;
  status: 'SIMULATED_SUCCESS' | 'SIMULATED_FAILED' | 'PROPOSED';
  associatedAlertId?: string;
  isSimulated: true; // Explicit flag confirming non-production simulated execution
  systemNote: string;
}

export interface IncidentTask {
  id: string;
  title: string;
  description: string;
  assignedRole: UserRole;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
  targetAsset: string;
  suggestedActionType?: ResponseActionType;
  associatedAlertId?: string;
  completedAt?: string;
  completedBy?: string;
  completionNotes?: string;
}
