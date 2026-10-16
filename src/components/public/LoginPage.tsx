import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  AlertCircle,
  Info,
  Cpu,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, DEMO_PERSONAS } from '../../types/auth';
import { Button } from '../common/Button';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { loginAs, loginWithCredentials } = useAuth();
  const [email, setEmail] = useState('alex.mercer@soc.internal');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await loginWithCredentials(email, password);
      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.error || 'Authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFastPersona = (role: UserRole) => {
    loginAs(role);
    onLoginSuccess();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        {/* LEFT PANEL: Product Briefing & Capability Highlights */}
        <div className="lg:col-span-6 bg-slate-900 dark:bg-[#080c22]/90 text-slate-100 rounded-2xl p-8 sm:p-10 flex flex-col justify-between border border-slate-800 dark:border-purple-500/30 shadow-xl dark:shadow-[0_0_40px_rgba(139,92,246,0.15)] relative overflow-hidden backdrop-blur-md">
          {/* Subtle Cyber Glow Background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-heading font-bold tracking-wider text-base text-white">CYBEROPS SOC</span>
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 bg-purple-900/60 text-cyan-300 rounded border border-purple-700/60">
                  v2.0-MVP
                </span>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white leading-tight">
                Unified Security Operations & Incident Response
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                Investigate security alerts, correlate telemetry with authentic threat intelligence, identify defensive coverage gaps, and coordinate authorized response actions.
              </p>
            </div>

            {/* 3 Concise Capability Statements */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 dark:bg-[#0c102a] border border-slate-800/80 dark:border-purple-900/40">
                <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Deterministic Triage Engine</h4>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Transparent rule scoring over execution telemetry without generative model hallucinations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 dark:bg-[#0c102a] border border-slate-800/80 dark:border-purple-900/40">
                <Layers className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Verifiable Threat Intelligence</h4>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Curated MITRE ATT&CK Enterprise v14.1 tactics, techniques, and documented mitigations reference subset.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 dark:bg-[#0c102a] border border-slate-800/80 dark:border-purple-900/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Human-Authorized Containment</h4>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Mandatory operator rationale recorded into a tamper-evident audit ledger prior to containment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Prototype vs Planned Capability Disclaimer */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-1 relative z-10">
            <span className="text-cyan-400 font-bold block uppercase text-[10px]">
              &bull; PHASE 1 PROTOTYPE EVALUATION SCOPE
            </span>
            <p className="text-slate-400 text-[10px] leading-normal font-sans">
              All containment actions remain simulated. Autonomous AI agent tools and live SIEM connectors represent planned capabilities subject to separate approval.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Sign-In Card & Demo Personas */}
        <div className="lg:col-span-6 bg-white dark:bg-[#090d24]/90 rounded-2xl p-6 sm:p-10 border border-slate-200/90 dark:border-purple-900/40 shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:shadow-[0_0_35px_rgba(139,92,246,0.1)] flex flex-col justify-between space-y-6 backdrop-blur-sm">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100">
                Access Operational Workspace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-1">
                Authenticate with an enterprise role or select a demo evaluation persona.
              </p>
            </div>

            {/* 1-Click Fast Persona Sign-In */}
            <div className="p-4 bg-[#F8FAFD] dark:bg-[#0c102c]/80 border border-slate-200/90 dark:border-purple-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-purple-700 dark:text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  1-Click Evaluation Personas
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-purple-950/60 text-slate-600 dark:text-cyan-300 border border-slate-300 dark:border-purple-800/60">
                  DEV PROTOTYPE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* SOC Analyst */}
                <button
                  onClick={() => handleFastPersona('soc_analyst')}
                  className="p-2.5 bg-white dark:bg-[#090d24] hover:border-purple-500 dark:hover:border-cyan-400 border border-slate-200/90 dark:border-purple-900/40 rounded-lg text-left transition flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-[0_4px_14px_rgba(109,40,217,0.12)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-700 dark:group-hover:text-cyan-300">
                      {DEMO_PERSONAS.soc_analyst.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      SOC Analyst &bull; Triage
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-700 dark:group-hover:text-cyan-400 shrink-0 ml-1" />
                </button>

                {/* Security Engineer */}
                <button
                  onClick={() => handleFastPersona('security_engineer')}
                  className="p-2.5 bg-white dark:bg-[#090d24] hover:border-purple-500 dark:hover:border-blue-400 border border-slate-200/90 dark:border-purple-900/40 rounded-lg text-left transition flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-[0_4px_14px_rgba(59,130,246,0.12)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-700 dark:group-hover:text-blue-300">
                      {DEMO_PERSONAS.security_engineer.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Security Engineer &bull; ATT&CK
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-700 dark:group-hover:text-blue-400 shrink-0 ml-1" />
                </button>

                {/* IT Operations */}
                <button
                  onClick={() => handleFastPersona('it_operations')}
                  className="p-2.5 bg-white dark:bg-[#090d24] hover:border-purple-500 dark:hover:border-amber-400 border border-slate-200/90 dark:border-purple-900/40 rounded-lg text-left transition flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-[0_4px_14px_rgba(245,158,11,0.12)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-700 dark:group-hover:text-amber-300">
                      {DEMO_PERSONAS.it_operations.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      IT Operations &bull; Tasks
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-700 dark:group-hover:text-amber-400 shrink-0 ml-1" />
                </button>

                {/* Platform Administrator (Super Admin) */}
                <button
                  onClick={() => handleFastPersona('super_admin')}
                  className="p-2.5 bg-white dark:bg-[#090d24] hover:border-purple-500 border border-slate-200/90 dark:border-purple-900/40 rounded-lg text-left transition flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-[0_4px_14px_rgba(109,40,217,0.15)]"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300">
                      {DEMO_PERSONAS.super_admin.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Super Admin &bull; Domain C
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-700 dark:group-hover:text-purple-400 shrink-0 ml-1" />
                </button>
              </div>
            </div>

            {/* Manual Form */}
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200/90 dark:border-purple-900/30">
                Or Sign In with Credentials
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enterprise Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#F8FAFD] dark:bg-[#060814] border border-slate-300 dark:border-purple-900/40 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Access Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F8FAFD] dark:bg-[#060814] border border-slate-300 dark:border-purple-900/40 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 pr-9 focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-500 focus:outline-hidden"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:via-purple-600 hover:to-indigo-500 text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)] transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Authenticating...' : 'Sign In to Authorized Session'}
              </button>
            </form>
          </div>

          {/* Client-Side Session Honesty Notice */}
          <div className="p-3 bg-[#F8FAFD] dark:bg-[#070a18] border border-slate-200/90 dark:border-purple-900/30 rounded-lg text-[10px] text-slate-500 dark:text-slate-400 font-mono space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
              <Info className="w-3.5 h-3.5 text-purple-700 dark:text-cyan-400" />
              AUTHENTICATION HONESTY NOTICE
            </div>
            <p className="font-sans leading-normal">
              Demo credentials operate entirely within local client memory. No secrets are stored or transmitted. Production enterprise deployments require SAML/OIDC identity providers with server-side session cookies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
