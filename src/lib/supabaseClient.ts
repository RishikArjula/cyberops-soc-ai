/**
 * CyberOps SOC — Supabase Browser Client
 *
 * Provides a typed Supabase client configured strictly with public Vite environment variables.
 *
 * Security & Environment Safeguards:
 * 1. Reads ONLY public VITE_SUPABASE_URL and public client key variables
 *    (VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY).
 * 2. Deterministic precedence: VITE_SUPABASE_ANON_KEY takes precedence over
 *    VITE_SUPABASE_PUBLISHABLE_KEY if both are configured (preserving backward compatibility).
 * 3. Supports both modern Supabase publishable keys (sb_publishable_...) and legacy anon JWTs (eyJ...).
 * 4. Never accesses or imports server-side secrets (e.g. SUPABASE_SERVICE_ROLE_KEY).
 * 5. In production builds (import.meta.env.PROD), missing or placeholder configuration
 *    fails closed to prevent unauthorized fallback to unauthenticated demo personas.
 * 6. In development builds (import.meta.env.DEV), missing configuration safely indicates
 *    that development/demo mode may be utilized by local repositories.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawEnv = typeof import.meta !== 'undefined' ? (import.meta.env as Record<string, string | boolean | undefined> | undefined) : undefined;
const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;

const rawAnonKey = rawEnv?.VITE_SUPABASE_ANON_KEY as string | undefined;
const rawPublishableKey = rawEnv?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const nodeAnonKey = nodeEnv?.VITE_SUPABASE_ANON_KEY;
const nodePublishableKey = nodeEnv?.VITE_SUPABASE_PUBLISHABLE_KEY;

const effectiveAnonKey = rawAnonKey ?? nodeAnonKey;
const effectivePublishableKey = rawPublishableKey ?? nodePublishableKey;

const supabaseUrl = (rawEnv?.VITE_SUPABASE_URL as string | undefined) ?? nodeEnv?.VITE_SUPABASE_URL;

/**
 * Resolves the public Supabase key from provided environment variables using deterministic precedence:
 * 1. Explicit anonKey (or VITE_SUPABASE_ANON_KEY) takes precedence for backward compatibility.
 * 2. Explicit publishableKey (or VITE_SUPABASE_PUBLISHABLE_KEY) is used if anon key is absent/empty.
 */
export function resolveSupabaseKey(
  anonKey?: string,
  publishableKey?: string
): string | undefined {
  if (anonKey && anonKey.trim() !== '') {
    return anonKey.trim();
  }
  if (publishableKey && publishableKey.trim() !== '') {
    return publishableKey.trim();
  }
  return undefined;
}

const supabaseKey = resolveSupabaseKey(effectiveAnonKey, effectivePublishableKey);

const isDev = Boolean(rawEnv?.DEV ?? (nodeEnv?.NODE_ENV !== 'production'));
const isProd = Boolean(rawEnv?.PROD ?? (nodeEnv?.NODE_ENV === 'production'));

/**
 * Checks whether valid, non-placeholder Supabase configuration is present.
 * Accepts both legacy anon JWT keys and modern Supabase publishable keys (sb_publishable_...).
 */
export function isSupabaseConfigured(
  url: string | undefined = supabaseUrl,
  key: string | undefined = supabaseKey
): boolean {
  if (!url || !key) {
    return false;
  }

  const cleanUrl = url.trim();
  const cleanKey = key.trim();

  // Validate that default example placeholders were not left unedited
  if (
    cleanUrl.includes('your-project-id') ||
    cleanKey.includes('your-anon-public-key') ||
    cleanKey.includes('your-publishable-key') ||
    cleanUrl === '' ||
    cleanKey === ''
  ) {
    return false;
  }

  try {
    const parsed = new URL(cleanUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type SupabaseRuntimeMode = 'live_supabase' | 'development_demo' | 'production_fail_closed';

export interface SupabaseConfigStatus {
  configured: boolean;
  environment: 'development' | 'production';
  mode: SupabaseRuntimeMode;
  message: string;
}

export interface SupabaseEnvOverrides {
  url?: string;
  key?: string;
  anonKey?: string;
  publishableKey?: string;
  isProd?: boolean;
  isDev?: boolean;
}

/**
 * Evaluates the current configuration status and safe operating mode.
 */
export function getSupabaseConfigurationStatus(overrides?: SupabaseEnvOverrides): SupabaseConfigStatus {
  const targetUrl = overrides?.url !== undefined ? overrides.url : supabaseUrl;

  let targetKey: string | undefined;
  if (overrides?.key !== undefined) {
    targetKey = overrides.key;
  } else if (overrides?.anonKey !== undefined || overrides?.publishableKey !== undefined) {
    targetKey = resolveSupabaseKey(overrides.anonKey, overrides.publishableKey);
  } else {
    targetKey = supabaseKey;
  }

  const targetIsProd = overrides?.isProd !== undefined ? overrides.isProd : isProd;
  const targetIsDev = overrides?.isDev !== undefined ? overrides.isDev : isDev;

  const configured = isSupabaseConfigured(targetUrl, targetKey);

  if (configured) {
    return {
      configured: true,
      environment: targetIsProd ? 'production' : 'development',
      mode: 'live_supabase',
      message: 'Supabase client is configured for live authentication and data persistence.',
    };
  }

  if (targetIsDev && !targetIsProd) {
    return {
      configured: false,
      environment: 'development',
      mode: 'development_demo',
      message: 'Supabase credentials not detected. Development/demo mode remains active for local testing.',
    };
  }

  return {
    configured: false,
    environment: 'production',
    mode: 'production_fail_closed',
    message: 'SECURITY ERROR: Supabase configuration is missing or invalid in production. Operational access is locked.',
  };
}

// Client initialization
let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  clientInstance = createClient(supabaseUrl!, supabaseKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else if (isDev) {
  console.info(
    '[CyberOps SOC] Notice: Supabase configuration is unconfigured. Development/demo mode remains active.'
  );
} else if (isProd) {
  console.error(
    '[CyberOps SOC] CRITICAL: Missing required Supabase configuration in production. Failing closed.'
  );
}

/**
 * Accesses the initialized Supabase client.
 * In production without credentials, throws an explicit security error (fail-closed).
 */
export function getSupabaseClient(): SupabaseClient {
  if (clientInstance) {
    return clientInstance;
  }

  if (isProd) {
    throw new Error(
      '[CyberOps SOC Security Error] Production build requires valid VITE_SUPABASE_URL and public client key (VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY). Failing closed.'
    );
  }

  throw new Error(
    '[CyberOps SOC Notice] Supabase client requested but credentials are not configured. Development mode should use local repositories.'
  );
}

export const supabase = clientInstance;
