import React, { useState } from 'react';
import { IncidentTask, ResponseActionType } from '../../types/audit';
import { UserRole } from '../../types/auth';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Button } from '../common/Button';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Play,
  ShieldAlert,
  Server,
  UserCheck,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface ITOperationsDashboardProps {
  tasks: IncidentTask[];
  onUpdateTaskStatus: (taskId: string, status: IncidentTask['status'], notes?: string) => Promise<void>;
  onTriggerSimulatedAction: (actionType: ResponseActionType, target: string) => void;
  onInspectAlert?: (alertId: string) => void;
  currentRole: UserRole;
}

export const ITOperationsDashboard: React.FC<ITOperationsDashboardProps> = ({
  tasks,
  onUpdateTaskStatus,
  onTriggerSimulatedAction,
  onInspectAlert,
  currentRole,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  const handleStatusChange = async (taskId: string, nextStatus: IncidentTask['status']) => {
    setIsUpdating(true);
    try {
      const notes = completionNotes[taskId];
      await onUpdateTaskStatus(taskId, nextStatus, notes);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-400" />
              IT Operations: Incident Response & Recovery Tasks
            </h1>
            <ProvenanceBadge type="synthetic_demo" label="SIMULATED TASKS" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational remediation queue for authorized containment, asset recovery, and credential resets.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">TOTAL TASKS</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">{tasks.length}</span>
          <span className="text-[10px] text-slate-500">Remediation actions</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-950/80 rounded-lg shadow-xs">
          <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block">PENDING ACTIONS</span>
          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block">
            {tasks.filter((t) => t.status === 'pending').length}
          </span>
          <span className="text-[10px] text-amber-700/70 dark:text-amber-300/70">Awaiting operator execution</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-950/80 rounded-lg shadow-xs">
          <span className="text-[10px] font-mono uppercase text-sky-600 dark:text-sky-400 block">IN PROGRESS</span>
          <span className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1 block">
            {tasks.filter((t) => t.status === 'in_progress').length}
          </span>
          <span className="text-[10px] text-sky-700/70 dark:text-sky-300/70">Under remediation</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/80 rounded-lg shadow-xs">
          <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block">RECOVERED & CLOSED</span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            {tasks.filter((t) => t.status === 'completed').length}
          </span>
          <span className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">Verified recovered</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">FILTER BY STATUS:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none"
          >
            <option value="all">All ({tasks.length})</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center text-slate-500 text-xs italic shadow-xs">
            No incident response tasks found for the selected filter.
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                    {task.id}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      task.priority === 'critical'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    Priority: {task.priority}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      task.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                        : task.status === 'in_progress'
                        ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}
                  >
                    Status: {task.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {task.associatedAlertId && (
                    <span className="text-blue-600 dark:text-cyan-400">
                      Linked: <strong className="font-mono">{task.associatedAlertId}</strong>
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    Target: <strong className="text-slate-800 dark:text-slate-200">{task.targetAsset}</strong>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{task.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{task.description}</p>
              </div>

              {/* Task Controls & Action Execution */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  {task.suggestedActionType && (
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/60"
                      onClick={() => onTriggerSimulatedAction(task.suggestedActionType!, task.targetAsset)}
                    >
                      <ShieldAlert className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      Execute Simulated Action
                    </Button>
                  )}

                  {task.associatedAlertId && onInspectAlert && (
                    <Button
                      size="xs"
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/60 font-mono"
                      onClick={() => onInspectAlert(task.associatedAlertId!)}
                      title={`Inspect associated security alert ${task.associatedAlertId}`}
                    >
                      <ExternalLink className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      Inspect Associated Alert
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {task.status === 'pending' && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleStatusChange(task.id, 'in_progress')}
                      disabled={isUpdating}
                    >
                      <Play className="w-3 h-3" />
                      Begin Remediation
                    </Button>
                  )}

                  {task.status === 'in_progress' && (
                    <Button
                      size="xs"
                      variant="primary"
                      onClick={() => handleStatusChange(task.id, 'completed')}
                      disabled={isUpdating}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Mark Completed & Verified
                    </Button>
                  )}

                  {task.status === 'completed' && (
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Remediation Verified by {task.completedBy || 'IT Ops'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
