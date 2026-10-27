import React from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Database,
  RefreshCw,
  Shield,
  Activity,
  UserCheck,
  UserX,
  Lock,
} from 'lucide-react';
import { UserRole, ROLE_METADATA } from '../../types/auth';
import { AdminOverviewStats, DatabaseConnectivityStatus } from '../../services/adminMetricsService';

interface AdminOverviewMetricsProps {
  stats: AdminOverviewStats;
  dbStatus: DatabaseConnectivityStatus;
  isCheckingDb: boolean;
  onRefreshDb?: () => void;
  className?: string;
}

export const AdminOverviewMetrics: React.FC<AdminOverviewMetricsProps> = ({
  stats,
  dbStatus,
  isCheckingDb,
  onRefreshDb,
  className = '',
}) => {
  const roleBadges: { role: UserRole; count: number; colorClass: string }[] = [
    {
      role: 'soc_analyst',
      count: stats.roleCounts.soc_analyst,
      colorClass: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800',
    },
    {
      role: 'security_engineer',
      count: stats.roleCounts.security_engineer,
      colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
    },
    {
      role: 'it_operations',
      count: stats.roleCounts.it_operations,
      colorClass: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
    },
    {
      role: 'super_admin',
      count: stats.roleCounts.super_admin,
      colorClass: 'text-purple-700 bg-purple-50 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Admin Overview & Health Metrics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time identity statistics, governance queue counts, and verified database status.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            PLATFORM-LEVEL &bull; ISOLATED FROM ALERTS
          </span>
        </div>
      </div>

      {/* Top 4 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registered Users */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                Total Registered Users
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                PROFILES
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {stats.totalUsers}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Across all 4 security operational & admin roles
            </div>
          </div>

          {/* Role Breakdown Mini Chips */}
          <div className="grid grid-cols-2 gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
            {roleBadges.map(({ role, count, colorClass }) => (
              <div
                key={role}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center justify-between ${colorClass}`}
              >
                <span className="truncate pr-1">{ROLE_METADATA[role].label}:</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Pending Governance Approvals */}
        <div
          className={`p-4 border rounded-xl shadow-xs flex flex-col justify-between ${
            stats.pendingCount > 0
              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/80'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <Clock
                  className={`w-3.5 h-3.5 ${
                    stats.pendingCount > 0
                      ? 'text-amber-600 dark:text-amber-400 animate-pulse'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                />
                Pending Approvals
              </span>
              {stats.pendingCount > 0 ? (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  ACTION REQUIRED
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                  QUEUE CLEAR
                </span>
              )}
            </div>
            <div
              className={`text-2xl font-bold font-mono ${
                stats.pendingCount > 0
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {stats.pendingCount}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {stats.pendingCount === 1
                ? '1 operator awaiting role assignment & approval'
                : `${stats.pendingCount} operators awaiting role assignment & approval`}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Unapproved accounts are locked from SOC data</span>
          </div>
        </div>

        {/* Card 3: Account Status Distribution */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Status Distribution
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                AUDIT
              </span>
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {stats.approvedCount}{' '}
              <span className="text-xs font-normal text-slate-400">Active</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Approved operators currently authorized
            </div>
          </div>

          {/* Status Breakdown Chips */}
          <div className="grid grid-cols-2 gap-1.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800 flex items-center justify-between">
              <span>Approved:</span>
              <span className="font-bold">{stats.approvedCount}</span>
            </div>
            <div className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800 flex items-center justify-between">
              <span>Pending:</span>
              <span className="font-bold">{stats.pendingCount}</span>
            </div>
            <div className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800 flex items-center justify-between">
              <span>Rejected:</span>
              <span className="font-bold">{stats.rejectedCount}</span>
            </div>
            <div className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 flex items-center justify-between">
              <span>Disabled:</span>
              <span className="font-bold">{stats.disabledCount}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Database & Repository Status */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wide">
                <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Database & Repository
              </span>
              {onRefreshDb && (
                <button
                  type="button"
                  onClick={onRefreshDb}
                  disabled={isCheckingDb}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Re-probe database connection"
                  aria-label="Re-probe database connection"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingDb ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* Verified Connectivity Badge */}
            <div className="flex items-center gap-1.5 pt-1">
              {isCheckingDb ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-500" />
                  PROBING...
                </span>
              ) : dbStatus.isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  VERIFIED CONNECTED
                </span>
              ) : dbStatus.isConfigured ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800">
                  <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  CONFIGURED (UNREACHABLE)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800">
                  <Database className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  LOCAL PROTOTYPE MODE
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-800 dark:text-slate-200 pt-0.5 truncate">
              {dbStatus.mode === 'live_supabase' ? 'Supabase PostgreSQL' : 'Local In-Memory Adapter'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              {dbStatus.detail}
            </div>
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Configured: {dbStatus.isConfigured ? 'Yes' : 'No'}</span>
            <span>Probe: {dbStatus.isConnected ? 'Pass' : 'Local/Fail'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
