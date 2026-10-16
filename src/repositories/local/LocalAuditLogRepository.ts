/**
 * Local Browser Storage Adapter for Audit Logs & Incident Tasks with Role Enforcement
 *
 * PROTOTYPE ARCHITECTURE & SECURITY NOTICE:
 * Logs generated here represent SIMULATED actions and proposed remediation workflows.
 * No actions are dispatched to production firewalls, EDR agents, or directory services.
 * Unauthorized cross-role executions throw explicit AccessDeniedError.
 */

import { IAuditLogRepository } from '../IAuditLogRepository';
import { AuditLogEntry, IncidentTask } from '../../types/audit';
import { UserProfile, AccessDeniedError } from '../../types/auth';
import { AuthorizationService } from '../../services/authorizationService';

const AUDIT_STORAGE_KEY = 'ai_soc_audit_logs_v1';
const TASKS_STORAGE_KEY = 'ai_soc_tasks_v1';

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-SIM-001',
    timestamp: '2026-10-12T04:00:20Z',
    actorName: 'Marcus Vance',
    actorRole: 'it_operations',
    actionType: 'isolate_host',
    targetResource: 'FILESERVER-01 (192.168.10.99)',
    justification: 'VSSadmin shadow copy deletion detected. Authorized host network quarantine per Playbook IR-04.',
    status: 'SIMULATED_SUCCESS',
    associatedAlertId: 'ALT-2026-1046',
    isSimulated: true,
    systemNote: 'Simulated endpoint isolation flag set. Network interface not severed in prototype environment.',
  },
];

const INITIAL_TASKS: IncidentTask[] = [
  {
    id: 'TSK-2026-001',
    title: 'Verify File Server Offline Snapshot Integrity',
    description: 'Ensure offline storage backups for FILESERVER-01 are uncorrupted following shadow copy tampering alert.',
    assignedRole: 'it_operations',
    status: 'pending',
    priority: 'critical',
    createdAt: '2026-10-12T04:02:00Z',
    targetAsset: 'FILESERVER-01',
    suggestedActionType: 'isolate_host',
    associatedAlertId: 'ALT-2026-1046',
  },
  {
    id: 'TSK-2026-002',
    title: 'Revoke and Reset Compromised Service Account Kerberos Ticket',
    description: 'Service account DOMAIN\\svc_backup observed initiating unauthorized WMI process creation on DC-01.',
    assignedRole: 'it_operations',
    status: 'in_progress',
    priority: 'high',
    createdAt: '2026-10-12T04:35:00Z',
    targetAsset: 'DOMAIN\\svc_backup',
    suggestedActionType: 'lock_account',
    associatedAlertId: 'ALT-2026-1047',
  },
  {
    id: 'TSK-2026-003',
    title: 'Configure Edge Firewall Rate Limiting for DMZ Proxy',
    description: 'Implement connection threshold per IP to mitigate Slowloris resource exhaustion attempts.',
    assignedRole: 'security_engineer',
    status: 'pending',
    priority: 'medium',
    createdAt: '2026-10-12T05:12:00Z',
    targetAsset: 'WEB-PROXY-DMZ',
    suggestedActionType: 'block_ip',
  },
];

const SEED_TASK_ALERT_MAPPINGS: Record<string, string> = {
  'TSK-2026-001': 'ALT-2026-1046',
  'TSK-2026-002': 'ALT-2026-1047',
};

export class LocalAuditLogRepository implements IAuditLogRepository {
  private memoryAudit: AuditLogEntry[] | null = null;
  private memoryTasks: IncidentTask[] | null = null;

