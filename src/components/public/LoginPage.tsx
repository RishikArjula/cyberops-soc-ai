import React, { useState, useEffect } from 'react';
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
  Clock,
  UserPlus,
  Mail,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, DEMO_PERSONAS } from '../../types/auth';
import { isSupabaseConfigured } from '../../lib/supabaseClient';

interface LoginPageProps {
  initialMode?: 'signin' | 'register';
  onLoginSuccess: () => void;
  onNavigate?: (route: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialMode = 'signin',
  onLoginSuccess,
  onNavigate,
}) => {
  const { loginAs, loginWithCredentials, register, isAuthenticated, currentUser } = useAuth();
  const isLive = isSupabaseConfigured();

  // Auto-redirect to authorized workspace if already authenticated and approved
  useEffect(() => {
    if (isAuthenticated && currentUser?.accountStatus === 'approved') {
      onLoginSuccess();
    }
  }, [isAuthenticated, currentUser?.accountStatus, onLoginSuccess]);

  // Mode: 'signin' | 'register' | 'confirmation'
  const [mode, setMode] = useState<'signin' | 'register' | 'confirmation'>(initialMode);

  // Sign In form states
  const [email, setEmail] = useState(isLive ? '' : 'alex.mercer@soc.internal');
  const [password, setPassword] = useState(isLive ? '' : '••••••••••••');
  const [showPassword, setShowPassword] = useState(false);

  // Registration form states
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Confirmation state
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
  }, [initialMode]);

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regFullName.trim()) {
      setErrorMessage('Please provide your full legal name.');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Please provide a valid enterprise email address.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your confirmation password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register(regEmail, regPassword, regFullName);
      if (res.success) {
        setRegisteredEmail(regEmail);
        setRequiresEmailConfirmation(Boolean(res.requiresEmailConfirmation));
        setMode('confirmation');
      } else {
        setErrorMessage(res.error || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isProd = Boolean(import.meta.env?.PROD);

  const handleFastPersona = (role: UserRole) => {
    if (isProd || isLive) {
      setErrorMessage(
        'Fast demo persona login is disabled in live database mode. Please authenticate with your registered credentials.'
      );
      return;
    }
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
                  <h4 className="text-xs font-bold text-slate-200">Authentic MITRE ATT&CK Mapping</h4>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Live enterprise tactics, sub-techniques, and defensive mitigations.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950/60 dark:bg-[#0c102a] border border-slate-800/80 dark:border-purple-900/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Enforced Role & Record Isolation</h4>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                    Defense-in-depth isolation across SOC Analyst, Security Engineer, IT Ops, and Super Admin.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>DEFENSE-IN-DEPTH POSTURE</span>
            <span className="text-cyan-400 font-semibold">ZERO-TRUST ACTIVE</span>
          </div>
        </div>

        {/* RIGHT PANEL: Authentication Form / Registration / Confirmation */}
        <div className="lg:col-span-6 bg-white dark:bg-[#080c22]/90 rounded-2xl p-6 sm:p-10 border border-slate-200 dark:border-purple-500/30 shadow-xl dark:shadow-[0_0_40px_rgba(139,92,246,0.15)] flex flex-col justify-between backdrop-blur-md">
          <div className="space-y-6">
            {/* Header & Mode Switcher */}
            {mode !== 'confirmation' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100">
                      {mode === 'signin' ? 'Sign In to Workspace' : 'Create Operator Account'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {mode === 'signin'
                        ? 'Select an authorized operational persona or sign in with credentials.'
                        : 'Register for SOC platform access. All accounts require administrator approval.'}
                    </p>
                  </div>
                </div>

                {/* Tabbed Toggle between Sign In and Create Account */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-purple-900/40">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      mode === 'signin'
                        ? 'bg-white dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 shadow-xs border border-purple-200/80 dark:border-purple-500/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      mode === 'register'
                        ? 'bg-white dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 shadow-xs border border-purple-200/80 dark:border-purple-500/40'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </div>
            ) : null}

            {/* Error Message Display */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW A: SIGN IN FORM & DEMO PERSONAS */}
            {/* ========================================================================= */}
            {mode === 'signin' && (
              <div className="space-y-6">
                {/* Fast Operational Personas Grid (Development / Demo Mode Only) */}
                {!isProd && !isLive && (
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                        Select Fast Operational Persona (Dev Only):
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* SOC Analyst */}
                      <button
                        type="button"
                        onClick={() => handleFastPersona('soc_analyst')}
                        className="p-2.5 bg-white dark:bg-[#090d24] hover:border-purple-500 dark:hover:border-cyan-400 border border-slate-200/90 dark:border-purple-900/40 rounded-lg text-left transition flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-[0_4px_14px_rgba(6,182,212,0.15)]"
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
                        type="button"
                        onClick={() => handleFastPersona('security_engineer')}
                        className="p-2.5 bg-white dark:bg-[#090d24] hover:border-purple-500 dark:hover:border-blue-400 border border-slate-200/90 dark:border-purple-900/40 rounded-lg text-left transition flex items-center justify-between group cursor-pointer shadow-xs hover:shadow-[0_4px_14px_rgba(59,130,246,0.15)]"
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
                        type="button"
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

                      {/* Platform Administrator */}
                      <button
                        type="button"
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
                )}

                {/* Manual Credentials Sign In Form */}
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200/90 dark:border-purple-900/30">
                    Or Sign In with Credentials
                  </div>

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
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
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

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMessage(null);
                      }}
                      className="text-xs text-purple-700 dark:text-purple-400 hover:underline font-medium cursor-pointer"
                    >
                      Need an operator account? Register for approval &rarr;
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW B: CREATE ACCOUNT (REGISTRATION) FORM */}
            {/* ========================================================================= */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-xl space-y-1 text-[11px] text-purple-900 dark:text-purple-300">
                  <div className="font-bold flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                    Zero-Trust Access Governance Policy
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-sans leading-normal">
                    New accounts are provisioned in a <strong>Pending Approval</strong> state with no operational permissions. A Platform Super Admin must verify your credentials and assign your operational role.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. Jordan Hayes"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full bg-[#F8FAFD] dark:bg-[#060814] border border-slate-300 dark:border-purple-900/40 rounded-lg px-3 py-2 pl-9 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-500 focus:outline-hidden"
                      required
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Enterprise Work Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="jordan.hayes@soc.internal"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-[#F8FAFD] dark:bg-[#060814] border border-slate-300 dark:border-purple-900/40 rounded-lg px-3 py-2 pl-9 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-500 focus:outline-hidden"
                      required
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password (Min 8 Characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-[#F8FAFD] dark:bg-[#060814] border border-slate-300 dark:border-purple-900/40 rounded-lg px-3 py-2 pl-9 pr-9 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-500 focus:outline-hidden"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full bg-[#F8FAFD] dark:bg-[#060814] border border-slate-300 dark:border-purple-900/40 rounded-lg px-3 py-2 pl-9 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 dark:focus:ring-cyan-500 focus:outline-hidden"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:via-purple-600 hover:to-indigo-500 text-white shadow-[0_4px_14px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)] transition cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'Creating Account...' : 'Submit Registration Request'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-purple-700 dark:text-purple-400 hover:underline font-medium cursor-pointer"
                  >
                    Already have an approved account? Sign in &rarr;
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================================= */}
            {/* VIEW C: REGISTRATION CONFIRMATION SCREEN */}
            {/* ========================================================================= */}
            {mode === 'confirmation' && (
              <div className="p-6 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-purple-200 dark:border-purple-800/60 space-y-5">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700/60 flex items-center justify-center text-purple-700 dark:text-cyan-400 mx-auto shadow-md">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>

                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80">
                    PENDING SUPER ADMIN APPROVAL
                  </div>
                  <h4 className="text-lg font-bold font-heading text-slate-900 dark:text-slate-100">
                    Registration Request Submitted
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-sans">
                    Your account profile for <strong>{registeredEmail}</strong> has been created in a pending state.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 font-sans bg-white dark:bg-[#0c102a] p-4 rounded-xl border border-slate-200 dark:border-purple-900/40">
                  {requiresEmailConfirmation ? (
                    <div className="flex items-start gap-2.5">
                      <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Email Verification Required:</strong> A verification link has been dispatched to your email. Please click the link to confirm ownership.
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Administrative Verification:</strong> A Platform Super Admin must review your identity and assign your authorized role (SOC Analyst, Security Engineer, or IT Operations) before access is granted.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Zero-Trust Isolation:</strong> Operational dashboards and telemetry are gated until an approved status is written to the database.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  Return to Sign In Screen
                </button>
              </div>
            )}
          </div>

          {/* Client-Side Session Honesty Notice */}
          <div className="p-3 bg-[#F8FAFD] dark:bg-[#070a18] border border-slate-200/90 dark:border-purple-900/30 rounded-lg text-[10px] text-slate-500 dark:text-slate-400 font-mono space-y-1 mt-6">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold">
              <Info className="w-3.5 h-3.5 text-purple-700 dark:text-cyan-400" />
              AUTHENTICATION HONESTY NOTICE
            </div>
            <p className="font-sans leading-normal">
              Demo personas operate within local client memory. Production deployments enforce database-level PostgreSQL Row-Level Security with server-authenticated sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
