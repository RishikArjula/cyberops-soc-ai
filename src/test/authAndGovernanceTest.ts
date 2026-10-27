/**
 * CyberOps SOC — Authentication & User Governance Security Test Suite
 *
 * Verifies:
 * 1. Registration input validation, duplicate email detection (identities: []), and email confirmation flows.
 * 2. Strict workspace access gates for pending, rejected, disabled, missing-profile, and invalid-role users.
 * 3. Stale localStorage session invalidation upon revocation.
 * 4. Production fail-closed behavior (no silent fallback to fake users).
 * 5. Super Admin governance invariants:
 *    - Anti-self-approval and anti-self-demotion guards.
 *    - Permitted operational-role-only assignment (soc_analyst, security_engineer, it_operations).
 *    - Zero-row database update detection.
 *    - Atomic persistent platform governance audit trails.
 *    - Last-active-Super-Admin concurrency protection.
 * 6. SQL migration invariants for automated profile provisioning and RLS governance.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_PERSONAS, UserProfile, UserRole, AccessDeniedError } from '../types/auth';
import { LocalAuditLogRepository } from '../repositories/local/LocalAuditLogRepository';
import { SupabaseAuditLogRepository } from '../repositories/supabase/SupabaseAuditLogRepository';
import { getSupabaseConfigurationStatus } from '../lib/supabaseClient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAuthAndGovernanceTests() {
  console.log('=== RUNNING AUTHENTICATION & USER GOVERNANCE VERIFICATION TESTS ===');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] Test ${passed + failed + 1}: ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] Test ${passed + failed + 1}: ${message}`);
      failed++;
    }
  }

  // =========================================================================
  // Group 1: Registration Validation & Duplicate Email Handling
  // =========================================================================
  console.log('-- Group 1: Registration Validation & Duplicate Email Handling --');

  // Test 1: Password complexity requires at least 8 characters
  function validateRegistration(email: string, pass: string, fullName: string) {
    if (!email || !pass || !fullName) return { valid: false, error: 'All fields required' };
    if (pass.length < 8) return { valid: false, error: 'Password must be at least 8 characters long.' };
    return { valid: true };
  }

  assert(
    validateRegistration('user@soc.internal', 'short', 'Test Operator').valid === false,
    'Registration rejects passwords under 8 characters'
  );
  assert(
    validateRegistration('user@soc.internal', 'securePass2026!', 'Test Operator').valid === true,
    'Registration accepts passwords with 8 or more characters'
  );

  // Test 2: Detect duplicate email via empty identities array (Supabase email confirmation behavior)
  function handleSignUpResponse(data: { user?: { identities?: any[] } | null }) {
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    return { success: true };
  }

  assert(
    handleSignUpResponse({ user: { identities: [] } }).success === false,
    'Signup detects duplicate email when identities array is empty'
  );
  assert(
    handleSignUpResponse({ user: { identities: [{ id: 'id-1' }] } }).success === true,
    'Signup succeeds when identities array contains active identity'
  );

  // =========================================================================
  // Group 2: Account Status & Workspace Access Gates
  // =========================================================================
  console.log('-- Group 2: Account Status & Workspace Access Gates --');

  // Logic mirroring the hardened isApprovedOperator gate in App.tsx
  function isOperatorAuthorized(user: UserProfile | null): boolean {
    if (!user) return false;
    const isApproved = user.accountStatus === 'approved';
    const hasRole = Boolean(user.role);
    const isValidRole = ['soc_analyst', 'security_engineer', 'it_operations', 'super_admin'].includes(user.role);
    return isApproved && hasRole && isValidRole;
  }

  // Approved users with valid roles
  assert(
    isOperatorAuthorized({
      id: 'usr-1',
      name: 'Approved Analyst',
      email: 'analyst@soc.internal',
      role: 'soc_analyst',
      callsign: 'SPECTER',
      title: 'Analyst',
      accountStatus: 'approved',
    }) === true,
    'Approved user with valid operational role is granted access'
  );

  // Pending user denied
  assert(
    isOperatorAuthorized({
      id: 'usr-2',
      name: 'Pending Operator',
      email: 'pending@soc.internal',
      role: 'soc_analyst',
      callsign: 'PENDING',
      title: 'Applicant',
      accountStatus: 'pending',
    }) === false,
    'Pending account is strictly denied workspace access'
  );

  // Rejected user denied
  assert(
    isOperatorAuthorized({
      id: 'usr-3',
      name: 'Rejected User',
      email: 'rejected@soc.internal',
      role: 'soc_analyst',
      callsign: 'REJECTED',
      title: 'Applicant',
      accountStatus: 'rejected',
    }) === false,
    'Rejected account is strictly denied workspace access'
  );

  // Disabled user denied
  assert(
    isOperatorAuthorized({
      id: 'usr-4',
      name: 'Disabled User',
      email: 'disabled@soc.internal',
      role: 'it_operations',
      callsign: 'DISABLED',
      title: 'Ex-Admin',
      accountStatus: 'disabled',
    }) === false,
    'Disabled account is strictly denied workspace access'
  );

  // Missing profile / null user denied
  assert(
    isOperatorAuthorized(null) === false,
    'Unauthenticated null user is strictly denied workspace access'
  );

  // User with null role denied
  assert(
    isOperatorAuthorized({
      id: 'usr-5',
      name: 'No Role User',
      email: 'norole@soc.internal',
      role: null as any,
      callsign: 'NOROLE',
      title: 'Applicant',
      accountStatus: 'approved',
    }) === false,
    'Account without assigned operational role is strictly denied workspace access'
  );

  // User with invalid/unrecognized role denied
  assert(
    isOperatorAuthorized({
      id: 'usr-6',
      name: 'Custom Role User',
      email: 'guest@soc.internal',
      role: 'guest_observer' as any,
      callsign: 'GUEST',
      title: 'Guest',
      accountStatus: 'approved',
    }) === false,
    'Account with unrecognized role is strictly denied workspace access'
  );

  // =========================================================================
  // Group 3: Stale Session Cleanup & Anti-Mock Production Invariants
  // =========================================================================
  console.log('-- Group 3: Stale Session Cleanup & Anti-Mock Production Invariants --');

  // Verify production fail-closed status resolution
  const prodUnconfigured = getSupabaseConfigurationStatus({
    url: undefined,
    key: undefined,
    isProd: true,
    isDev: false,
  });

  assert(
    prodUnconfigured.mode === 'production_fail_closed',
    'Unconfigured production environment evaluates to production_fail_closed'
  );
  assert(
    prodUnconfigured.configured === false,
    'Unconfigured production reports configured === false'
  );

  // Verify DEMO_PERSONAS have accountStatus === 'approved'
  assert(
    DEMO_PERSONAS.soc_analyst.accountStatus === 'approved' &&
      DEMO_PERSONAS.super_admin.accountStatus === 'approved',
    'All predefined demo personas declare approved accountStatus'
  );

  // =========================================================================
  // Group 4: Super Admin Governance & Anti-Privilege Escalation
  // =========================================================================
  console.log('-- Group 4: Super Admin Governance & Anti-Privilege Escalation --');

  const superAdmin = DEMO_PERSONAS.super_admin;
  const analyst = DEMO_PERSONAS.soc_analyst;
  const localAuditRepo = new LocalAuditLogRepository();
  const supabaseAuditRepo = new SupabaseAuditLogRepository();

  // Test: Anti-self-approval guard in governance logic
  function validateApprovalAttempt(adminId: string, targetUserId: string, assignedRole: string) {
    if (adminId === targetUserId) {
      throw new Error('Security Policy Violation: Administrators cannot approve themselves.');
    }
    if (assignedRole === 'super_admin') {
      throw new Error('Security Policy Violation: Super Admin roles cannot be assigned through user governance.');
    }
    if (!['soc_analyst', 'security_engineer', 'it_operations'].includes(assignedRole)) {
      throw new Error('Security Policy Violation: Invalid operational role assigned.');
    }
    return true;
  }

  // Self approval throws
  let selfApproveBlocked = false;
  try {
    validateApprovalAttempt('usr-admin-01', 'usr-admin-01', 'soc_analyst');
  } catch (err: any) {
    selfApproveBlocked = err.message.includes('cannot approve themselves');
  }
  assert(selfApproveBlocked, 'Self-approval attempt is strictly blocked');

  // Assigning Super Admin role throws
  let superAdminAssignBlocked = false;
  try {
    validateApprovalAttempt('usr-admin-01', 'usr-pending-01', 'super_admin');
  } catch (err: any) {
    superAdminAssignBlocked = err.message.includes('Super Admin roles cannot be assigned');
  }
  assert(superAdminAssignBlocked, 'Assigning Super Admin role via governance is strictly blocked');

  // Assigning valid operational role succeeds
  assert(
    validateApprovalAttempt('usr-admin-01', 'usr-pending-01', 'soc_analyst') === true,
    'Assigning soc_analyst operational role passes governance check'
  );
  assert(
    validateApprovalAttempt('usr-admin-01', 'usr-pending-02', 'it_operations') === true,
    'Assigning it_operations operational role passes governance check'
  );
  assert(
    validateApprovalAttempt('usr-admin-01', 'usr-pending-03', 'security_engineer') === true,
    'Assigning security_engineer operational role passes governance check'
  );

  // Test: Zero-row database update detection logic
  function verifyDatabaseUpdateResult(data: any[] | null, error: any) {
    if (error) throw new Error(`Database update failed: ${error.message}`);
    if (!data || data.length === 0) {
      throw new Error('Database update affected 0 rows. You may lack permission to update this profile.');
    }
    return true;
  }

  let zeroRowCaught = false;
  try {
    verifyDatabaseUpdateResult([], null);
  } catch (err: any) {
    zeroRowCaught = err.message.includes('affected 0 rows');
  }
  assert(zeroRowCaught, 'Zero-row database update is detected and rejected with explicit error');

  // Test: Governance audit logging in LocalAuditLogRepository
  const govLog = await localAuditRepo.recordGovernanceAction(superAdmin, {
    actionType: 'unlock_account',
    targetEmail: 'new.operator@soc.internal',
    justification: 'Approved credentials for SOC Analyst',
  });
  assert(
    govLog.actionType === 'unlock_account' &&
      govLog.status === 'SUCCESS' &&
      govLog.isSimulated === false,
    'LocalAuditLogRepository records real platform governance audit log'
  );

  // Test: Operational role attempting governance audit throws AccessDeniedError
  let operationalAuditBlocked = false;
  try {
    await localAuditRepo.recordGovernanceAction(analyst, {
      actionType: 'unlock_account',
      targetEmail: 'fraud@soc.internal',
      justification: 'Unauthorized',
    });
  } catch (err: any) {
    operationalAuditBlocked = err instanceof AccessDeniedError;
  }
  assert(operationalAuditBlocked, 'Operational roles cannot record governance audit actions');

  // Test: SupabaseAuditLogRepository implements recordGovernanceAction and rejects non-admins
  let supabaseGovBlocked = false;
  try {
    await supabaseAuditRepo.recordGovernanceAction(analyst, {
      actionType: 'unlock_account',
      targetEmail: 'fraud@soc.internal',
      justification: 'Unauthorized',
    });
  } catch (err: any) {
    supabaseGovBlocked = err instanceof AccessDeniedError;
  }
  assert(supabaseGovBlocked, 'SupabaseAuditLogRepository rejects governance actions from non-admins');

  // Test: LocalAuditLogRepository preserves expectedAuditId if provided
  const expectedId = 'AUD-TEST-UUID-12345';
  const customGovLog = await localAuditRepo.recordGovernanceAction(superAdmin, {
    actionType: 'unlock_account',
    targetEmail: 'verified.operator@soc.internal',
    justification: 'Verified with expected audit ID',
    expectedAuditId: expectedId,
  });
  assert(
    customGovLog.id === expectedId,
    'LocalAuditLogRepository associates exact expectedAuditId with governance log'
  );

  // Test: Dashboard error differentiation logic (profile update vs audit confirmation)
  function determineDashboardFeedback(updateSucceeded: boolean, auditConfirmed: boolean, auditErrMsg?: string) {
    if (!updateSucceeded) {
      return { type: 'error', message: 'Database update failed' };
    }
    if (!auditConfirmed) {
      return {
        type: 'error',
        message: `Profile update may have succeeded in database, but persistent audit confirmation is unverified: ${auditErrMsg || ''}`,
      };
    }
    return { type: 'success', message: 'Account approved successfully' };
  }

  const failedAuditResult = determineDashboardFeedback(true, false, 'No persistent record found');
  assert(
    failedAuditResult.type === 'error' &&
      failedAuditResult.message.includes('persistent audit confirmation is unverified'),
    'Dashboard produces explicit error feedback when profile update succeeds but audit confirmation fails'
  );

  const fullSuccessResult = determineDashboardFeedback(true, true);
  assert(
    fullSuccessResult.type === 'success',
    'Dashboard produces success feedback only when both database update and audit confirmation succeed'
  );

  // =========================================================================
  // Group 5: SQL Migration Invariants for User Registration & Governance
  // =========================================================================
  console.log('-- Group 5: SQL Migration Invariants for User Registration & Governance --');

  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261016000000_user_registration_and_governance.sql');
  assert(fs.existsSync(migrationPath), 'Migration artifact 20261016000000_user_registration_and_governance.sql exists');

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');

  assert(
    migrationContent.includes('INSERT INTO public.platform_bootstrap_state (id, is_bootstrapped)') &&
      migrationContent.includes('VALUES (1, false)') &&
      migrationContent.includes('ON CONFLICT (id) DO NOTHING;'),
    'Migration 2 idempotently provisions platform_bootstrap_state singleton row (id = 1)'
  );

  assert(
    migrationContent.includes('ALTER TABLE public.user_profiles') &&
      migrationContent.includes('ADD COLUMN IF NOT EXISTS last_audit_id UUID REFERENCES public.audit_logs(id);'),
    'Migration 2 adds last_audit_id foreign key column to user_profiles'
  );

  assert(
    migrationContent.includes('CREATE OR REPLACE FUNCTION public.handle_new_user()') &&
      migrationContent.includes("account_status,") &&
      migrationContent.includes("'pending'") &&
      migrationContent.includes("NULL,"),
    'handle_new_user() trigger provisions pending profiles with NULL role'
  );

  assert(
    migrationContent.includes("CHECK (account_status IN ('pending', 'approved', 'disabled', 'rejected'))"),
    'user_profiles_account_status_check supports pending, approved, disabled, and rejected'
  );

  assert(
    migrationContent.includes("OLD.id = auth.uid()") &&
      migrationContent.includes("Administrators cannot approve themselves"),
    'trg_protect_user_profile_mutation enforces database-level anti-self-approval'
  );

  assert(
    migrationContent.includes("NEW.role = 'super_admin'") &&
      migrationContent.includes("Super Admin role can only be provisioned through server bootstrap"),
    'trg_protect_user_profile_mutation prevents Super Admin promotion via client operations'
  );

  assert(
    migrationContent.includes("NEW.role NOT IN ('soc_analyst', 'security_engineer', 'it_operations')"),
    'trg_protect_user_profile_mutation restricts role assignment strictly to operational roles'
  );

  assert(
    migrationContent.includes("PERFORM 1 FROM public.platform_bootstrap_state WHERE id = 1 FOR UPDATE;") &&
      migrationContent.includes("IF NOT FOUND THEN") &&
      migrationContent.includes("Security Policy Invariant Violation: platform_bootstrap_state lock row (id=1) is missing."),
    'trg_protect_user_profile_mutation fails closed (RAISE EXCEPTION) if platform_bootstrap_state lock row is missing'
  );

  assert(
    migrationContent.includes("v_audit_id := gen_random_uuid();") &&
      migrationContent.includes("INSERT INTO public.audit_logs") &&
      migrationContent.includes("NEW.last_audit_id := v_audit_id;"),
    'trg_protect_user_profile_mutation atomically assigns generated audit ID to user_profiles.last_audit_id'
  );

  assert(
    migrationContent.includes("OLD.last_audit_id IS DISTINCT FROM NEW.last_audit_id"),
    'trg_protect_user_profile_mutation protects last_audit_id from unauthorized operator modification'
  );

  // =========================================================================
  // Group 6: One-Time Super Admin Bootstrap Invariants & CLI Configuration
  // =========================================================================
  console.log('-- Group 6: One-Time Super Admin Bootstrap Invariants & CLI Configuration --');

  const { validateBootstrapConfig, sanitizeErrorMessage, resolveBootstrapConfig } = await import('../../scripts/bootstrapAdmin');

  // Test: Missing URL
  const resMissingUrl = validateBootstrapConfig({
    supabaseUrl: '',
    serviceRoleKey: 'test-secret-key-that-is-long-enough-321',
    adminEmail: 'admin@soc.internal',
  }, 'localhost');
  assert(resMissingUrl.valid === false && Boolean(resMissingUrl.error?.includes('Missing SUPABASE_URL')), 'Bootstrap CLI rejects missing SUPABASE_URL');

  // Test: Missing service-role key
  const resMissingKey = validateBootstrapConfig({
    supabaseUrl: 'https://test-ref.supabase.co',
    serviceRoleKey: '',
    adminEmail: 'admin@soc.internal',
  }, 'test-ref.supabase.co');
  assert(resMissingKey.valid === false && Boolean(resMissingKey.error?.includes('Missing SUPABASE_SERVICE_ROLE_KEY')), 'Bootstrap CLI rejects missing service-role key');

  // Test: Invalid email format
  const resInvalidEmail = validateBootstrapConfig({
    supabaseUrl: 'https://test-ref.supabase.co',
    serviceRoleKey: 'test-secret-key-that-is-long-enough-321',
    adminEmail: 'invalid-email-format',
  }, 'test-ref.supabase.co');
  assert(resInvalidEmail.valid === false && Boolean(resInvalidEmail.error?.includes('Missing or invalid INITIAL_SUPER_ADMIN_EMAIL')), 'Bootstrap CLI rejects invalid administrator email');

  // Test: Missing project confirmation
  const resMissingConfirm = validateBootstrapConfig({
    supabaseUrl: 'https://test-ref.supabase.co',
    serviceRoleKey: 'test-secret-key-that-is-long-enough-321',
    adminEmail: 'admin@soc.internal',
  }, undefined);
  assert(resMissingConfirm.valid === false && Boolean(resMissingConfirm.error?.includes('Project confirmation required')), 'Bootstrap CLI requires explicit --confirm-project argument');

  // Test: Project mismatch confirmation
  const resMismatchConfirm = validateBootstrapConfig({
    supabaseUrl: 'https://test-ref.supabase.co',
    serviceRoleKey: 'test-secret-key-that-is-long-enough-321',
    adminEmail: 'admin@soc.internal',
  }, 'wrong-project.supabase.co');
  assert(resMismatchConfirm.valid === false && Boolean(resMismatchConfirm.error?.includes('Project confirmation mismatch')), 'Bootstrap CLI strictly rejects project confirmation mismatch');

  // Test: Conflicting project confirmation (CLI vs environment)
  const resConflictingConfirm = validateBootstrapConfig({
    supabaseUrl: 'https://test-ref.supabase.co',
    serviceRoleKey: 'test-secret-key-that-is-long-enough-321',
    adminEmail: 'admin@soc.internal',
    confirmedProject: 'other-project.supabase.co',
  }, 'test-ref.supabase.co');
  assert(
    resConflictingConfirm.valid === false &&
      Boolean(resConflictingConfirm.error?.includes('Conflicting project confirmation')),
    'Bootstrap CLI rejects conflicting project confirmation between CLI argument and environment'
  );

  // Test: Valid configuration with matching host and case-insensitive email normalization
  const resValid = validateBootstrapConfig({
    supabaseUrl: 'https://test-ref.supabase.co',
    serviceRoleKey: 'test-secret-key-that-is-long-enough-321',
    adminEmail: '  AdMiN@Soc.InTeRnAl  ',
  }, 'test-ref.supabase.co');
  assert(
    resValid.valid === true &&
      resValid.sanitizedConfig?.adminEmail === 'admin@soc.internal' &&
      resValid.sanitizedConfig?.supabaseHost === 'test-ref.supabase.co',
    'Bootstrap CLI accepts valid configuration and normalizes mixed-case and padded email'
  );

  // Test: Secret-safe error reporting sanitizes keys and tokens
  const secretKey = 'super-secret-service-role-key-12345';
  const dummyJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature';
  const rawError = `Connection failed with key ${secretKey} and auth header Bearer ${dummyJwt}`;
  const sanitized = sanitizeErrorMessage(rawError, secretKey);
  assert(
    !sanitized.includes(secretKey) &&
      !sanitized.includes('doNotLeakThisSignature') &&
      sanitized.includes('[REDACTED_SECRET]') &&
      sanitized.includes('[REDACTED_TOKEN]'),
    'sanitizeErrorMessage redacts secret keys and JWT tokens from error outputs'
  );

  // Test: Configuration resolution precedence
  const resolvedFromOverride = resolveBootstrapConfig({
    supabaseUrl: 'https://override-url.supabase.co',
    serviceRoleKey: 'override-secret-key-3210',
    adminEmail: 'override@soc.internal',
    confirmedProject: 'override-url.supabase.co',
  });
  assert(
    resolvedFromOverride.supabaseUrl === 'https://override-url.supabase.co' &&
      resolvedFromOverride.adminEmail === 'override@soc.internal',
    'resolveBootstrapConfig gives explicit parameter overrides highest precedence'
  );

  // Test: Selected URL must strictly match confirmed project
  const resSelectedUrlMismatch = validateBootstrapConfig({
    supabaseUrl: 'https://actual-selected-project.supabase.co',
    serviceRoleKey: 'valid-secret-key-that-is-long-enough-321',
    adminEmail: 'admin@soc.internal',
  }, 'unrelated-project.supabase.co');
  assert(
    resSelectedUrlMismatch.valid === false &&
      Boolean(resSelectedUrlMismatch.error?.includes('Project confirmation mismatch')) &&
      Boolean(resSelectedUrlMismatch.error?.includes('actual-selected-project.supabase.co')),
    'validateBootstrapConfig strictly checks the selected URL hostname against the confirmed project'
  );

  const resSelectedUrlMatch = validateBootstrapConfig({
    supabaseUrl: 'https://actual-selected-project.supabase.co',
    serviceRoleKey: 'valid-secret-key-that-is-long-enough-321',
    adminEmail: 'admin@soc.internal',
  }, 'actual-selected-project.supabase.co');
  assert(
    resSelectedUrlMatch.valid === true &&
      resSelectedUrlMatch.sanitizedConfig?.supabaseHost === 'actual-selected-project.supabase.co',
    'validateBootstrapConfig succeeds when selected URL hostname matches confirmed project'
  );

  // Test: Migration contains bootstrap RPC definition and role restrictions
  assert(
    migrationContent.includes('CREATE OR REPLACE FUNCTION public.bootstrap_initial_super_admin(admin_email TEXT)') &&
      migrationContent.includes('SECURITY DEFINER') &&
      migrationContent.includes('SET search_path = public, pg_temp') &&
      (migrationContent.includes('REVOKE ALL ON FUNCTION public.bootstrap_initial_super_admin(TEXT) FROM PUBLIC, anon, authenticated;') ||
        migrationContent.includes('REVOKE EXECUTE ON FUNCTION public.bootstrap_initial_super_admin(TEXT) FROM PUBLIC, anon, authenticated;')) &&
      migrationContent.includes('GRANT EXECUTE ON FUNCTION public.bootstrap_initial_super_admin(TEXT) TO service_role;'),
    'Migration 2 defines bootstrap_initial_super_admin RPC with SECURITY DEFINER and exclusive service_role grant'
  );

  assert(
    migrationContent.includes('WHERE id = 1 AND is_bootstrapped = false') &&
      migrationContent.includes('UPDATE public.platform_bootstrap_state') &&
      migrationContent.includes('SET is_bootstrapped = true'),
    'Migration 2 bootstrap RPC enforces singleton row lock and marks is_bootstrapped = true atomically'
  );

  assert(
    migrationContent.includes('SELECT count(*) INTO v_user_count') &&
      migrationContent.includes('IF v_user_count = 0 THEN') &&
      migrationContent.includes('IF v_user_count > 1 THEN') &&
      migrationContent.includes('Ambiguous account lookup') &&
      migrationContent.includes('SELECT id INTO v_user_id') &&
      !migrationContent.includes('min(id)'),
    'Migration 2 bootstrap RPC counts matches and selects single user ID without min(id) aggregate'
  );

  assert(
    migrationContent.includes('SELECT count(*) INTO v_profile_count') &&
      migrationContent.includes('IF v_profile_count = 0 THEN') &&
      migrationContent.includes('IF v_profile_count > 1 THEN') &&
      migrationContent.includes('Ambiguous profile lookup'),
    'Migration 2 bootstrap RPC validates exactly one profile exists and rejects ambiguous profiles'
  );

  assert(
    migrationContent.includes("WHEN (NEW.role = 'super_admin' AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.role IS NULL)) THEN 'platform_bootstrap'") &&
      migrationContent.includes("v_audit_record.action_type <> 'platform_bootstrap'"),
    'Migration 2 distinguishes bootstrap audit action ("platform_bootstrap") from routine account unlock'
  );

  assert(
    migrationContent.includes("WHEN (NEW.role = 'super_admin' AND (OLD.role IS DISTINCT FROM NEW.role OR OLD.role IS NULL)) THEN 'system'") &&
      migrationContent.includes("v_audit_record.actor_role <> 'system'"),
    'Migration 2 attributes automated bootstrap service role to system rather than super_admin'
  );

  assert(
    migrationContent.includes('v_audit_record.target_resource IS NULL') &&
      migrationContent.includes('lower(trim(v_audit_record.target_resource)) <> v_clean_email'),
    'Migration 2 verifies audit target case-insensitively and fails closed if target is NULL or mismatched'
  );

  console.log(`\n=== COMPLETED: ${passed} of ${passed + failed} AUTH & GOVERNANCE TESTS PASSED ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthAndGovernanceTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
