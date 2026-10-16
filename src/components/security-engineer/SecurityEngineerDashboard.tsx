import React, { useState, useMemo } from 'react';
import { MitreTactic, MitreTechnique, MitreMitigation, MitreDefenseCoverage } from '../../types/mitre';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Button } from '../common/Button';
import {
  Layers,
  ShieldCheck,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Database,
  Filter,
} from 'lucide-react';

interface SecurityEngineerDashboardProps {
  tactics: MitreTactic[];
  techniques: MitreTechnique[];
  mitigations: MitreMitigation[];
  coverage: MitreDefenseCoverage[];
}

export const SecurityEngineerDashboard: React.FC<SecurityEngineerDashboardProps> = ({
  tactics,
  techniques,
  mitigations,
  coverage,
}) => {
  const [selectedTacticId, setSelectedTacticId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechnique, setSelectedTechnique] = useState<MitreTechnique | null>(null);

  // Coverage statistics
  const stats = useMemo(() => {
    const totalTechniques = techniques.length;
    const coveredByDetections = coverage.filter((c) => c.coveredByDetections).length;
    const coveredByMitigations = coverage.filter((c) => c.mitigationAvailable).length;
    const detectionPercent = totalTechniques > 0 ? Math.round((coveredByDetections / totalTechniques) * 100) : 0;
    const mitigationPercent = totalTechniques > 0 ? Math.round((coveredByMitigations / totalTechniques) * 100) : 0;
    return {
      totalTechniques,
      coveredByDetections,
      coveredByMitigations,
      detectionPercent,
      mitigationPercent,
    };
  }, [techniques, coverage]);

  const filteredTechniques = useMemo(() => {
    let list = [...techniques];
    if (selectedTacticId !== 'all') {
      list = list.filter((t) => t.tactics.includes(selectedTacticId));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [techniques, selectedTacticId, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Security Engineering: MITRE ATT&CK Defense Coverage
            </h1>
            <ProvenanceBadge type="authentic_mitre" label="MITRE v14.1 ENTERPRISE" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit attack techniques, evaluate verified detection coverage, and analyze defensive mitigations.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xs">
          <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">CATALOGED TECHNIQUES</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">{stats.totalTechniques}</span>
          <span className="text-[10px] text-slate-500">Curated v14.1 Scope</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-cyan-200 dark:border-slate-800 rounded-lg shadow-xs">
          <span className="text-[10px] font-mono uppercase text-blue-600 dark:text-cyan-400 block">DETECTION STRATEGIES</span>
          <span className="text-xl font-bold font-mono text-blue-700 dark:text-cyan-400 mt-1 block">
            {stats.coveredByDetections} ({stats.detectionPercent}%)
          </span>
          <span className="text-[10px] text-blue-600/70 dark:text-cyan-300/70">Verified telemetry sources</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-800 rounded-lg shadow-xs">
          <span className="text-[10px] font-mono uppercase text-blue-600 dark:text-blue-400 block">DOCUMENTED MITIGATIONS</span>
          <span className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400 mt-1 block">
            {stats.coveredByMitigations} ({stats.mitigationPercent}%)
          </span>
          <span className="text-[10px] text-blue-600/70 dark:text-blue-300/70">Control guidance mapped</span>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-800 rounded-lg shadow-xs">
          <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block">ACTIVE TACTICS</span>
          <span className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block">{tactics.length}</span>
          <span className="text-[10px] text-amber-700/70 dark:text-amber-300/70">Initial Access to Impact</span>
        </div>
      </div>

      {/* Search and Tactic Filters */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2.5 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter technique by ID or keyword (e.g. T1059, PowerShell, LSASS, WMI)..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none"
            />
          </div>

          <select
            value={selectedTacticId}
            onChange={(e) => setSelectedTacticId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none"
            aria-label="Filter techniques by tactic"
          >
            <option value="all">All Tactics ({tactics.length})</option>
            {tactics.map((tac) => (
              <option key={tac.id} value={tac.id}>
                {tac.id}: {tac.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Matrix Layout: List + Detail Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Technique Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-800 dark:text-slate-300 font-bold uppercase">Enterprise Techniques ({filteredTechniques.length})</span>
            <span className="text-slate-500 text-[11px]">Select technique to inspect defense details</span>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800/80 max-h-[600px] overflow-y-auto">
            {filteredTechniques.map((tech) => {
              const isSelected = selectedTechnique?.id === tech.id;
              const hasMitigation = tech.mitigationIds.length > 0;

              return (
                <div
                  key={tech.id}
                  onClick={() => setSelectedTechnique(tech)}
                  className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer text-xs space-y-1.5 ${
                    isSelected ? 'bg-blue-50/80 dark:bg-slate-800/80 ring-1 ring-inset ring-blue-500/50 dark:ring-cyan-500/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 dark:text-cyan-400 bg-blue-50 dark:bg-cyan-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-cyan-800">
                        {tech.id}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{tech.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasMitigation && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {tech.mitigationIds.length} Mitigations
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{tech.description}</p>
                  <div className="flex flex-wrap gap-1 text-[10px] font-mono text-slate-500 pt-1">
                    <span>Data Sources:</span>
                    {tech.dataSources.map((ds, i) => (
                      <span key={i} className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-950 px-1 rounded">
                        {ds}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Technique Inspection */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4 shadow-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 block">DEFENSE INSPECTOR</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
              {selectedTechnique ? `${selectedTechnique.id}: ${selectedTechnique.name}` : 'Select a Technique'}
            </h3>
          </div>

          {selectedTechnique ? (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase block">TECHNIQUE OVERVIEW</span>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">{selectedTechnique.description}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded space-y-1.5">
                <span className="text-[10px] font-mono text-blue-600 dark:text-cyan-400 uppercase font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Detection Guidance
                </span>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                  {selectedTechnique.detectionGuidance}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase block">
                  Mapped Mitigations ({selectedTechnique.mitigationIds.length})
                </span>
                {selectedTechnique.mitigationIds.length === 0 ? (
                  <p className="text-slate-500 italic text-[11px]">No mitigations mapped in sample baseline.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedTechnique.mitigationIds.map((mId) => {
                      const mit = mitigations.find((m) => m.id === mId);
                      return (
                        <div key={mId} className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11px]">
                          <div className="flex items-center justify-between text-blue-700 dark:text-cyan-300 font-mono font-semibold">
                            <span>{mId}: {mit?.name || 'Mitigation'}</span>
                            {mit?.sourceUrl && (
                              <a
                                href={mit.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-cyan-300 flex items-center gap-0.5"
                              >
                                Link <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          {mit?.description && <p className="text-slate-600 dark:text-slate-400 mt-0.5">{mit.description}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <a
                  href={selectedTechnique.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                >
                  View Official MITRE Enterprise Page <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic py-8 text-center">
              Click any technique from the left table to inspect detection strategies and mitigation coverage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
