/**
 * Authentication Context & Session State
 *
 * PROTOTYPE ARCHITECTURE & SECURITY NOTICE:
 * This context manages demo authentication sessions in client memory/localStorage.
 * It provides strict role assignment to the active session.
 * Limitations:
 * - Client-side state only.
 * - Does not verify cryptographic signatures or HTTP-only session cookies.
 * - In production, authentication must be managed via a backend identity provider (e.g. OIDC/OAuth2/SAML)
 *   with server-validated JWT tokens or secure session cookies.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, DEMO_PERSONAS } from '../types/auth';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  loginAs: (role: UserRole) => void;
  loginWithCredentials: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRoleDemo: (role: UserRole) => void;
}

const AUTH_STORAGE_KEY = 'ai_soc_auth_session_v1';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {
        // Fallback
      }
    }
    return null; // By default unauthenticated on landing page
  });

  const loginAs = (role: UserRole) => {
    const profile = DEMO_PERSONAS[role];
    setCurrentUser(profile);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    }
  };

  const loginWithCredentials = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    // Demo validation
    if (!email || !pass) {
      return { success: false, error: 'Email and password are required.' };
    }

    const cleanEmail = email.toLowerCase().trim();
    const matched = Object.values(DEMO_PERSONAS).find((p) => p.email.toLowerCase() === cleanEmail);

    if (matched) {
      setCurrentUser(matched);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matched));
      }
      return { success: true };
    }

    // Allow testing with any validly formatted email by defaulting to SOC Analyst role
    if (cleanEmail.includes('@')) {
      const customUser: UserProfile = {
        id: `usr-custom-${Date.now()}`,
        name: cleanEmail.split('@')[0].toUpperCase(),
        email: cleanEmail,
        role: 'soc_analyst',
        callsign: 'ANALYST-TEMP',
        title: 'Triage Analyst',
      };
      setCurrentUser(customUser);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(customUser));
      }
      return { success: true };
    }

    return { success: false, error: 'Invalid credentials format. Please use a valid email.' };
  };

  const logout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const switchRoleDemo = (role: UserRole) => {
    const profile = DEMO_PERSONAS[role];
    setCurrentUser(profile);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        loginAs,
        loginWithCredentials,
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
