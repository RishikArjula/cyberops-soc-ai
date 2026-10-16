/**
 * CyberOps SOC — SQL Migration Security Invariants Verification
 *
 * Statically analyzes supabase/migrations/20261015000000_initial_cyberops_soc_schema.sql,
 * supabase/seed.sql, and supabase/rollback_strategy.sql.
 *
 * Verifies:
 * 1. Schema object definitions & RLS activation across all tables
 * 2. Super Admin isolation from operational alerts, notes, and tasks
 * 3. IT Operations scoped record access
 * 4. Anti-self-approval and last active Super Admin triggers
 * 5. Immutable WORM audit logs and notes
 * 6. Hardened SECURITY DEFINER search_path settings
 * 7. Absence of destructive DROP TABLE ... CASCADE commands
 * 8. Zero demo mock personas or fake alerts in seed data
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

function runSqlMigrationSecurityTests() {
  console.log('=== RUNNING SQL MIGRATION SECURITY INVARIANTS TESTS ===');
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

  const migrationPath = path.resolve(rootDir, 'supabase/migrations/20261015000000_initial_cyberops_soc_schema.sql');
  const seedPath = path.resolve(rootDir, 'supabase/seed.sql');
  const rollbackPath = path.resolve(rootDir, 'supabase/rollback_strategy.sql');

  assert(fs.existsSync(migrationPath), 'Migration artifact 20261015000000_initial_cyberops_soc_schema.sql exists');
  assert(fs.existsSync(seedPath), 'Seed artifact seed.sql exists');
  assert(fs.existsSync(rollbackPath), 'Rollback artifact rollback_strategy.sql exists');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

  // Helper to strip single-line SQL comments
  const stripComments = (sql: string) => sql.replace(/--.*$/gm, '');

  // Helper to extract a policy chunk
  function extractPolicyBlock(sql: string, policyName: string): string {
    const startIndex = sql.indexOf(policyName);
    if (startIndex === -1) return '';
    const endIndex = sql.indexOf(';', startIndex);
    return sql.slice(startIndex, endIndex !== -1 ? endIndex : undefined);
  }

  // --- Group 1: Required Database Objects & RLS Activation ---
  console.log('-- Group 1: Required Database Objects & RLS Activation --');

  const requiredTables = [
    'user_profiles',
    'alerts',
    'alert_notes',
    'incident_tasks',
    'audit_logs',
    'platform_bootstrap_state',
  ];

  for (const table of requiredTables) {
    assert(
      migrationSql.includes(`CREATE TABLE IF NOT EXISTS public.${table}`),
      `Table public.${table} is defined with CREATE TABLE IF NOT EXISTS`
    );
    assert(
      migrationSql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
      `Table public.${table} has Row-Level Security (RLS) explicitly enabled`
    );
  }

  // --- Group 2: Role Isolation & Least Privilege Policies ---
  console.log('-- Group 2: Role Isolation & Least Privilege Policies --');

  // Super Admin operational isolation in alerts_select_policy
  const alertsSelectBlock = stripComments(extractPolicyBlock(migrationSql, 'alerts_select_policy'));
  assert(
    alertsSelectBlock.includes("public.get_user_role() IN ('soc_analyst', 'security_engineer')") &&
      !alertsSelectBlock.includes('super_admin'),
    'alerts_select_policy isolates Super Admin by strictly omitting super_admin from permitted roles'
  );

  // Investigation notes isolation in notes_select_policy
  const notesSelectBlock = stripComments(extractPolicyBlock(migrationSql, 'notes_select_policy'));
  assert(
    notesSelectBlock.includes("public.get_user_role() = 'soc_analyst'") &&
      !notesSelectBlock.includes('super_admin') &&
      !notesSelectBlock.includes('security_engineer') &&
      !notesSelectBlock.includes('it_operations'),
    'notes_select_policy restricts investigation notes strictly to soc_analyst'
  );

  // Incident tasks isolation in tasks_select_policy
  const tasksSelectBlock = stripComments(extractPolicyBlock(migrationSql, 'tasks_select_policy'));
  assert(
    tasksSelectBlock.includes("public.get_user_role() = 'soc_analyst'") &&
      tasksSelectBlock.includes("assigned_role = 'security_engineer'") &&
      tasksSelectBlock.includes("assigned_role = 'it_operations'") &&
      !tasksSelectBlock.includes('super_admin'),
    'tasks_select_policy isolates Super Admin from incident remediation tasks'
  );

  // IT Operations scoped access with caller role & approval checks
  assert(
    migrationSql.includes('get_it_ops_assigned_alert_ids') &&
      migrationSql.includes('public.get_it_ops_assigned_alert_ids()') &&
      migrationSql.includes('public.is_approved() = true') &&
      migrationSql.includes("public.get_user_role() = 'it_operations'"),
    'IT Operations alert access is strictly scoped via get_it_ops_assigned_alert_ids() with caller role and approval enforcement'
  );

  // Audit log segregation
  assert(
    migrationSql.includes("audit_category = 'platform' AND public.get_user_role() = 'super_admin'") &&
      migrationSql.includes("audit_category = 'operational' AND public.get_user_role() IN ('soc_analyst', 'security_engineer', 'it_operations')"),
    'audit_logs RLS segregates platform audit logs from operational logs'
  );

  // --- Group 3: Integrity Triggers & Anti-Tampering ---
  console.log('-- Group 3: Integrity Triggers & Anti-Tampering --');

  assert(
    migrationSql.includes('chk_anti_self_approval CHECK (approved_by IS NULL OR approved_by <> id)'),
    'user_profiles enforces anti-self-approval check constraint'
  );

  assert(
    migrationSql.includes('Administrators cannot approve themselves or alter their own roles') &&
      migrationSql.includes('OLD.id = auth.uid()'),
    'trg_protect_user_profile_mutation trigger blocks self-approval and self-promotion'
  );

  assert(
    migrationSql.includes('Operators may only update cosmetic profile details') &&
      migrationSql.includes('OLD.email IS DISTINCT FROM NEW.email') &&
      migrationSql.includes('OLD.approved_by IS DISTINCT FROM NEW.approved_by'),
    'trg_protect_user_profile_mutation restricts non-admin profile mutations strictly to cosmetic fields'
  );

  assert(
    migrationSql.includes('trg_protect_incident_task_mutation') &&
      migrationSql.includes('Operators may only update status and completion details on assigned tasks') &&
      migrationSql.includes('OLD.assigned_role IS DISTINCT FROM NEW.assigned_role') &&
      migrationSql.includes('OLD.associated_alert_id IS DISTINCT FROM NEW.associated_alert_id'),
    'trg_protect_incident_task_mutation restricts IT Ops and Security Engineers from modifying task identity, role, or alert linkage'
  );

  assert(
    migrationSql.includes('Cannot demote or disable the last active Super Admin') &&
      migrationSql.includes('active_admin_count < 1'),
    'trg_protect_user_profile_mutation trigger protects last Super Admin from demotion or disabling'
  );

  assert(
    migrationSql.includes('Cannot delete the last active Super Admin') &&
      migrationSql.includes('trg_protect_admin_deletion'),
    'trg_protect_admin_deletion trigger protects last Super Admin from deletion'
  );

  // Group 3.1: Concurrency Serialization Protocol
  const mutationTriggerBlock = extractPolicyBlock(migrationSql, 'trg_protect_user_profile_mutation');
  assert(
    migrationSql.includes('PERFORM 1 FROM public.platform_bootstrap_state WHERE id = 1 FOR UPDATE;') &&
      (migrationSql.match(/PERFORM 1 FROM public\.platform_bootstrap_state WHERE id = 1 FOR UPDATE;/g) || []).length === 2,
    'Consistent exclusive locking protocol (FOR UPDATE on platform_bootstrap_state) is enforced in both mutation and deletion trigger paths'
  );

  // Group 3.2: Hardened Audit Log Insert Authorization (Operational-Only for Authenticated Users)
  const auditInsertBlock = stripComments(extractPolicyBlock(migrationSql, 'audit_insert_policy'));
  assert(
    auditInsertBlock.includes("audit_category = 'operational'") &&
      auditInsertBlock.includes("public.get_user_role() IN ('soc_analyst', 'security_engineer', 'it_operations')") &&
      !auditInsertBlock.includes("audit_category = 'platform'"),
    'audit_insert_policy restricts authenticated clients strictly to operational events and forbids direct platform event creation'
  );

  assert(
    migrationSql.includes('audit_service_insert_policy') &&
      migrationSql.includes('FOR INSERT TO service_role'),
    'audit_service_insert_policy allows trusted server-side creation of audit logs via service_role'
  );

  assert(
    migrationSql.includes('trg_audit_logs_immutable_upd') &&
      migrationSql.includes('trg_audit_logs_immutable_del') &&
      migrationSql.includes('Audit log entries are strictly append-only'),
    'audit_logs enforces WORM immutability triggers against UPDATE and DELETE'
  );

  assert(
    migrationSql.includes('trg_notes_immutable_upd') &&
      migrationSql.includes('trg_notes_immutable_del') &&
      migrationSql.includes('Analyst notes are immutable'),
    'alert_notes enforces WORM immutability triggers against UPDATE and DELETE'
  );

  // Group 3.3: Explicit Table-Level Least-Privilege Grants & Revokes
  assert(
    migrationSql.includes('REVOKE ALL ON public.platform_bootstrap_state FROM anon, public;') &&
      migrationSql.includes('REVOKE ALL ON public.audit_logs FROM anon, public;') &&
      migrationSql.includes('GRANT SELECT ON public.platform_bootstrap_state TO anon;') &&
      migrationSql.includes('GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;') &&
      !migrationSql.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;') &&
      !migrationSql.includes('profiles_delete_policy') &&
      migrationSql.includes('GRANT SELECT, INSERT ON public.audit_logs TO authenticated;'),
    'Explicit least-privilege table grants revoke all from anon and restrict authenticated operations'
  );

  // --- Group 4: Function Hardening & Non-Destructive Safety ---
  console.log('-- Group 4: Function Hardening & Non-Destructive Safety --');

  // Strip SQL single-line comments (-- ...) to count executable statements
  const cleanMigrationSql = stripComments(migrationSql);
  const cleanSeedSql = stripComments(seedSql);
  const cleanRollbackSql = stripComments(rollbackSql);

  const definerStatements = cleanMigrationSql.match(/LANGUAGE\s+(?:sql|plpgsql)\s+.*?SECURITY DEFINER/gi) || [];
  const searchPathStatements = cleanMigrationSql.match(/SET search_path = public, pg_temp;/g) || [];

  assert(
    definerStatements.length === 10 && definerStatements.length === searchPathStatements.length,
    `Every SECURITY DEFINER function (${definerStatements.length}) explicitly sets search_path = public, pg_temp`
  );

  assert(
    migrationSql.includes('REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM public, anon;'),
    'Helper functions revoke execute grants from public and anon'
  );

  // Verify non-destructive rules: zero executable DROP TABLE or DROP SCHEMA statements
  const dropTableRegex = /^\s*DROP\s+(?:TABLE|SCHEMA)\b/im;
  assert(
    !dropTableRegex.test(cleanMigrationSql),
    'Migration script contains ZERO executable DROP TABLE or DROP SCHEMA statements'
  );

  assert(
    !dropTableRegex.test(cleanSeedSql),
    'Seed script contains ZERO executable DROP TABLE or DROP SCHEMA statements'
  );

  assert(
    !dropTableRegex.test(cleanRollbackSql),
    'Rollback strategy contains ZERO executable DROP TABLE or DROP SCHEMA statements'
  );

  // Seed safety (zero mock data)
  assert(
    !seedSql.includes('alex.mercer@soc.internal') &&
      !seedSql.includes('ALT-2026-1049') &&
      !seedSql.includes('usr-analyst-01'),
    'Seed script contains ZERO mock demo personas or synthetic alerts'
  );

  assert(
    seedSql.includes('public.platform_bootstrap_state') &&
      seedSql.includes('is_bootstrapped') &&
      seedSql.includes('false'),
    'Seed script initializes platform_bootstrap_state with is_bootstrapped = false'
  );

  console.log(`\n=== COMPLETED: ${passed} of ${passed + failed} SQL MIGRATION SECURITY TESTS PASSED ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSqlMigrationSecurityTests();
