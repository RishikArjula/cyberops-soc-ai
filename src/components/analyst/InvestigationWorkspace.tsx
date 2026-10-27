import React, { useState, useMemo } from 'react';
import { SecurityAlert, AlertStatus } from '../../types/alert';
import { MitreTechnique, MitreMitigation } from '../../types/mitre';
import { ResponseActionType } from '../../types/audit';
import { UserRole } from '../../types/auth';
import { DeterministicTriageRecommendation } from '../../types/triage';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Button } from '../common/Button';
import {
  Search,
  AlertOctagon,
  Terminal,
  Shield,
  Layers,
  FileText,
  Clock,
  Send,
  Lock,
  Server,
  Play,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  History,
  BookOpen,
} from 'lucide-react';

interface InvestigationWorkspaceProps {
  alerts: SecurityAlert[];
  selectedAlertId?: string;
  onSelectAlert: (alert: SecurityAlert) => void;
  onUpdateStatus: (alertId: string, status: AlertStatus) => Promise<void>;
  onAddNote: (alertId: string, note: string) => Promise<void>;
  techniques: MitreTechnique[];
  mitigations: MitreMitigation[];
  triageEvaluator: (alert: SecurityAlert) => DeterministicTriageRecommendation;
  currentRole: UserRole;
  onInitiateSimulatedAction: (actionType: ResponseActionType, target: string, alertId?: string) => void;
  onNavigateToAlertQueue: () => void;
  onNavigateToAuditTrail?: (alertId?: string) => void;
  onNavigateToPlaybooks?: (alertId?: string) => void;
}

