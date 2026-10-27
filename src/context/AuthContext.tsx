import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { UserProfile, UserRole, DEMO_PERSONAS } from '../types/auth';
import { supabase, isSupabaseConfigured, getSupabaseConfigurationStatus } from '../lib/supabaseClient';

export interface LoginResult {
  success: boolean;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  requiresEmailConfirmation?: boolean;
  error?: string;
}

export interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  loginAs: (role: UserRole) => void;
  loginWithCredentials: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string, fullName: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  switchRoleDemo: (role: UserRole) => void;
}

const AUTH_STORAGE_KEY = 'ai_soc_auth_session_v1';

const isProd = Boolean(import.meta.env?.PROD);
const configStatus = getSupabaseConfigurationStatus();
const isOfflineDemoMode = !configStatus.configured && !isProd;

function safeStoreDemo(profile: UserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restrictions in private browsing or sandboxed iframes
  }
}

function safeRemoveStoredDemo(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage restrictions
  }
}

function getInitialUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;

  // In production, never restore unverified demo personas from localStorage
  if (isProd) {
    safeRemoveStoredDemo();
    return null;
  }

  // In offline demo mode, restore stored persona or default to analyst
  if (isOfflineDemoMode) {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        if (parsed && parsed.id && parsed.role && parsed.accountStatus === 'approved') {
          return parsed;
        }
      }
    } catch {
      // Ignore parse failure
    }
    return DEMO_PERSONAS.soc_analyst;
  }

  return null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(getInitialUser);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(isOfflineDemoMode);
  const sessionGenerationRef = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      if (isOfflineDemoMode && !currentUser) {
        const initial = getInitialUser();
        if (initial) setCurrentUser(initial);
      }
      setIsAuthReady(true);
      return;
    }

    const client = supabase;
    let isMounted = true;

    const mapProfile = (row: any): UserProfile => ({
      id: row.id,
      name: row.name || row.email,
      email: row.email,
      role: row.role,
      callsign: row.callsign || 'OPERATOR',
      title: row.title || 'Security Operator',
      avatarUrl: row.avatar_url || undefined,
      accountStatus: row.account_status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
      lastAuditId: row.last_audit_id,
    });

    const syncSessionUser = async (userId: string, generation: number) => {
      try {
        const { data: profile, error } = await client
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        // 1. Invalidation checks: component unmounted or newer session generation started
        if (!isMounted || sessionGenerationRef.current !== generation) {
          return;
        }

        // 2. Double-check session is still active and belongs to the same user
        const { data: activeSessionData } = await client.auth.getSession();
        if (!isMounted || sessionGenerationRef.current !== generation) {
          return;
        }
        if (!activeSessionData.session?.user || activeSessionData.session.user.id !== userId) {
          console.warn('[CyberOps SOC] Stale session profile response discarded: user changed or signed out.');
          return;
        }

        if (error || !profile) {
          console.warn('[CyberOps SOC] Profile not found for authenticated user. Failing closed.');
          sessionGenerationRef.current += 1;
          await client.auth.signOut().catch(() => {});
          if (!isMounted || sessionGenerationRef.current !== generation + 1) return;
          setCurrentUser(null);
          safeRemoveStoredDemo();
          setIsAuthReady(true);
          return;
        }

        if (profile.account_status !== 'approved' || !profile.role) {
          console.warn(
            `[CyberOps SOC] User ${profile.email} has status "${profile.account_status}" and role "${profile.role}". Workspace access denied.`
          );
          sessionGenerationRef.current += 1;
          await client.auth.signOut().catch(() => {});
          if (!isMounted || sessionGenerationRef.current !== generation + 1) return;
          setCurrentUser(null);
          safeRemoveStoredDemo();
          setIsAuthReady(true);
          return;
        }

        const mapped = mapProfile(profile);
        setCurrentUser(mapped);
        setIsAuthReady(true);
      } catch (err) {
        if (!isMounted || sessionGenerationRef.current !== generation) return;
        console.error('[CyberOps SOC] Error syncing session profile:', err);
        setCurrentUser(null);
        safeRemoveStoredDemo();
        setIsAuthReady(true);
      }
    };

    const initialGen = ++sessionGenerationRef.current;
    client.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted || sessionGenerationRef.current !== initialGen) return;
      if (session?.user) {
        syncSessionUser(session.user.id, initialGen);
      } else {
        setCurrentUser(null);
        safeRemoveStoredDemo();
        setIsAuthReady(true);
      }
    }).catch((err) => {
      if (!isMounted || sessionGenerationRef.current !== initialGen) return;
      console.error('[CyberOps SOC] Error checking initial session:', err);
      setCurrentUser(null);
      safeRemoveStoredDemo();
      setIsAuthReady(true);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      const currentGen = ++sessionGenerationRef.current;
      if (event === 'SIGNED_OUT' || !session?.user) {
        setCurrentUser(null);
        safeRemoveStoredDemo();
        setIsAuthReady(true);
      } else if (session?.user) {
        syncSessionUser(session.user.id, currentGen);
      }
    });

    return () => {
      isMounted = false;
      sessionGenerationRef.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const loginAs = (role: UserRole): void => {
    if (!isOfflineDemoMode) {
      console.warn(
        '[CyberOps SOC Security Warning] Fast persona login is available only in offline development mode.'
      );
      return;
    }
    const profile = DEMO_PERSONAS[role];
    if (!profile) return;
    setCurrentUser(profile);
    safeStoreDemo(profile);
  };

  const loginWithCredentials = async (
    email: string,
    pass: string
  ): Promise<LoginResult> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !pass) {
      return { success: false, error: 'Email and password are required.' };
    }

    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      sessionGenerationRef.current += 1;
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: pass,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (!data?.user) {
          return { success: false, error: 'Authentication failed. Please verify your credentials.' };
        }

        const { data: profile, error: profileErr } = await client
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileErr || !profile) {
          await client.auth.signOut().catch(() => {});
          setCurrentUser(null);
          safeRemoveStoredDemo();
          return {
            success: false,
            error: 'User profile not found. Please contact a platform administrator.',
          };
        }

        if (profile.account_status !== 'approved') {
          await client.auth.signOut().catch(() => {});
          setCurrentUser(null);
          safeRemoveStoredDemo();

          if (profile.account_status === 'pending') {
            return {
              success: false,
              error: 'Your account registration is pending administrator approval.',
            };
          }
          if (profile.account_status === 'disabled') {
            return {
              success: false,
              error: 'This account has been disabled. Please contact an administrator.',
            };
          }
          if (profile.account_status === 'rejected') {
            return {
              success: false,
              error: 'This account application was rejected. Please contact security operations.',
            };
          }
          return {
            success: false,
            error: 'Account is not approved for operational access.',
          };
        }

        if (!profile.role) {
          await client.auth.signOut().catch(() => {});
          setCurrentUser(null);
          safeRemoveStoredDemo();
          return {
            success: false,
            error: 'Your account does not have an active operational role assigned.',
          };
        }

        const userProfile: UserProfile = {
          id: profile.id,
          name: profile.name || cleanEmail,
          email: profile.email || cleanEmail,
          role: profile.role,
          callsign: profile.callsign || 'OPERATOR',
          title: profile.title || 'Security Operator',
          avatarUrl: profile.avatar_url || undefined,
          accountStatus: profile.account_status,
          approvedBy: profile.approved_by,
          approvedAt: profile.approved_at,
          createdAt: profile.created_at,
          lastAuditId: profile.last_audit_id,
        };

        setCurrentUser(userProfile);
        safeStoreDemo(userProfile);
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err?.message || 'Authentication failed due to a network or service error.',
        };
      }
    }

    if (isOfflineDemoMode) {
      const persona = Object.values(DEMO_PERSONAS).find(
        (p) => p.email.toLowerCase() === cleanEmail
      );
      if (persona) {
        setCurrentUser(persona);
        safeStoreDemo(persona);
        return { success: true };
      }
      return {
        success: false,
        error: `User not found in demo personas. Try one of: ${Object.values(DEMO_PERSONAS).map((p) => p.email).join(', ')}`,
      };
    }

    return {
      success: false,
      error: 'Authentication service unavailable in unconfigured production mode.',
    };
  };

  const register = async (
    email: string,
    pass: string,
    fullName: string
  ): Promise<RegisterResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanEmail || !cleanName || !pass) {
      return { success: false, error: 'All fields are required.' };
    }

    if (pass.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      if (isOfflineDemoMode) {
        return { success: true, requiresEmailConfirmation: false };
      }
      return {
        success: false,
        error: 'Registration service is unavailable in unconfigured production mode.',
      };
    }

    const client = supabase;

    try {
      const emailRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/#login` : undefined;

      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          emailRedirectTo,
          data: {
            full_name: cleanName,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          return {
            success: false,
            error: 'An account with this email address already exists. Please sign in or reset your password.',
          };
        }

        return { success: false, error: error.message };
      }

      if (!data?.user) {
        return { success: false, error: 'Registration did not return a user. Please try again.' };
      }

      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in or reset your password.',
        };
      }

      if (data.session) {
        // A profile trigger may create this row. This insert is best-effort and
        // must never grant a role or approve the account.
        const callsign =
          cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || 'OPERATOR';

        const { error: insertError } = await client.from('user_profiles').insert({
          id: data.user.id,
          email: cleanEmail,
          name: cleanName,
          role: null,
          account_status: 'pending',
          callsign,
          title: 'Pending Operator',
        });

        // A duplicate row can mean the database trigger already created it.
        // Other insert errors should be surfaced rather than silently ignored.
        if (insertError && insertError.code !== '23505') {
          await client.auth.signOut().catch(() => {});
          setCurrentUser(null);
          safeRemoveStoredDemo();
          return {
            success: false,
            error: 'Your account was created, but its pending profile could not be verified. Please contact an administrator.',
          };
        }

        setCurrentUser(null);
        safeRemoveStoredDemo();
        await client.auth.signOut().catch(() => {});
        return { success: true, requiresEmailConfirmation: false };
      }

      return { success: true, requiresEmailConfirmation: true };
    } catch {
      return {
        success: false,
        error: 'Registration failed due to a network or service error.',
      };
    }
  };

  const logout = async (): Promise<void> => {
    sessionGenerationRef.current += 1;
    setCurrentUser(null);
    safeRemoveStoredDemo();
    setIsAuthReady(true);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('cyberops_soc_in_workspace');
        sessionStorage.removeItem('cyberops_soc_workspace_view');
        sessionStorage.removeItem('cyberops_soc_public_route');
      } catch {
        // Ignore storage errors in restricted contexts
      }
    }

    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      try {
        await client.auth.signOut();
      } catch {
        // Local UI state remains cleared even if remote sign-out fails.
      }
    }
  };

  const switchRoleDemo = (role: UserRole): void => {
    if (!isOfflineDemoMode) {
      console.warn(
        '[CyberOps SOC Security Warning] Demo role switching is available only in offline development mode.'
      );
      return;
    }

    const profile = DEMO_PERSONAS[role];
    if (!profile) return;

    setCurrentUser(profile);
    safeStoreDemo(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAuthReady,
        loginAs,
        loginWithCredentials,
        register,
        logout,
        switchRoleDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
