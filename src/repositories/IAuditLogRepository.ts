/**
 * Audit Log Repository Interface
 * Defines role-aware, tamper-evident audit logging and remediation task management.
 */

import { AuditLogEntry, IncidentTask } from '../types/audit';
import { UserProfile } from '../types/auth';

export interface IAuditLogRepository {
  /**
   * Retrieves audit logs visible to the requesting user role.
   */
  getLogsForUser(user: UserProfile): Promise<AuditLogEntry[]>;

  /**
   * Records a simulated action. Asserts user authorization.
   */
  recordSimulatedAction(
    user: UserProfile,
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'isSimulated' | 'actorName' | 'actorRole'>
  ): Promise<AuditLogEntry>;

  /**
   * Retrieves incident tasks scoped to role.
   */
  getIncidentTasksForUser(user: UserProfile): Promise<IncidentTask[]>;

  /**
   * Updates task status. Asserts 'incident:update' permission.
   */
  updateTaskStatus(
    user: UserProfile,
    taskId: string,
    status: IncidentTask['status'],
    notes?: string
  ): Promise<IncidentTask>;

  /**
   * Creates a remediation task. Asserts authorization.
   */
  createTask(user: UserProfile, task: Omit<IncidentTask, 'id' | 'createdAt'>): Promise<IncidentTask>;
}
