import React, { useState } from 'react';
import { IncidentTask } from '../../types/audit';
import { Button } from '../common/Button';
import {
  CheckCircle2,
  X,
  ShieldCheck,
  AlertTriangle,
  Server,
  FileText,
  Terminal,
  Info,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';

export interface VerificationChecklistItem {
  id: string;
  label: string;
  description: string;
  required?: boolean;
}

export const DEFAULT_VERIFICATION_CHECKLIST: VerificationChecklistItem[] = [
  {
    id: 'target_state',
    label: 'Asset Target State & Identity Confirmed',
    description: 'Verified target asset hostname/IP and confirmed operational state prior to closing.',
  },
  {
    id: 'fix_applied',
    label: 'Remediation Procedure Executed & Tested',
    description: 'Applied technical fix (e.g. credential revocation, network rule, backup verification, or host recovery).',
  },
  {
    id: 'telemetry_clean',
    label: 'Absence of Malicious Telemetry Re-infection',
    description: 'Confirmed zero anomalous secondary execution spikes or alerts on the target asset.',
  },
  {
    id: 'operational_restoral',
    label: 'Authorized Operational Service Restoral',
    description: 'Target asset conforms to production baseline and service readiness has been validated.',
  },
];

export interface RemediationVerificationData {
  completionNotes: string;
  checklist: Array<{ id: string; label: string; verified: boolean }>;
  evidenceReference?: string;
  attestationConfirmed: boolean;
  serializedNotes: string;
}

interface RemediationVerificationModalProps {
  task: IncidentTask;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (taskId: string, verificationData: RemediationVerificationData) => Promise<void>;
  isSubmitting?: boolean;
}

export const RemediationVerificationModal: React.FC<RemediationVerificationModalProps> = ({
  task,
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
}) => {
  const [notes, setNotes] = useState('');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    target_state: true,
    fix_applied: true,
    telemetry_clean: true,
    operational_restoral: true,
  });
  const [evidenceReference, setEvidenceReference] = useState('');
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleChecklistItem = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation rules
    const trimmedNotes = notes.trim();
    if (trimmedNotes.length < 10) {
      setValidationError('Completion notes must be at least 10 characters describing the technical remediation performed.');
      return;
    }

    const verifiedCount = Object.values(checkedItems).filter(Boolean).length;
    if (verifiedCount === 0) {
      setValidationError('You must record at least one verified remediation checklist step.');
      return;
    }

    if (!attestationConfirmed) {
      setValidationError('You must confirm the technical verification attestation before completing this task.');
      return;
    }

    // Build serialized notes to store in existing public.incident_tasks.completion_notes column
    const verifiedLabels = DEFAULT_VERIFICATION_CHECKLIST.filter((item) => checkedItems[item.id]).map(
      (item) => `[X] ${item.label}`
    );

    const serializedSections = [
      `Work Performed:\n${trimmedNotes}`,
      `\n--- VERIFIED REMEDIATION CHECKLIST (${verifiedCount}/${DEFAULT_VERIFICATION_CHECKLIST.length}) ---\n${verifiedLabels.join('\n')}`,
    ];

    if (evidenceReference.trim()) {
      serializedSections.push(`\n--- TECHNICAL EVIDENCE & REFERENCE ---\n${evidenceReference.trim()}`);
    }

    serializedSections.push(`\n--- ATTESTATION ---\nOperator certified independent technical verification on target asset "${task.targetAsset}" at ${new Date().toISOString()}`);

    const serializedNotes = serializedSections.join('\n');

    const checklistData = DEFAULT_VERIFICATION_CHECKLIST.map((item) => ({
      id: item.id,
      label: item.label,
      verified: Boolean(checkedItems[item.id]),
    }));

    try {
      await onConfirm(task.id, {
        completionNotes: trimmedNotes,
        checklist: checklistData,
        evidenceReference: evidenceReference.trim() || undefined,
        attestationConfirmed,
        serializedNotes,
      });
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to complete remediation verification.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="verification-modal-title" className="text-sm font-bold flex items-center gap-2">
                Remediation Verification & Task Completion
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                  {task.id}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Target Asset: <strong className="font-mono text-slate-800 dark:text-slate-200">{task.targetAsset}</strong>
                {task.associatedAlertId && (
                  <span className="ml-2 text-blue-600 dark:text-cyan-400">
                    • Linked Alert: {task.associatedAlertId}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1 rounded focus:outline-none"
            aria-label="Close verification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Task Summary Banner */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-lg space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
              TASK DESCRIPTION
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300">{task.description}</p>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Verification Incomplete</p>
                <p className="text-[11px] mt-0.5">{validationError}</p>
              </div>
            </div>
          )}

          {/* Section 1: Verification Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-xs uppercase font-mono tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                Technical Verification Checklist
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {Object.values(checkedItems).filter(Boolean).length} of {DEFAULT_VERIFICATION_CHECKLIST.length} attested
              </span>
            </div>

            <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5">
              {DEFAULT_VERIFICATION_CHECKLIST.map((item) => {
                const isChecked = Boolean(checkedItems[item.id]);

                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition select-none ${
                      isChecked
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleChecklistItem(item.id)}
                      disabled={isSubmitting}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 dark:text-slate-200 text-xs">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 2: Completion Notes (Required) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="completion-notes" className="font-bold text-xs uppercase font-mono tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-500" />
                Work Performed & Remediation Notes <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                Min 10 characters ({notes.trim().length} entered)
              </span>
            </div>
            <textarea
              id="completion-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              placeholder="Detail specific remediation work performed (e.g., credentials revoked on domain controller, host quarantine verified, backup snapshot hashes compared)..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:outline-none"
              required
            />
          </div>

          {/* Section 3: Technical Evidence Reference (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="evidence-reference" className="font-bold text-xs uppercase font-mono tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-500" />
              Evidence Reference / Command Output <span className="text-slate-400 text-[10px] lowercase font-normal">(optional)</span>
            </label>
            <input
              id="evidence-reference"
              type="text"
              value={evidenceReference}
              onChange={(e) => setEvidenceReference(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Script verification hash, firewall rule ID, or shell command output..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:outline-none font-mono"
            />
          </div>

          {/* Section 4: Mandatory Operator Attestation */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={attestationConfirmed}
                onChange={(e) => setAttestationConfirmed(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                <span className="font-bold">Operator Verification Attestation: </span>
                I confirm that this technical remediation was independently executed and verified on{' '}
                <strong className="font-mono">{task.targetAsset}</strong> in accordance with CyberOps SOC incident response procedures.
              </div>
            </label>
          </div>

          {/* Section 5: Persistence & Schema Disclosure Callout */}
          <div className="p-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Persistence Disclosure: </strong>
              Verification checklist items, evidence references, and operator notes are serialized directly into the existing{' '}
              <code className="text-cyan-600 dark:text-cyan-400 font-mono">completion_notes</code> column of{' '}
              <code className="text-slate-600 dark:text-slate-400 font-mono">public.incident_tasks</code>. No unapproved database columns are created.
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Recording Verification...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Confirm & Complete Task
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
