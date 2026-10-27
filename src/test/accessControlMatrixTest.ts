/**
 * Access Control Matrix Audit & Regression Test Suite
 *
 * Verifies:
 * 1. Completeness: All 17 defined system permissions are represented exactly once in ALL_PERMISSIONS.
 * 2. Workspace View Coverage: All 10 views are represented in ALL_WORKSPACE_VIEWS and match ROLE_AUTHORIZED_VIEWS.
 * 3. Default Landing Symmetry: Default landing views match AuthorizationService.ROLE_DEFAULT_VIEW for all 4 roles.
 * 4. Policy Fidelity: Granted permissions in the matrix match ROLE_PERMISSIONS for every role.
 * 5. Super Admin Isolation: Super Admin possesses zero operational triage, investigation, playbook, or telemetry permissions.
 * 6. Role Capability Boundaries: Validates least-privilege role boundaries across all operational roles.
 */

import {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  ROLE_METADATA,
} from '../types/auth';
import {
  AuthorizationService,
} from '../services/authorizationService';
import {
  ALL_WORKSPACE_VIEWS,
  ALL_PERMISSIONS,
} from '../components/admin/AccessControlMatrix';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

export async function runAccessControlMatrixTests(): Promise<{
  passed: number;
  total: number;
  logs: string[];
}> {
  const logs: string[] = [];
  let passed = 0;
  let total = 0;

  function test(description: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      logs.push(`  [PASS] Test ${total}: ${description}`);
    } catch (err: any) {
      logs.push(`  [FAIL] Test ${total}: ${description} -> ${err.message}`);
      throw err;
    }
  }

  logs.push('=== RUNNING ACCESS CONTROL MATRIX AUDIT TESTS ===');

  const EXPECTED_ROLES: UserRole[] = [
    'soc_analyst',
    'security_engineer',
    'it_operations',
    'super_admin',
  ];

  const EXPECTED_PERMISSIONS: Permission[] = [
    'alert:read',
    'alert:triage',
    'alert:escalate',
    'alert:add_note',
    'alert:read_scoped_only',
    'notes:read_private',
    'incident:read',
    'incident:update',
    'mitre:read',
    'mitre:analyze_coverage',
    'action:propose',
    'action:authorize_simulated',
    'telemetry:read',
    'audit:read',
    'audit:export',
    'platform:admin',
    'platform:health_read',
  ];

  const EXPECTED_VIEWS = [
    'overview',
    'alerts',
    'investigations',
    'playbooks',
    'mitre',
    'tasks',
    'network',
    'audit',
    'profile',
    'admin',
  ];

  // -------------------------------------------------------------------------
  // 1. Permission Completeness & Deduplication
  // -------------------------------------------------------------------------
  test('ALL_PERMISSIONS contains exactly 17 permissions', () => {
    assert(
      ALL_PERMISSIONS.length === 17,
      `Expected 17 permissions in ALL_PERMISSIONS, found ${ALL_PERMISSIONS.length}`
    );
  });

  test('All 17 canonical Permission types are present without duplicates', () => {
    const presentIds = new Set(ALL_PERMISSIONS.map((p) => p.id));
    assert(
      presentIds.size === 17,
      `Duplicate permission IDs found: ${ALL_PERMISSIONS.length} vs ${presentIds.size} unique`
    );

    for (const expectedPerm of EXPECTED_PERMISSIONS) {
      assert(
        presentIds.has(expectedPerm),
        `Missing expected permission: ${expectedPerm}`
      );
    }
  });

  test('Every permission in ALL_PERMISSIONS has a non-empty name, category, and description', () => {
    for (const perm of ALL_PERMISSIONS) {
      assert(perm.name.trim().length > 0, `Permission ${perm.id} has empty name`);
      assert(perm.category.trim().length > 0, `Permission ${perm.id} has empty category`);
      assert(perm.description.trim().length > 0, `Permission ${perm.id} has empty description`);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Workspace View Completeness & Alignment
  // -------------------------------------------------------------------------
  test('ALL_WORKSPACE_VIEWS contains exactly 10 views', () => {
    assert(
      ALL_WORKSPACE_VIEWS.length === 10,
      `Expected 10 views in ALL_WORKSPACE_VIEWS, found ${ALL_WORKSPACE_VIEWS.length}`
    );
  });

  test('All 10 expected workspace views are present without duplicates', () => {
    const presentViews = new Set(ALL_WORKSPACE_VIEWS.map((v) => v.id));
    assert(
      presentViews.size === 10,
      `Duplicate view IDs found: ${ALL_WORKSPACE_VIEWS.length} vs ${presentViews.size} unique`
    );

    for (const expectedView of EXPECTED_VIEWS) {
      assert(
        presentViews.has(expectedView),
        `Missing expected workspace view: ${expectedView}`
      );
    }
  });

  test('Every view in ALL_WORKSPACE_VIEWS has valid category and description', () => {
    for (const view of ALL_WORKSPACE_VIEWS) {
      assert(view.name.trim().length > 0, `View ${view.id} has empty name`);
      assert(['Operations', 'Engineering', 'Governance', 'Shared'].includes(view.category), `View ${view.id} has invalid category: ${view.category}`);
      assert(view.description.trim().length > 0, `View ${view.id} has empty description`);
    }
  });

  // -------------------------------------------------------------------------
  // 3. View Authorization Matrix Symmetry with ROLE_AUTHORIZED_VIEWS
  // -------------------------------------------------------------------------
  test('Role view authorizations in matrix match ROLE_AUTHORIZED_VIEWS for all 4 roles', () => {
    for (const role of EXPECTED_ROLES) {
      const authorizedViewsInService = AuthorizationService.ROLE_AUTHORIZED_VIEWS[role];
      for (const view of ALL_WORKSPACE_VIEWS) {
        const isAuthorizedByService = AuthorizationService.isViewAuthorized(role, view.id);
        const shouldBeAuthorized = authorizedViewsInService.includes(view.id);
        assert(
          isAuthorizedByService === shouldBeAuthorized,
          `View auth mismatch for role "${role}" on view "${view.id}": service=${isAuthorizedByService}, array=${shouldBeAuthorized}`
        );
      }
    }
  });

  test('SOC Analyst is authorized for exactly 7 views', () => {
    const analystViews = AuthorizationService.ROLE_AUTHORIZED_VIEWS.soc_analyst;
    assert(analystViews.length === 7, `Expected 7 views for soc_analyst, found ${analystViews.length}`);
    assert(analystViews.includes('overview'), 'SOC Analyst must access overview');
    assert(analystViews.includes('alerts'), 'SOC Analyst must access alerts');
    assert(analystViews.includes('investigations'), 'SOC Analyst must access investigations');
    assert(analystViews.includes('playbooks'), 'SOC Analyst must access playbooks');
    assert(analystViews.includes('network'), 'SOC Analyst must access network');
    assert(analystViews.includes('audit'), 'SOC Analyst must access audit');
    assert(analystViews.includes('profile'), 'SOC Analyst must access profile');
  });

  test('Security Engineer is authorized for exactly 5 views', () => {
    const engineerViews = AuthorizationService.ROLE_AUTHORIZED_VIEWS.security_engineer;
    assert(engineerViews.length === 5, `Expected 5 views for security_engineer, found ${engineerViews.length}`);
    assert(engineerViews.includes('mitre'), 'Security Engineer must access mitre');
    assert(engineerViews.includes('alerts'), 'Security Engineer must access alerts');
    assert(engineerViews.includes('network'), 'Security Engineer must access network');
    assert(engineerViews.includes('audit'), 'Security Engineer must access audit');
    assert(engineerViews.includes('profile'), 'Security Engineer must access profile');
  });

  test('IT Operations is authorized for exactly 5 views', () => {
    const itopsViews = AuthorizationService.ROLE_AUTHORIZED_VIEWS.it_operations;
    assert(itopsViews.length === 5, `Expected 5 views for it_operations, found ${itopsViews.length}`);
    assert(itopsViews.includes('tasks'), 'IT Operations must access tasks');
    assert(itopsViews.includes('alerts'), 'IT Operations must access alerts');
    assert(itopsViews.includes('network'), 'IT Operations must access network');
    assert(itopsViews.includes('audit'), 'IT Operations must access audit');
    assert(itopsViews.includes('profile'), 'IT Operations must access profile');
  });

  test('Super Admin is authorized for exactly 3 views', () => {
    const adminViews = AuthorizationService.ROLE_AUTHORIZED_VIEWS.super_admin;
    assert(adminViews.length === 3, `Expected 3 views for super_admin, found ${adminViews.length}`);
    assert(adminViews.includes('admin'), 'Super Admin must access admin');
    assert(adminViews.includes('audit'), 'Super Admin must access audit');
    assert(adminViews.includes('profile'), 'Super Admin must access profile');
  });

  // -------------------------------------------------------------------------
  // 4. Default Landing View Symmetry
  // -------------------------------------------------------------------------
  test('ROLE_DEFAULT_VIEW mapping is correct for all 4 roles', () => {
    assert(AuthorizationService.ROLE_DEFAULT_VIEW.soc_analyst === 'overview', 'soc_analyst default must be overview');
    assert(AuthorizationService.ROLE_DEFAULT_VIEW.security_engineer === 'mitre', 'security_engineer default must be mitre');
    assert(AuthorizationService.ROLE_DEFAULT_VIEW.it_operations === 'tasks', 'it_operations default must be tasks');
    assert(AuthorizationService.ROLE_DEFAULT_VIEW.super_admin === 'admin', 'super_admin default must be admin');
  });

  test('Default landing view for each role is included in its authorized views', () => {
    for (const role of EXPECTED_ROLES) {
      const defaultView = AuthorizationService.ROLE_DEFAULT_VIEW[role];
      const authorized = AuthorizationService.ROLE_AUTHORIZED_VIEWS[role];
      assert(
        authorized.includes(defaultView),
        `Role "${role}" default landing view "${defaultView}" is not in its authorized views`
      );
    }
  });

  // -------------------------------------------------------------------------
  // 5. Granular Action Permissions Symmetry with ROLE_PERMISSIONS
  // -------------------------------------------------------------------------
  test('AuthorizationService.hasPermission accurately reflects ROLE_PERMISSIONS across all roles', () => {
    for (const role of EXPECTED_ROLES) {
      const expectedGrants = ROLE_PERMISSIONS[role];
      for (const perm of ALL_PERMISSIONS) {
        const has = AuthorizationService.hasPermission(role, perm.id);
        const shouldHave = expectedGrants.includes(perm.id);
        assert(
          has === shouldHave,
          `Permission evaluation mismatch for role "${role}" on "${perm.id}": has=${has}, expected=${shouldHave}`
        );
      }
    }
  });

  // -------------------------------------------------------------------------
  // 6. Super Admin Least Privilege & Strict Operational Segregation
  // -------------------------------------------------------------------------
  test('Super Admin has zero alert triage, reading, or escalation permissions', () => {
    const alertPerms: Permission[] = [
      'alert:read',
      'alert:triage',
      'alert:escalate',
      'alert:add_note',
      'alert:read_scoped_only',
      'notes:read_private',
    ];
    for (const perm of alertPerms) {
      assert(
        !AuthorizationService.hasPermission('super_admin', perm),
        `Super Admin MUST NOT have alert permission: ${perm}`
      );
    }
  });

  test('Super Admin has zero incident management permissions', () => {
    assert(!AuthorizationService.hasPermission('super_admin', 'incident:read'), 'Super Admin cannot have incident:read');
    assert(!AuthorizationService.hasPermission('super_admin', 'incident:update'), 'Super Admin cannot have incident:update');
  });

  test('Super Admin has zero MITRE threat intelligence permissions', () => {
    assert(!AuthorizationService.hasPermission('super_admin', 'mitre:read'), 'Super Admin cannot have mitre:read');
    assert(!AuthorizationService.hasPermission('super_admin', 'mitre:analyze_coverage'), 'Super Admin cannot have mitre:analyze_coverage');
  });

  test('Super Admin has zero action containment permissions', () => {
    assert(!AuthorizationService.hasPermission('super_admin', 'action:propose'), 'Super Admin cannot have action:propose');
    assert(!AuthorizationService.hasPermission('super_admin', 'action:authorize_simulated'), 'Super Admin cannot have action:authorize_simulated');
  });

  test('Super Admin has zero network telemetry permissions', () => {
    assert(!AuthorizationService.hasPermission('super_admin', 'telemetry:read'), 'Super Admin cannot have telemetry:read');
  });

  test('Super Admin has exactly 4 administrative and governance permissions', () => {
    const adminPerms = ROLE_PERMISSIONS.super_admin;
    assert(adminPerms.length === 4, `Expected exactly 4 permissions for super_admin, found ${adminPerms.length}`);
    assert(adminPerms.includes('platform:admin'), 'super_admin must have platform:admin');
    assert(adminPerms.includes('platform:health_read'), 'super_admin must have platform:health_read');
    assert(adminPerms.includes('audit:read'), 'super_admin must have audit:read');
    assert(adminPerms.includes('audit:export'), 'super_admin must have audit:export');
  });

  // -------------------------------------------------------------------------
  // 7. Role Capability Segregation Invariants
  // -------------------------------------------------------------------------
  test('Only soc_analyst has triage and escalation permissions', () => {
    assert(AuthorizationService.hasPermission('soc_analyst', 'alert:triage'), 'soc_analyst can triage');
    assert(AuthorizationService.hasPermission('soc_analyst', 'alert:escalate'), 'soc_analyst can escalate');
    assert(AuthorizationService.hasPermission('soc_analyst', 'notes:read_private'), 'soc_analyst can read private notes');

    assert(!AuthorizationService.hasPermission('security_engineer', 'alert:triage'), 'security_engineer cannot triage');
    assert(!AuthorizationService.hasPermission('it_operations', 'alert:triage'), 'it_operations cannot triage');
    assert(!AuthorizationService.hasPermission('super_admin', 'alert:triage'), 'super_admin cannot triage');
  });

  test('Only security_engineer has mitre:analyze_coverage', () => {
    assert(AuthorizationService.hasPermission('security_engineer', 'mitre:analyze_coverage'), 'security_engineer can analyze coverage');
    assert(!AuthorizationService.hasPermission('soc_analyst', 'mitre:analyze_coverage'), 'soc_analyst cannot analyze coverage');
    assert(!AuthorizationService.hasPermission('it_operations', 'mitre:analyze_coverage'), 'it_operations cannot analyze coverage');
    assert(!AuthorizationService.hasPermission('super_admin', 'mitre:analyze_coverage'), 'super_admin cannot analyze coverage');
  });

  test('Only it_operations has action:authorize_simulated and alert:read_scoped_only', () => {
    assert(AuthorizationService.hasPermission('it_operations', 'action:authorize_simulated'), 'it_operations can authorize simulated actions');
    assert(AuthorizationService.hasPermission('it_operations', 'alert:read_scoped_only'), 'it_operations has scoped alert read');

    assert(!AuthorizationService.hasPermission('soc_analyst', 'action:authorize_simulated'), 'soc_analyst cannot authorize simulated actions');
    assert(!AuthorizationService.hasPermission('security_engineer', 'action:authorize_simulated'), 'security_engineer cannot authorize simulated actions');
    assert(!AuthorizationService.hasPermission('super_admin', 'action:authorize_simulated'), 'super_admin cannot authorize simulated actions');
  });

  test('Only super_admin has platform:admin and audit:export', () => {
    assert(AuthorizationService.hasPermission('super_admin', 'platform:admin'), 'super_admin has platform:admin');
    assert(AuthorizationService.hasPermission('super_admin', 'audit:export'), 'super_admin has audit:export');

    assert(!AuthorizationService.hasPermission('soc_analyst', 'platform:admin'), 'soc_analyst cannot have platform:admin');
    assert(!AuthorizationService.hasPermission('security_engineer', 'platform:admin'), 'security_engineer cannot have platform:admin');
    assert(!AuthorizationService.hasPermission('it_operations', 'platform:admin'), 'it_operations cannot have platform:admin');

    assert(!AuthorizationService.hasPermission('soc_analyst', 'audit:export'), 'soc_analyst cannot export audit');
    assert(!AuthorizationService.hasPermission('security_engineer', 'audit:export'), 'security_engineer cannot export audit');
    assert(!AuthorizationService.hasPermission('it_operations', 'audit:export'), 'it_operations cannot export audit');
  });

  logs.push(`=== ALL ${passed} OF ${total} ACCESS CONTROL MATRIX TESTS PASSED ===`);
  return { passed, total, logs };
}

// Direct execution when invoked via tsx
if (
  typeof process !== 'undefined' &&
  process.argv &&
  process.argv[1]?.includes('accessControlMatrixTest')
) {
  runAccessControlMatrixTests()
    .then((res) => {
      res.logs.forEach((log) => console.log(log));
      if (res.passed !== res.total) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
