import React, { useMemo } from 'react';
import {
  Server,
  Lock,
  Users,
  Database,
  Cpu,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '../../types/auth';
import {
  PlatformDiagnosticsService,
  DiagnosticStatus,
} from '../../services/platformDiagnosticsService';

interface PlatformAdminDashboardProps {
  currentUser: UserProfile;
}

export const PlatformAdminDashboard: React.FC<PlatformAdminDashboardProps> = ({ currentUser: _currentUser }) => {
  // Execute read-only platform diagnostics on render (non-destructive)
  const report = useMemo(() => PlatformDiagnosticsService.runDiagnostics(), []);

  const renderStatusBadge = (status: DiagnosticStatus) => {
    switch (status) {
      case 'Pass':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Pass
          </span>
        );
      case 'Fail':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800">
            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            Fail
          </span>
        );
      case 'Not checked':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <HelpCircle className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            Not checked
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-heading flex items-center gap-2">
            <Server className="w-6 h-6 text-blue-600" />
            Platform Administration & Governance
          </h1>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            DOMAIN C &bull; SUPER ADMIN
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          System health oversight, tenant isolation enforcement, and platform configuration.
        </p>
      </div>

      {/* Mandatory Security Boundary Banner */}
      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 space-y-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-900 dark:text-purple-300">
          <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>STRICT DOMAIN SEPARATION POLICY (CLIENT PROTOTYPE)</span>
        </div>
        <p className="text-xs text-purple-800 dark:text-purple-300/90 leading-relaxed font-sans">
          In strict accordance with the platform authorization matrix, <strong>Platform Administrators (Super Admin) do NOT inherit read or write access to private SOC alert queues, analyst notes, or operational incident investigations</strong>. Operational records remain strictly isolated to authorized security analysts and incident responders.
        </p>
      </div>

      {/* Summary Metrics Row: Diagnostic Results */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric A: Build Environment */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
              BUILD ENVIRONMENT
            </span>
            {renderStatusBadge(report.buildEnvironment.status)}
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
            {report.buildEnvironment.value}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Vite build target (not production infrastructure)
          </div>
        </div>

        {/* Metric B: Demo Personas (derived from DEMO_PERSONAS) */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              DEMO PERSONAS
            </span>
            {renderStatusBadge(report.demoPersonas.status)}
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
            {report.demoPersonas.value}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Derived from Demo Persona Registry
          </div>
        </div>

        {/* Metric C: Browser-Storage Availability */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-emerald-400" />
              BROWSER STORAGE
            </span>
            {renderStatusBadge(report.browserStorage.status)}
          </div>
          <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
            {report.browserStorage.value}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Local browser storage; not a production database
          </div>
        </div>
      </div>

      {/* Diagnostics Panel: Read-Only Check Details */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
              Platform Diagnostics (Local Prototype)
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
            READ-ONLY EVALUATION
          </span>
        </div>

        {/* Local Prototype Diagnostics Disclaimer Note */}
        <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex items-start gap-2.5 text-[11px] text-blue-900 dark:text-blue-300">
          <Info className="w-4 h-4 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Prototype Architecture Notice:</strong> These diagnostics evaluate client runtime and local browser capabilities for the Phase 1 prototype only. They do not represent a production infrastructure, backend API availability, or server database health check.
          </p>
        </div>

        {/* Detailed Check Table */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          {report.allChecks.map((check) => (
            <div key={check.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {check.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    ({check.provenance})
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal font-sans">
                  {check.detail}
                </p>
              </div>

              <div className="flex items-center sm:flex-col sm:items-end gap-2 shrink-0">
                {renderStatusBadge(check.status)}
                <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
                  {check.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration & Policy Table (Preserved) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
            Platform Security & Isolation Controls
          </span>
          <span className="text-[10px] font-mono text-slate-500">CLIENT PROTOTYPE SAFEGUARDS</span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          <div className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Cross-Role Data Scoping Guard</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Enforces query boundaries so that IT Operations only sees task-linked alerts and Super Admin cannot read operational records.
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
              CLIENT-SIDE GUARD
            </span>
          </div>

          <div className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Deterministic Triage Engine Guard</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Ensures all threat scorings stem from explicit rule weights (DET-001 to DET-005) with zero generative model hallucinations.
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
              CLIENT-SIDE GUARD
            </span>
          </div>

          <div className="p-4 flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Simulation Containment Boundary</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Prevents outbound execution against live endpoints. All isolation commands remain non-destructive simulated records.
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
              SIMULATED SAFE (CLIENT)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
