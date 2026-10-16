import React, { useState } from 'react';
import { SecurityAlert, AlertStatus } from '../../types/alert';
import { UserRole } from '../../types/auth';
import { ResponseActionType } from '../../types/audit';
import { MitreTechnique, MitreMitigation } from '../../types/mitre';
import { NetworkFlowRecord } from '../../types/networkFlow';
import { DeterministicTriageRecommendation } from '../../types/triage';
import { SeverityIndicator } from '../common/SeverityIndicator';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Button } from '../common/Button';
import { DESIGN_TOKENS } from '../../constants/designTokens';
import {
  X,
  Cpu,
  Terminal,
  Layers,
  Activity,
  FileEdit,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Lock,
  WifiOff,
  Database,
  ArrowRight,
} from 'lucide-react';

interface AlertDetailDrawerProps {
  alert: SecurityAlert;
  onClose: () => void;
  onUpdateStatus: (alertId: string, status: AlertStatus) => Promise<void>;
  onAddNote: (alertId: string, note: string) => Promise<void>;
  mitreTechnique: MitreTechnique | null;
  mitigations: MitreMitigation[];
  networkFlow: NetworkFlowRecord | null;
  triageRecommendation: DeterministicTriageRecommendation;
  currentRole: UserRole;
  onInitiateSimulatedAction: (actionType: ResponseActionType, target: string) => void;
}

