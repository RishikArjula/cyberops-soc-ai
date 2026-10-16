import React, { useState, useEffect } from 'react';
import { Shield, Clock, LogOut, User, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLE_METADATA } from '../../types/auth';
import { ThemeToggle } from '../common/ThemeToggle';

interface AppHeaderProps {
  alertCount: number;
  criticalCount: number;
  onExitToPublic: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  alertCount,
  criticalCount,
  onExitToPublic,
}) => {
  const { currentUser, logout } = useAuth();
  const [utcTime, setUtcTime] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    logout();
    onExitToPublic();
  };

  const roleMeta = currentUser ? ROLE_METADATA[currentUser.role] : null;

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 sticky top-0 z-40 select-none shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onExitToPublic}>
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-cyan-950 border border-blue-200 dark:border-cyan-500/40 flex items-center justify-center text-blue-600 dark:text-cyan-400 shadow-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold tracking-wider text-sm text-slate-900 dark:text-slate-100">
                CYBEROPS SOC
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-cyan-950 text-slate-700 dark:text-cyan-400 border border-slate-200 dark:border-cyan-800 rounded">
                SECURE WORKSPACE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none font-sans">
              Operational Incident Platform
            </p>
          </div>
        </div>

        {/* Center operational counters */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">{utcTime || '00:00:00 UTC'}</span>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">QUEUE:</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">{alertCount} Alerts</span>
            {criticalCount > 0 && (
              <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/70 px-1.5 rounded border border-rose-200 dark:border-rose-800/80">
                {criticalCount} CRIT
              </span>
            )}
          </div>
        </div>

        {/* Right tools: Theme Toggle, Profile Badge & Sign Out */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer text-left shadow-xs"
              >
                <div className="w-7 h-7 rounded-md bg-blue-600 dark:bg-slate-800 text-white dark:text-cyan-400 flex items-center justify-center font-mono text-xs font-bold">
                  {currentUser.callsign.slice(0, 2)}
                </div>
                <div className="hidden sm:block text-xs">
                  <div className="font-bold text-slate-900 dark:text-slate-200 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {roleMeta?.label}
                  </div>
                </div>
              </button>

              {/* User Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-50 text-xs font-sans space-y-3">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</div>
                    <div className="text-[11px] font-mono text-blue-600 dark:text-cyan-400">
                      {currentUser.callsign} &bull; {currentUser.email}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{currentUser.title}</div>
                  </div>

                  <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                    <span className="font-mono text-slate-800 dark:text-slate-300 font-semibold block uppercase text-[10px]">
                      Active Scope:
                    </span>
                    <p className="line-clamp-2">{roleMeta?.description}</p>
                  </div>

                  <div className="pt-1 flex flex-col gap-1 text-xs font-mono">
                    <button
                      onClick={onExitToPublic}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                    >
                      Return to Public Website
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-300 transition flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
