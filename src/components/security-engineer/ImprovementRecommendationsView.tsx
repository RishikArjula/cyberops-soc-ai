import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FileCode2,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  ImprovementRecommendation,
  RecommendationPriority,
} from '../../services/securityAnalyticsService';
import { ProvenanceBadge } from '../common/ProvenanceBadge';

interface ImprovementRecommendationsViewProps {
  recommendations: ImprovementRecommendation[];
  onSelectTechniqueForDraft?: (techniqueId: string) => void;
  className?: string;
}

export const ImprovementRecommendationsView: React.FC<ImprovementRecommendationsViewProps> = ({
  recommendations,
  onSelectTechniqueForDraft,
  className = '',
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredRecommendations = recommendations.filter((rec) => {
    if (priorityFilter !== 'all' && rec.priority !== priorityFilter) return false;
    return true;
  });

  const criticalCount = recommendations.filter((r) => r.priority === 'critical').length;
  const highCount = recommendations.filter((r) => r.priority === 'high').length;
  const mediumCount = recommendations.filter((r) => r.priority === 'medium').length;

  const getPriorityBadge = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            CRITICAL PRIORITY
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            HIGH PRIORITY
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800">
            <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            MEDIUM PRIORITY
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            LOW PRIORITY
          </span>
        );
    }
  };

  const getCategoryLabel = (cat: ImprovementRecommendation['category']) => {
    switch (cat) {
      case 'uncovered_high_impact':
        return 'High-Impact Gap';
      case 'active_incident_correlation':
        return 'Active Threat Correlation';
      case 'missing_draft_rule':
        return 'Missing Detection Draft';
      case 'rule_syntax_validation':
        return 'Rule Syntax Fix';
      default:
        return 'Defensive Coverage';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold font-mono uppercase text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Prioritized Defensive Improvement Recommendations
            </h2>
            <ProvenanceBadge type="deterministic_rule" label="DETERMINISTIC ENGINE" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Practical coverage remediation queue derived deterministically from MITRE ATT&CK taxonomy, workbench drafts, and active alerts.
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none cursor-pointer"
            aria-label="Filter recommendations by priority"
          >
            <option value="all">All Priorities ({recommendations.length})</option>
            <option value="critical">Critical ({criticalCount})</option>
            <option value="high">High ({highCount})</option>
            <option value="medium">Medium ({mediumCount})</option>
          </select>
        </div>
      </div>

      {/* Non-AI Advisory Disclaimer Note */}
      <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-300">
        <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">
            Deterministic Analysis Invariant (Zero Live AI Invocation):
          </p>
          <p className="text-[11px] leading-relaxed text-purple-800 dark:text-purple-300/90 font-sans">
            These recommendations are generated entirely via deterministic rule logic comparing catalog coverage against authored Sigma drafts and active incident correlation. No live generative AI/LLM models are invoked to produce this queue.
          </p>
        </div>
      </div>

      {/* Recommendations List */}
      {filteredRecommendations.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center space-y-2 shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            No Recommendations in Selected Priority
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All coverage areas in this filter tier are currently addressed or documented.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(rec.priority)}
                    <span className="text-xs font-mono font-bold text-blue-700 dark:text-cyan-400">
                      {rec.techniqueId}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {rec.techniqueName}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {rec.tacticName} ({rec.tacticId})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 block">
                    Category: {getCategoryLabel(rec.category)} &bull; {rec.generationNotice}
                  </span>
                </div>

                {onSelectTechniqueForDraft && (
                  <button
                    type="button"
                    onClick={() => onSelectTechniqueForDraft(rec.techniqueId)}
                    className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs self-start sm:self-auto"
                    title={`Open Detection Workbench for ${rec.techniqueId}`}
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>Author in Workbench</span>
                  </button>
                )}
              </div>

              {/* Rationale & Evidence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    Why It Matters (Available Evidence)
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-[11px]">
                    {rec.whyItMatters}
                  </p>
                </div>

                <div className="space-y-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-500 block">
                    Priority Rationale
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-[11px]">
                    {rec.priorityRationale}
                  </p>
                </div>
              </div>

              {/* Next Action Box */}
              <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-start gap-2 text-xs">
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 font-mono text-[11px] block">
                    SUGGESTED NEXT ACTION:
                  </span>
                  <p className="text-emerald-800 dark:text-emerald-300/90 text-[11px] font-sans">
                    {rec.suggestedNextAction}
                  </p>
                </div>
              </div>

              {/* Required Data Sources */}
              {rec.dataSources.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-slate-500">
                  <span className="font-semibold">Telemetry Sources:</span>
                  {rec.dataSources.map((ds) => (
                    <span
                      key={ds}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      {ds}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