export const InvestigationWorkspace: React.FC<InvestigationWorkspaceProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onUpdateStatus,
  onAddNote,
  techniques,
  mitigations,
  triageEvaluator,
  currentRole,
  onInitiateSimulatedAction,
  onNavigateToAlertQueue,
  onNavigateToAuditTrail,
  onNavigateToPlaybooks,
}) => {
  const [activeAlertId, setActiveAlertId] = useState<string>(
    selectedAlertId || (alerts.length > 0 ? alerts[0].id : '')
  );
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Active alert object
  const currentAlert = useMemo(() => {
    return alerts.find((a) => a.id === activeAlertId) || alerts[0] || null;
  }, [alerts, activeAlertId]);

  // Synchronize internal active alert state whenever external selectedAlertId updates
  React.useEffect(() => {
    if (selectedAlertId && alerts.some((a) => a.id === selectedAlertId)) {
      setActiveAlertId(selectedAlertId);
    }
  }, [selectedAlertId, alerts]);

  // Derived MITRE Technique
  const currentTechnique = useMemo(() => {
    if (!currentAlert?.mitreTechniqueId) return null;
    return techniques.find((t) => t.id === currentAlert.mitreTechniqueId) || null;
  }, [currentAlert, techniques]);

  // Derived MITRE Mitigations
  const currentMitigations = useMemo(() => {
    if (!currentTechnique) return [];
    return mitigations.filter((m) => currentTechnique.mitigationIds.includes(m.id));
  }, [currentTechnique, mitigations]);

  // Derived Deterministic Recommendation
  const triageRecommendation = useMemo(() => {
    if (!currentAlert) return null;
    return triageEvaluator(currentAlert);
  }, [currentAlert, triageEvaluator]);

  const handleAlertChange = (id: string) => {
    setActiveAlertId(id);
    const target = alerts.find((a) => a.id === id);
    if (target) {
      onSelectAlert(target);
    }
  };

  const handleStatusChange = async (newStatus: AlertStatus) => {
    if (!currentAlert || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(currentAlert.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAlert || !newNote.trim() || isSubmittingNote) return;
    setIsSubmittingNote(true);
    try {
      await onAddNote(currentAlert.id, newNote.trim());
      setNewNote('');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (!currentAlert) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center space-y-4">
        <AlertOctagon className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-lg font-semibold text-slate-200">No Investigation Selected</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The alert queue contains no items or you do not have permission to view operational alert evidence.
        </p>
        <Button variant="primary" size="sm" onClick={onNavigateToAlertQueue}>
          Return to Alert Queue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToAlertQueue}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Alert Queue
          </Button>
          <div className="h-4 w-px bg-slate-800" />
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-sky-400" />
            Investigation Workspace: <span className="font-mono text-sky-300">{currentAlert.id}</span>
          </h1>
        </div>

        {/* Action Controls & Alert Selector Dropdown */}
        <div className="flex items-center gap-2">
          {onNavigateToPlaybooks && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigateToPlaybooks(currentAlert.id)}
              className="text-xs text-emerald-300 border border-emerald-800/60 hover:bg-emerald-950/40 flex items-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              Response Playbooks
            </Button>
          )}
          <label htmlFor="alert-select" className="text-xs text-slate-400 whitespace-nowrap">
            Switch Incident:
          </label>
          <select
            id="alert-select"
            value={currentAlert.id}
            onChange={(e) => handleAlertChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-mono"
          >
            {alerts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id} — [{a.severity.toUpperCase()}] {a.title.slice(0, 40)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ProvenanceBadge
          type="synthetic_demo"
          label="SYNTHETIC TELEMETRY EVIDENCE"
        />
        <span className="text-xs text-slate-400">
          Evidence parameters, process trees, and hash artifacts are synthetic demonstration fixtures. All triage notes appended here are stored locally in accordance with Phase 1 protocols.
        </span>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Evidence, MITRE, and Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Overview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-slate-400">{currentAlert.id}</span>
                <h2 className="text-base font-bold text-slate-100">{currentAlert.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-xs font-semibold uppercase rounded ${
                    currentAlert.severity === 'critical'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : currentAlert.severity === 'high'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                  }`}
                >
                  {currentAlert.severity}
                </span>
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {currentAlert.status}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded border border-slate-800/80">
              {currentAlert.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Host Name</span>
                <span className="font-mono text-slate-200 font-semibold">{currentAlert.hostName}</span>
              </div>
              <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Source IP</span>
                <span className="font-mono text-slate-200 font-semibold">{currentAlert.sourceIp}</span>
              </div>
              <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Destination IP</span>
                <span className="font-mono text-slate-200 font-semibold">
                  {currentAlert.destinationIp || 'Local / None'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950/40 rounded border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Detected At</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {new Date(currentAlert.detectedAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Forensic Process & Command Line Evidence */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Forensic Process & Command-Line Evidence
            </h3>

            <div className="space-y-3 text-xs">
              {currentAlert.evidence.processName && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Process Name:</span>
                  <div className="font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-emerald-300 break-all select-all">
                    {currentAlert.evidence.processName}
                  </div>
                </div>
              )}

              {currentAlert.evidence.processCommandLine && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Full Execution Command Line:</span>
                  <div className="font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-amber-300 break-all select-all">
                    {currentAlert.evidence.processCommandLine}
                  </div>
                </div>
              )}

              {currentAlert.evidence.parentProcess && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Parent Process Lineage:</span>
                  <div className="font-mono bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 break-all">
                    {currentAlert.evidence.parentProcess}
                  </div>
                </div>
              )}

              {currentAlert.evidence.rawEventLog && (
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Raw Event Log (SIEM Telemetry):</span>
                  <pre className="font-mono text-[11px] bg-slate-950 p-3 rounded border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                    {currentAlert.evidence.rawEventLog}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* MITRE ATT&CK Mapping & Mitigations */}
          {currentTechnique && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400" />
                  MITRE ATT&CK Correlation
                </h3>
                <span className="font-mono text-xs text-blue-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                  {currentTechnique.id}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-100">{currentTechnique.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{currentTechnique.description}</p>
              </div>

              {currentMitigations.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-medium text-slate-300 block">
                    Recommended Defensive Mitigations ({currentMitigations.length}):
                  </span>
                  <div className="space-y-2">
                    {currentMitigations.map((mit) => (
                      <div key={mit.id} className="p-2.5 bg-slate-950/60 rounded border border-slate-800 text-xs">
                        <div className="flex items-center justify-between text-slate-200 font-semibold mb-1">
                          <span>{mit.name}</span>
                          <span className="font-mono text-[11px] text-blue-400">{mit.id}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">{mit.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chronological Analyst Notes */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Chronological Analyst Investigation Notes ({currentAlert.analystNotes.length})
            </h3>

            {currentAlert.analystNotes.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">
                No notes attached yet. Record forensic findings below.
              </div>
            ) : (
              <div className="space-y-2.5">
                {currentAlert.analystNotes.map((noteText, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        Analyst Observation #{idx + 1}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap">{noteText}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Note Append Form */}
            {currentRole === 'soc_analyst' ? (
              <form onSubmit={handleAddNoteSubmit} className="pt-3 border-t border-slate-800 space-y-2">
                <label htmlFor="analyst-note-input" className="text-xs font-medium text-slate-300 block">
                  Add Forensic Note / Triage Finding:
                </label>
                <textarea
                  id="analyst-note-input"
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record evidence observation, hypothesis, or containment rationale..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!newNote.trim() || isSubmittingNote}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmittingNote ? 'Saving Note...' : 'Append Note'}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-950/40 rounded border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Only Tier 1/2 SOC Analysts have permission to append investigation notes.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Triage Recommendation, Status Transitions, Containment Actions */}
        <div className="space-y-6">
          {/* Deterministic Triage Recommendation */}
          {triageRecommendation && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Deterministic Triage
                </h3>
                <span className="font-mono text-xs font-bold text-slate-300">
                  Confidence: {triageRecommendation.confidenceScore}%
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-mono font-bold text-amber-300 uppercase">
                    {triageRecommendation.recommendationCategory}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {triageRecommendation.summaryRationale}
                </p>
              </div>

              {triageRecommendation.matchedRules.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-medium text-slate-400 block">Matched Rules:</span>
                  {triageRecommendation.matchedRules.map((rule) => (
                    <div key={rule.ruleId} className="p-2 bg-slate-950/50 rounded border border-slate-800 text-[11px]">
                      <div className="font-mono font-bold text-indigo-400">{rule.ruleId}</div>
                      <div className="text-slate-300 font-medium">{rule.ruleName}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{rule.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Incident Status Transitions */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Triage Lifecycle Transition
            </h3>
            <p className="text-[11px] text-slate-400">
              Update status to reflect current operational workflow state:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {(['new', 'in_triage', 'escalated', 'resolved', 'false_positive'] as AlertStatus[]).map((status) => (
                <Button
                  key={status}
                  variant={currentAlert.status === status ? 'primary' : 'outline'}
                  size="sm"
                  disabled={isUpdatingStatus || currentRole !== 'soc_analyst'}
                  onClick={() => handleStatusChange(status)}
                  className="text-xs capitalize justify-center"
                >
                  {status.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>

          {/* Containment Simulation Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Play className="w-4 h-4 text-rose-400" />
              Simulated Response Actions
            </h3>
            <p className="text-[11px] text-slate-400">
              Execute approved containment simulations with mandatory operator rationale:
            </p>

            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInitiateSimulatedAction('isolate_host', currentAlert.hostName, currentAlert.id)}
                className="w-full text-xs justify-start text-rose-300 border-rose-900/50 hover:bg-rose-950/40"
              >
                Isolate Host: {currentAlert.hostName}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInitiateSimulatedAction('block_ip', currentAlert.sourceIp, currentAlert.id)}
                className="w-full text-xs justify-start text-amber-300 border-amber-900/50 hover:bg-amber-950/40"
              >
                Block Source IP: {currentAlert.sourceIp}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInitiateSimulatedAction('lock_account', 'Target User', currentAlert.id)}
                className="w-full text-xs justify-start text-yellow-300 border-yellow-900/50 hover:bg-yellow-950/40"
              >
                Lock Affected User Account
              </Button>
            </div>
          </div>

          {/* Response Playbooks Deep-Link */}
          {onNavigateToPlaybooks && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                Response Playbooks
              </h3>
              <p className="text-[11px] text-slate-400">
                Execute standardized containment SOPs and mitigation workflows pre-linked to incident {currentAlert.id}.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateToPlaybooks(currentAlert.id)}
                className="w-full text-xs justify-center flex items-center gap-1.5 text-emerald-300 border border-emerald-900/60 hover:bg-emerald-950/40"
              >
                Launch Playbook for {currentAlert.id}
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {/* Audit Trail Deep-Link */}
          {onNavigateToAuditTrail && (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-purple-400" />
                Associated Audit Records
              </h3>
              <p className="text-[11px] text-slate-400">
                View tamper-evident action logs specifically associated with {currentAlert.id}.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onNavigateToAuditTrail(currentAlert.id)}
                className="w-full text-xs justify-center flex items-center gap-1.5"
              >
                View Audit Records for {currentAlert.id}
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
