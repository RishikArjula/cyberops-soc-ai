import React, { useState } from 'react';
import { Database, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const StorageNoticeBanner: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-amber-50/90 dark:bg-slate-900/90 border-b border-amber-200 dark:border-amber-900/40 px-4 py-1.5 text-xs text-amber-900 dark:text-slate-300 transition-colors">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800/60">
            <Database className="w-3 h-3 text-amber-700 dark:text-amber-400" />
            PHASE 1 STORAGE ADAPTER: LOCAL BROWSER SCOPE
          </span>
          <span className="hidden md:inline text-amber-800/80 dark:text-slate-400 text-[11px]">
            Decoupled via typed repository interfaces. Not connected to a multi-user backend database.
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-amber-800 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 font-mono text-[11px] underline cursor-pointer"
        >
          {expanded ? 'Hide Details' : 'View Architectural Limitations'}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-2 pt-2 border-t border-amber-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-400 space-y-1 max-w-7xl mx-auto bg-white dark:bg-slate-950/60 p-3 rounded border border-amber-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            Documented Architectural Limitations for Phase 1 Prototype:
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
            <li><strong>Single-Device Isolation:</strong> Data modified in this session is persisted solely to browser localStorage (~5MB quota) and is not shared across multi-analyst teams.</li>
            <li><strong>Zero Sensitive Secrets:</strong> No credentials, private tokens, or production telemetry are permitted in browser storage.</li>
            <li><strong>Modular Interface Boundary:</strong> All operations utilize <code className="text-blue-700 dark:text-cyan-300">IAlertRepository</code>, <code className="text-blue-700 dark:text-cyan-300">IMITRERepository</code>, and <code className="text-blue-700 dark:text-cyan-300">IAuditLogRepository</code> contracts, allowing full backend swap (PostgreSQL / Cloud SQL) without frontend refactoring.</li>
            <li><strong>Response Action Execution:</strong> All quarantine, account locks, and IP blocks are simulated with verifiable audit logging. No commands are dispatched to live production hosts.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
