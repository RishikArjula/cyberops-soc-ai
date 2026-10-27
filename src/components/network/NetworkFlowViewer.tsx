import React, { useState } from 'react';
import { NetworkFlowRecord } from '../../types/networkFlow';
import { SAMPLE_NETWORK_FLOWS } from '../../data/networkFlows';
import { ProvenanceBadge } from '../common/ProvenanceBadge';
import { Activity, Search, Filter } from 'lucide-react';

export const NetworkFlowViewer: React.FC = () => {
  const [flows] = useState<NetworkFlowRecord[]>(SAMPLE_NETWORK_FLOWS);
  const [filterLabel, setFilterLabel] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredFlows = flows.filter((f) => {
    if (filterLabel !== 'all' && f.label !== filterLabel) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        f.flowId.toLowerCase().includes(q) ||
        f.sourceIp.includes(q) ||
        f.destinationIp.includes(q) ||
        f.label.toLowerCase().includes(q)
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
              <Activity className="w-5 h-5 text-emerald-400" />
              CIC-IDS2017 Network Flow Telemetry
            </h1>
            <ProvenanceBadge type="cic_ids_sample" label="CIC-IDS2017 SCHEMA" />
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Network flow features structured to the Canadian Institute for Cybersecurity standard benchmark.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row gap-2 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Flow ID, Source IP, Destination IP..."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none"
          />
        </div>

        <select
          value={filterLabel}
          onChange={(e) => setFilterLabel(e.target.value)}
          className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-400 focus:outline-none"
          aria-label="Filter flows by label"
        >
          <option value="all">All Flow Labels</option>
          <option value="BENIGN">BENIGN</option>
          <option value="SSH-Patator">SSH-Patator</option>
          <option value="Bot">Bot</option>
          <option value="DoS Slowloris">DoS Slowloris</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                <th className="py-2.5 px-3">Flow ID</th>
                <th className="py-2.5 px-3">Source Socket</th>
                <th className="py-2.5 px-3">Destination Socket</th>
                <th className="py-2.5 px-3">Proto</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Flow Bytes/s</th>
                <th className="py-2.5 px-3">TCP Flags (SYN/RST/ACK)</th>
                <th className="py-2.5 px-3 text-right">Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 font-mono text-[11px]">
              {filteredFlows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 italic text-xs font-sans">
                    No network flows match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFlows.map((flow) => (
                  <tr key={flow.flowId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-200">{flow.flowId}</td>
                    <td className="py-3 px-3 text-blue-600 dark:text-cyan-300 font-semibold">{flow.sourceIp}:{flow.sourcePort}</td>
                    <td className="py-3 px-3 text-amber-700 dark:text-amber-300 font-semibold">{flow.destinationIp}:{flow.destinationPort}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{flow.protocol}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{flow.flowDurationMs} ms</td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200">{flow.flowBytesPerSec.toLocaleString()} B/s</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{flow.synFlagCount} / {flow.rstFlagCount} / {flow.ackFlagCount}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          flow.label === 'BENIGN'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                        }`}
                      >
                        {flow.label}
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