  private getAuditData(): AuditLogEntry[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(AUDIT_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
    if (this.memoryAudit) return this.memoryAudit;
    this.memoryAudit = [...INITIAL_AUDIT_LOGS];
    this.saveAuditData(this.memoryAudit);
    return this.memoryAudit;
  }

  private saveAuditData(logs: AuditLogEntry[]): void {
    this.memoryAudit = logs;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
      } catch {
        // Fallback
      }
    }
  }

  private getTasksData(): IncidentTask[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(TASKS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            let migratedCount = 0;
            const migrated = parsed.map((task: any) => {
              if (
                task &&
                typeof task === 'object' &&
                SEED_TASK_ALERT_MAPPINGS[task.id] &&
                !task.associatedAlertId
              ) {
                migratedCount++;
                return {
                  ...task,
                  associatedAlertId: SEED_TASK_ALERT_MAPPINGS[task.id],
                };
              }
              return task;
            });

            if (migratedCount > 0) {
              this.saveTasksData(migrated);
            }
            return migrated;
          }
        }
      } catch {
        // Fallback
      }
    }
    if (this.memoryTasks) return this.memoryTasks;
    this.memoryTasks = [...INITIAL_TASKS];
    this.saveTasksData(this.memoryTasks);
    return this.memoryTasks;
  }

  private saveTasksData(tasks: IncidentTask[]): void {
    this.memoryTasks = tasks;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
      } catch {
        // Fallback
      }
    }
  }

  async getLogsForUser(user: UserProfile): Promise<AuditLogEntry[]> {
    AuthorizationService.assertPermission(user, 'audit:read');
    return this.getAuditData();
  }

  async recordSimulatedAction(
    user: UserProfile,
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'isSimulated' | 'actorName' | 'actorRole'>
  ): Promise<AuditLogEntry> {
    // Assert authorization: Only IT Operations (action:authorize_simulated) or SOC Analyst (action:propose)
    const canAuthorize = AuthorizationService.canAuthorizeSimulatedActions(user.role);
    const canPropose = AuthorizationService.canProposeActions(user.role);

    if (!canAuthorize && !canPropose) {
      throw new AccessDeniedError(
        `Access Denied: Role "${user.role}" is not authorized to execute or propose response actions.`,
        'action:authorize_simulated',
        user.role
      );
    }

    const logs = this.getAuditData();
    const newLog: AuditLogEntry = {
      ...entry,
      id: `AUD-SIM-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      actorName: user.name,
      actorRole: user.role,
      isSimulated: true,
      status: canAuthorize ? 'SIMULATED_SUCCESS' : 'PROPOSED',
    };
    logs.unshift(newLog);
    this.saveAuditData(logs);
    return newLog;
  }

  async getIncidentTasksForUser(user: UserProfile): Promise<IncidentTask[]> {
    if (user.role === 'super_admin') {
      return []; // Platform Administrator cannot inspect private operational incident tasks
    }
    AuthorizationService.assertPermission(user, 'incident:read');
    const tasks = this.getTasksData();
    if (user.role === 'it_operations') {
      // IT Operations sees operational remediation tasks assigned to it_operations (Option A hardening)
      return tasks.filter((t) => t.assignedRole === 'it_operations');
    }
    if (user.role === 'security_engineer') {
      // Security Engineers see detection engineering tasks
      return tasks.filter((t) => t.assignedRole === 'security_engineer');
    }
    return tasks;
  }

  async updateTaskStatus(
    user: UserProfile,
    taskId: string,
    status: IncidentTask['status'],
    notes?: string
  ): Promise<IncidentTask> {
    AuthorizationService.assertPermission(user, 'incident:update');

    const tasks = this.getTasksData();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error(`Task ${taskId} not found`);

    const updated: IncidentTask = {
      ...tasks[idx],
      status,
      completedAt: status === 'completed' ? new Date().toISOString() : tasks[idx].completedAt,
      completedBy: status === 'completed' ? `${user.name} (${user.callsign})` : tasks[idx].completedBy,
      completionNotes: notes || tasks[idx].completionNotes,
    };
    tasks[idx] = updated;
    this.saveTasksData(tasks);
    return updated;
  }

  private static taskCounter = 0;

  private generateUniqueTaskId(existingTasks: IncidentTask[]): string {
    const existingIds = new Set(existingTasks.map((t) => t.id));

    // Determine highest sequential number among existing TSK-2026-(digits) tasks
    let maxSeq = 3; // Seed tasks occupy 001, 002, 003
    for (const t of existingTasks) {
      const match = t.id.match(/^TSK-2026-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxSeq) {
          maxSeq = val;
        }
      }
    }

    let next = Math.max(maxSeq + 1, ++LocalAuditLogRepository.taskCounter);
    let candidate = `TSK-2026-${String(next).padStart(3, '0')}`;
    while (existingIds.has(candidate)) {
      next++;
      candidate = `TSK-2026-${String(next).padStart(3, '0')}`;
    }
    LocalAuditLogRepository.taskCounter = next;
    return candidate;
  }

  async createTask(user: UserProfile, task: Omit<IncidentTask, 'id' | 'createdAt'>): Promise<IncidentTask> {
    // Both SOC Analysts (escalation) and IT Operations can create tasks
    const tasks = this.getTasksData();
    const newTask: IncidentTask = {
      ...task,
      id: this.generateUniqueTaskId(tasks),
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    this.saveTasksData(tasks);
    return newTask;
  }
}

