import React, { useState } from 'react';
import { AuditLogEntry, ResponseActionType } from '../../types/audit';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { FileText, ShieldCheck, Search, Filter } from 'lucide-react';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'all' && log.actionType !== selectedAction) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.id.toLowerCase().includes(q) ||
        log.targetResource.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.justification.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Containment Action Audit Trail
            </h1>
            <ProvenanceBadge type="synthetic_demo" label="SIMULATED AUDIT" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamper-evident record of all simulated containment, isolation, and remediation procedures.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row gap-2 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, target resource, operator name, or justification..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none"
          />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none"
          aria-label="Filter audit logs by action"
        >
          <option value="all">All Actions</option>
          <option value="isolate_host">Endpoint Isolation</option>
          <option value="block_ip">IP Egress Block</option>
          <option value="lock_account">Account Lockout</option>
          <option value="collect_forensics">Forensics Package</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                <th className="py-2.5 px-3">Audit ID</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Target Resource</th>
                <th className="py-2.5 px-3">Operator & Role</th>
                <th className="py-2.5 px-3">Mandatory Justification</th>
                <th className="py-2.5 px-3 text-right">Execution Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-sans">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 italic text-xs">
                    No simulated action audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-200">{log.id}</td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toUTCString().slice(5, 25)}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] uppercase font-bold">
                        {log.actionType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-blue-600 dark:text-cyan-300 font-semibold">{log.targetResource}</td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900 dark:text-slate-200">{log.actorName}</div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase">{log.actorRole}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-xs">{log.justification}</td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        SIMULATED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