export const AlertDetailDrawer: React.FC<AlertDetailDrawerProps> = ({
  alert,
  onClose,
  onUpdateStatus,
  onAddNote,
  mitreTechnique,
  mitigations,
  networkFlow,
  triageRecommendation,
  currentRole,
  onInitiateSimulatedAction,
}) => {
  const [activeTab, setActiveTab] = useState<'triage' | 'evidence' | 'mitre' | 'network' | 'notes'>('triage');
  const [newNote, setNewNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: AlertStatus) => {
    setIsUpdating(true);
    setStatusMessage(null);
    try {
      await onUpdateStatus(alert.id, newStatus);
      setStatusMessage(`Status updated to "${newStatus.replace('_', ' ').toUpperCase()}"`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: any) {
      setStatusMessage(`Failed: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsUpdating(true);
    try {
      await onAddNote(alert.id, newNote.trim());
      setNewNote('');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Drawer Top Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-blue-200 dark:border-cyan-800">
              {alert.id}
            </span>
            <SeverityIndicator severity={alert.severity} />
            <ProvenanceBadge type="synthetic_demo" label="DEMO ALERT" />
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {new Date(alert.detectedAt).toUTCString()}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{alert.title}</h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Host: <strong className="text-slate-800 dark:text-slate-200 font-mono">{alert.hostName}</strong></span>
            <span>Source IP: <strong className="text-slate-800 dark:text-slate-200 font-mono">{alert.sourceIp}</strong></span>
            {alert.userName && <span>User: <strong className="text-slate-800 dark:text-slate-200 font-mono">{alert.userName}</strong></span>}
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close investigation drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/40 px-4 gap-1 text-xs font-mono overflow-x-auto">
        <button
          onClick={() => setActiveTab('triage')}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'triage'
              ? 'border-blue-600 dark:border-cyan-400 text-blue-700 dark:text-cyan-300 bg-white dark:bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
          Deterministic Triage
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'evidence'
              ? 'border-blue-600 dark:border-cyan-400 text-blue-700 dark:text-cyan-300 bg-white dark:bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          Raw Evidence & Logs
        </button>
        <button
          onClick={() => setActiveTab('mitre')}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'mitre'
              ? 'border-blue-600 dark:border-cyan-400 text-blue-700 dark:text-cyan-300 bg-white dark:bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          MITRE ATT&CK ({alert.mitreTechniqueId || 'N/A'})
        </button>
        <button
          onClick={() => setActiveTab('network')}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'network'
              ? 'border-blue-600 dark:border-cyan-400 text-blue-700 dark:text-cyan-300 bg-white dark:bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          Network Telemetry
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-medium transition cursor-pointer ${
            activeTab === 'notes'
              ? 'border-blue-600 dark:border-cyan-400 text-blue-700 dark:text-cyan-300 bg-white dark:bg-slate-800/40 font-semibold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileEdit className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          Notes & Triage ({alert.analystNotes.length})
        </button>
      </div>

      {/* Main Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {statusMessage && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {statusMessage}
          </div>
        )}

        {/* TAB 1: DETERMINISTIC TRIAGE */}
        {activeTab === 'triage' && (
          <div className="space-y-4">
            {/* Header banner explaining rule engine */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ProvenanceBadge type="deterministic_rule" label="PHASE 1 RULE-BASED TRIAGE" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Category: <span className="text-blue-700 dark:text-cyan-300">{triageRecommendation.recommendationCategory}</span>
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400" title="Pre-configured scenario baseline confidence">
                  Scenario Confidence: <strong className="text-slate-900 dark:text-slate-100">{triageRecommendation.confidenceScore}%</strong>
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {triageRecommendation.summaryRationale}
              </p>
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-1">
                <span>Triage severity is evaluated by deterministic rule weights (DET-RULE-001 to 005).</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono">Scenario Confidence = preset scenario baseline</span>
              </div>
            </div>

            {/* Severity evaluation comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block mb-1">INCOMING SEVERITY</span>
                <SeverityIndicator severity={alert.severity} />
              </div>
              <div className="p-3 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block mb-1">EVALUATED RECOMMENDATION</span>
                <SeverityIndicator severity={triageRecommendation.recommendedSeverity} />
              </div>
            </div>

            {/* Matched Rules Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                Deterministic Rule Evaluations ({triageRecommendation.matchedRules.length})
              </h4>
              {triageRecommendation.matchedRules.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                  No high-confidence threat rules triggered on this alert evidence.
                </p>
              ) : (
                <div className="space-y-2">
                  {triageRecommendation.matchedRules.map((r) => (
                    <div key={r.ruleId} className="p-3 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-blue-700 dark:text-cyan-300 font-semibold">{r.ruleId}: {r.ruleName}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                          Weight: +{r.weight}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px]">{r.description}</p>
                      <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                        Condition: <code className="text-slate-700 dark:text-slate-300">{r.matchedCondition}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Supporting Evidence Citations */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-slate-300">
                Extracted Evidence Strings
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 list-disc pl-5">
                {triageRecommendation.supportingEvidence.map((ev, idx) => (
                  <li key={idx} className="font-mono text-[11px] text-slate-700 dark:text-slate-300">{ev}</li>
                ))}
              </ul>
            </div>

            {/* Suggested Response Actions (Simulation Only) */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  Recommended Containment Procedures (Simulated)
                </h4>
                <span className="text-[10px] font-mono text-purple-700 dark:text-purple-400">REQUIRES HUMAN AUTHORIZATION</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                In Phase 1, clicking an action launches a confirmation dialog and records a simulated response to the audit ledger.
              </p>

              <div className="space-y-2">
                {triageRecommendation.suggestedResponseActions.map((act, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{act.label}</span>
                        <span className="text-[9px] font-mono uppercase px-1 py-0.2 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">
                          {act.urgency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{act.description}</p>
                      <div className="text-[10px] font-mono text-blue-600 dark:text-cyan-400">Target: {act.target}</div>
                    </div>

                    <Button
                      size="xs"
                      variant="outline"
                      className="shrink-0 text-blue-700 dark:text-cyan-300 hover:text-blue-900 dark:hover:text-cyan-200 border-blue-200 dark:border-cyan-800/80 hover:bg-blue-50 dark:hover:bg-cyan-950/60"
                      onClick={() => onInitiateSimulatedAction(act.actionType, act.target)}
                    >
                      Authorize Simulation
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RAW EVIDENCE & LOGS */}
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">LOG SOURCE</span>
                <span className="text-slate-800 dark:text-slate-200">{alert.evidence.logSource}</span>
              </div>
              {alert.evidence.processName && (
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">PROCESS NAME</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{alert.evidence.processName}</span>
                </div>
              )}
              {alert.evidence.parentProcess && (
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">PARENT PROCESS</span>
                  <span className="text-slate-700 dark:text-slate-300">{alert.evidence.parentProcess}</span>
                </div>
              )}
              {alert.evidence.processCommandLine && (
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">COMMAND LINE ARGUMENTS</span>
                  <pre className="mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-amber-700 dark:text-amber-300 text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                    {alert.evidence.processCommandLine}
                  </pre>
                </div>
              )}
              {alert.evidence.fileHashSha256 && (
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">SHA256 HASH</span>
                  <span className="text-slate-700 dark:text-slate-300 text-[11px] break-all">{alert.evidence.fileHashSha256}</span>
                </div>
              )}
              {alert.evidence.userAccount && (
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">USER / SERVICE PRINCIPAL</span>
                  <span className="text-blue-600 dark:text-cyan-300">{alert.evidence.userAccount}</span>
                </div>
              )}
              {alert.evidence.rawEventLog && (
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block">RAW SECURITY EVENT TELEMETRY</span>
                  <pre className="mt-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-700 dark:text-slate-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                    {alert.evidence.rawEventLog}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MITRE ATT&CK KNOWLEDGE */}
        {activeTab === 'mitre' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <ProvenanceBadge type="authentic_mitre" label="MITRE ATT&CK v14.1 ENTERPRISE" />
              {mitreTechnique?.sourceUrl && (
                <a
                  href={mitreTechnique.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Official Reference <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {mitreTechnique ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 dark:text-cyan-300 bg-blue-50 dark:bg-cyan-950 px-2 py-0.5 rounded border border-blue-200 dark:border-cyan-800">
                      {mitreTechnique.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{mitreTechnique.name}</h3>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{mitreTechnique.description}</p>
                  <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <span>Platforms: <strong className="text-slate-700 dark:text-slate-300">{mitreTechnique.platforms.join(', ')}</strong></span>
                  </div>
                </div>

                {/* Detection guidance */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                  <h4 className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                    Verified MITRE Detection Strategy
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{mitreTechnique.detectionGuidance}</p>
                </div>

                {/* Mitigations */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                  <h4 className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-slate-200">
                    Documented Defensive Mitigations ({mitigations.length})
                  </h4>
                  {mitigations.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No direct mitigation IDs mapped in sample baseline.</p>
                  ) : (
                    <div className="space-y-2">
                      {mitigations.map((m) => (
                        <div key={m.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-blue-700 dark:text-cyan-400 font-semibold">{m.id}: {m.name}</span>
                            <a
                              href={m.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-mono text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 flex items-center gap-1"
                            >
                              Docs <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">{m.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                No MITRE technique mapped for this alert record.
              </p>
            )}
          </div>
        )}

        {/* TAB 4: NETWORK FLOW (CIC-IDS2017) */}
        {activeTab === 'network' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <ProvenanceBadge type="cic_ids_sample" label="CIC-IDS2017 FLOW SCHEMA" />
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {networkFlow ? `Flow ID: ${networkFlow.flowId}` : 'No flow correlated'}
              </span>
            </div>

            {networkFlow ? (
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 font-mono text-xs space-y-3">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">SOURCE SOCKET</span>
                    <span className="text-blue-600 dark:text-cyan-400 font-bold">{networkFlow.sourceIp}:{networkFlow.sourcePort}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">DESTINATION SOCKET</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{networkFlow.destinationIp}:{networkFlow.destinationPort}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">PROTOCOL / DURATION</span>
                    <span className="text-slate-800 dark:text-slate-200">{networkFlow.protocol} ({networkFlow.flowDurationMs} ms)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase text-[10px] block">FLOW LABEL / CLASSIFICATION</span>
                    <span className={`font-bold ${networkFlow.label === 'BENIGN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {networkFlow.label}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-[10px]">
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
                    <span className="text-slate-500 block">TOTAL PACKETS</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{networkFlow.totalFwdPackets + networkFlow.totalBwdPackets}</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
                    <span className="text-slate-500 block">FLOW BYTES/SEC</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{networkFlow.flowBytesPerSec.toLocaleString()} B/s</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">
                    <span className="text-slate-500 block">TCP FLAGS (SYN/RST/ACK)</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">
                      {networkFlow.synFlagCount} / {networkFlow.rstFlagCount} / {networkFlow.ackFlagCount}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic p-4 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                No correlated CIC-IDS2017 network flow record linked to this alert.
              </p>
            )}
          </div>
        )}

        {/* TAB 5: ANALYST INVESTIGATION NOTES */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            {/* Status change bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-slate-300 block">
                  Update Triage Status
                </span>
                {currentRole !== 'soc_analyst' && (
                  <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
                    READ-ONLY (RESTRICTED TO SOC ANALYST)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['new', 'in_triage', 'escalated', 'resolved', 'false_positive'] as AlertStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    disabled={alert.status === st || isUpdating || currentRole !== 'soc_analyst'}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                      alert.status === st
                        ? 'bg-blue-100 text-blue-900 border-blue-400 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-700 font-bold'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {st.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Existing notes */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-slate-300 block">
                Analyst Findings Journal ({alert.analystNotes.length})
              </span>
              {alert.analystNotes.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 bg-slate-50 dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                  No analyst notes recorded yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {alert.analystNotes.map((note, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>ENTRY #{idx + 1}</span>
                        <span>CONFIDENTIAL RECORD</span>
                      </div>
                      <p className="leading-relaxed">{note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add note form */}
            {currentRole === 'soc_analyst' ? (
              <form onSubmit={handleNoteSubmit} className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200">Add New Analyst Note</label>
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Document your evidence review, hypothesis, or escalation recommendation..."
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none"
                />
                <div className="flex justify-end">
                  <Button size="sm" variant="primary" type="submit" isLoading={isUpdating} disabled={!newNote.trim()}>
                    Save Note
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-500 dark:text-slate-400 italic">
                Note submission is restricted to SOC Analysts with active triage authorization.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer Bottom Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
        <div>
          Current State: <strong className="text-slate-900 dark:text-slate-200 uppercase">{alert.status.replace('_', ' ')}</strong>
        </div>
        <Button size="xs" variant="ghost" onClick={onClose}>
          Close Drawer
        </Button>
      </div>
    </div>
  );
};
