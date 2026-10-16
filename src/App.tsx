import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserRole, ROLE_METADATA } from './types/auth';
import { SecurityAlert, AlertStatus } from './types/alert';
import { MitreTactic, MitreTechnique, MitreMitigation, MitreDefenseCoverage } from './types/mitre';
import { ResponseActionType, AuditLogEntry, IncidentTask } from './types/audit';

import { LocalAlertRepository } from './repositories/local/LocalAlertRepository';
import { LocalMITRERepository } from './repositories/local/LocalMITRERepository';
import { LocalAuditLogRepository } from './repositories/local/LocalAuditLogRepository';
import { DeterministicTriageService } from './services/deterministicTriageService';
import { AuthorizationService } from './services/authorizationService';
import { SAMPLE_NETWORK_FLOWS } from './data/networkFlows';

// Modular Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { WorkspaceLayout } from './layouts/WorkspaceLayout';

// Public components
import { PublicRoute } from './components/public/PublicHeader';
import { HomePage } from './components/public/HomePage';
import { FeaturesPage } from './components/public/FeaturesPage';
import { AboutPage } from './components/public/AboutPage';
import { ContactPage } from './components/public/ContactPage';
import { LoginPage } from './components/public/LoginPage';

// Operational & Domain Components
import { WorkspaceView } from './components/layout/AppSidebar';
import { AlertTriageDashboard } from './components/analyst/AlertTriageDashboard';
import { AlertDetailDrawer } from './components/analyst/AlertDetailDrawer';
import { SimulateActionModal } from './components/analyst/SimulateActionModal';
import { SecurityEngineerDashboard } from './components/security-engineer/SecurityEngineerDashboard';
import { ITOperationsDashboard } from './components/it-operations/ITOperationsDashboard';
import { PlatformAdminDashboard } from './components/admin/PlatformAdminDashboard';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { NetworkFlowViewer } from './components/network/NetworkFlowViewer';

// Singleton service instances adhering to repository interfaces
const alertRepo = new LocalAlertRepository();
const mitreRepo = new LocalMITRERepository();
const auditRepo = new LocalAuditLogRepository();
const triageService = new DeterministicTriageService();

function AppContent() {
  const { currentUser, isAuthenticated } = useAuth();

  // Helper to determine initial public route from URL hash if present
  const getInitialPublicRoute = (): PublicRoute => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as PublicRoute;
      if (['home', 'features', 'about', 'contact', 'login'].includes(hash)) {
        return hash;
      }
    }
    return 'home';
  };

  // Navigation states
  const [inWorkspace, setInWorkspace] = useState(false);
  const [publicRoute, setPublicRoute] = useState<PublicRoute>(getInitialPublicRoute);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('alerts');

  // Application Data State
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [tactics, setTactics] = useState<MitreTactic[]>([]);
  const [techniques, setTechniques] = useState<MitreTechnique[]>([]);
  const [mitigations, setMitigations] = useState<MitreMitigation[]>([]);
  const [coverage, setCoverage] = useState<MitreDefenseCoverage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [tasks, setTasks] = useState<IncidentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Alert for Deep Triage Drawer
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);

  // Simulated Action Modal State
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    actionType: ResponseActionType;
    target: string;
    alertId?: string;
  }>({
    isOpen: false,
    actionType: 'isolate_host',
    target: '',
  });

  // Load data scoped to active user
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // MITRE Reference data (shared reference read)
      const [fetchedTactics, fetchedTechniques, fetchedCoverage] = await Promise.all([
        mitreRepo.getTactics(),
        mitreRepo.getTechniques(),
        mitreRepo.getDefenseCoverage(),
      ]);
      setTactics(fetchedTactics);
      setTechniques(fetchedTechniques);
      setCoverage(fetchedCoverage);

      const mitIds = Array.from(new Set(fetchedTechniques.flatMap((t) => t.mitigationIds)));
      const fetchedMits = await Promise.all(
        mitIds.map((id) => mitreRepo.getMitigationById(id))
      );
      setMitigations(fetchedMits.filter(Boolean) as MitreMitigation[]);

      // Role-scoped operational data
      if (currentUser) {
        if (currentUser.role === 'super_admin') {
          // Super Admin is isolated from private operational alerts and tasks
          setAlerts([]);
          setTasks([]);
          const fetchedLogs = await auditRepo.getLogsForUser(currentUser);
          setAuditLogs(fetchedLogs);
        } else {
          const [fetchedAlerts, fetchedTasks, fetchedLogs] = await Promise.all([
            alertRepo.getAlertsForUser(currentUser),
            auditRepo.getIncidentTasksForUser(currentUser),
            auditRepo.getLogsForUser(currentUser),
          ]);
          setAlerts(fetchedAlerts);
          setTasks(fetchedTasks);
          setAuditLogs(fetchedLogs);
        }
      } else {
        // Default preview data for unauthenticated visitors
        const defaultAlerts = await alertRepo.getAlertsForUser({
          id: 'anon',
          name: 'Anonymous',
          email: 'anon@guest',
          role: 'soc_analyst',
          callsign: 'GUEST',
          title: 'Guest Visitor',
        });
        setAlerts(defaultAlerts);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Enforce role-to-view authorization when role changes or if current view is unauthorized
  useEffect(() => {
    if (currentUser) {
      if (!AuthorizationService.isViewAuthorized(currentUser.role, workspaceView)) {
        setWorkspaceView(AuthorizationService.getDefaultViewForRole(currentUser.role) as WorkspaceView);
      }
    }
  }, [currentUser?.role, workspaceView]);

  // Alert operations with strict permission enforcement
  const handleUpdateAlertStatus = async (alertId: string, status: AlertStatus) => {
    if (!currentUser) return;
    const updated = await alertRepo.updateAlertStatus(currentUser, alertId, status);
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(updated);
    }
  };

  const handleAddAnalystNote = async (alertId: string, note: string) => {
    if (!currentUser) return;
    const updated = await alertRepo.addAnalystNote(currentUser, alertId, note);
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? updated : a)));
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(updated);
    }
  };

  // Simulated Action Execution
  const handleInitiateSimulatedAction = (actionType: ResponseActionType, target: string, alertId?: string) => {
    setActionModal({
      isOpen: true,
      actionType,
      target,
      alertId,
    });
  };

  const handleConfirmSimulatedAction = async (justification: string) => {
    if (!currentUser) return;

    const newEntry = await auditRepo.recordSimulatedAction(currentUser, {
      actionType: actionModal.actionType,
      targetResource: actionModal.target,
      justification,
      status: 'SIMULATED_SUCCESS',
      associatedAlertId: actionModal.alertId,
      systemNote: `Simulated containment executed under Phase 1 protocol for target ${actionModal.target}.`,
    });

    setAuditLogs((prev) => [newEntry, ...prev]);

    // Create linked recovery task for IT Operations
    if (actionModal.actionType === 'isolate_host' || actionModal.actionType === 'lock_account') {
      const newTask = await auditRepo.createTask(currentUser, {
        title: `Verify Containment & Recovery for ${actionModal.target}`,
        description: `Operational task triggered following ${actionModal.actionType.replace('_', ' ')}. Rationale: ${justification}`,
        assignedRole: 'it_operations',
        status: 'in_progress',
        priority: 'high',
        targetAsset: actionModal.target,
        suggestedActionType: actionModal.actionType,
        associatedAlertId: actionModal.alertId,
      });
      setTasks((prev) => [newTask, ...prev]);
    }
  };

  // Inspect associated alert from IT Operations task with task-derived authorization
  const handleInspectAlert = async (alertId: string) => {
    if (!currentUser) return;
    try {
      // 1. Obtain current user's authorized tasks using existing task repository
      const authorizedTasks = await auditRepo.getIncidentTasksForUser(currentUser);
      // 2. Derive allowed alert IDs strictly from these authorized tasks
      const allowedAlertIds = authorizedTasks
        .map((t) => t.associatedAlertId)
        .filter((id): id is string => Boolean(id));

      // 3. Confirm requested alert is associated with an accessible task
      if (!allowedAlertIds.includes(alertId)) {
        console.warn(`Access Denied: Alert "${alertId}" is not associated with any authorized tasks.`);
        return;
      }

      // 4. Call alertRepo.getAlertByIdForUser with current user and derived allowed IDs
      const alert = await alertRepo.getAlertByIdForUser(currentUser, alertId, allowedAlertIds);
      if (alert) {
        setSelectedAlert(alert);
      }
    } catch (err: any) {
      console.error('Failed to inspect associated alert:', err?.message || err);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: IncidentTask['status'], notes?: string) => {
    if (!currentUser) return;
    const updated = await auditRepo.updateTaskStatus(currentUser, taskId, status, notes);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  // Selected Alert Computations
  const selectedMitreTechnique = useMemo(() => {
    if (!selectedAlert?.mitreTechniqueId) return null;
    return techniques.find((t) => t.id === selectedAlert.mitreTechniqueId) || null;
  }, [selectedAlert, techniques]);

  const selectedMitreMitigations = useMemo(() => {
    if (!selectedMitreTechnique) return [];
    return mitigations.filter((m) => selectedMitreTechnique.mitigationIds.includes(m.id));
  }, [selectedMitreTechnique, mitigations]);

  const selectedNetworkFlow = useMemo(() => {
    if (!selectedAlert?.networkFlowId) return null;
    return SAMPLE_NETWORK_FLOWS.find((f) => f.flowId === selectedAlert.networkFlowId) || null;
  }, [selectedAlert]);

  const selectedTriageRecommendation = useMemo(() => {
    if (!selectedAlert) return null;
    return triageService.evaluateAlert(selectedAlert);
  }, [selectedAlert]);

  const criticalAlertCount = useMemo(() => {
    return alerts.filter((a) => a.severity === 'critical').length;
  }, [alerts]);

  // Unified public navigation handler with immediate scroll-to-top and browser history sync
  const handlePublicNavigate = useCallback((route: PublicRoute) => {
    setPublicRoute(route);
    if (typeof window !== 'undefined') {
      if (window.location.hash !== `#${route}`) {
        window.history.pushState({ route }, '', `#${route}`);
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, []);

  // Listen to browser Back/Forward (popstate/hashchange) navigation
  useEffect(() => {
    const handleUrlChange = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash.replace('#', '') as PublicRoute;
      if (['home', 'features', 'about', 'contact', 'login'].includes(hash)) {
        setPublicRoute(hash);
      } else {
        setPublicRoute('home');
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Ensure scroll position resets whenever publicRoute or inWorkspace transitions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [publicRoute, inWorkspace]);

  // Navigate to workspace on login success
  const handleLoginSuccess = () => {
    setInWorkspace(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  const handleEnterWorkspace = () => {
    setInWorkspace(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  };

  const handleExitToPublic = () => {
    setInWorkspace(false);
    handlePublicNavigate('home');
  };

  // If in Workspace and authenticated:
  if (inWorkspace && isAuthenticated && currentUser) {
    // Explicit Role-to-View Authorization Guard:
    // Unauthorized views must NEVER render merely because workspaceView was manipulated.
    const isAuthorized = AuthorizationService.isViewAuthorized(currentUser.role, workspaceView);
    const effectiveView = (
      isAuthorized
        ? workspaceView
        : AuthorizationService.getDefaultViewForRole(currentUser.role)
    ) as WorkspaceView;

    return (
      <WorkspaceLayout
        currentUser={currentUser}
        currentView={effectiveView}
        onViewChange={(newView) => {
          if (AuthorizationService.isViewAuthorized(currentUser.role, newView)) {
            setWorkspaceView(newView);
          } else {
            setWorkspaceView(AuthorizationService.getDefaultViewForRole(currentUser.role) as WorkspaceView);
          }
        }}
        alertCount={alerts.length}
        criticalCount={criticalAlertCount}
        taskCount={tasks.filter((t) => t.status !== 'completed').length}
        onExitToPublic={handleExitToPublic}
      >
        {effectiveView === 'admin' && currentUser.role === 'super_admin' && (
          <PlatformAdminDashboard currentUser={currentUser} />
        )}

        {effectiveView === 'alerts' && AuthorizationService.isViewAuthorized(currentUser.role, 'alerts') && (
          <AlertTriageDashboard
            alerts={alerts}
            tactics={tactics}
            onSelectAlert={(a) => setSelectedAlert(a)}
            onRefresh={loadData}
            selectedAlertId={selectedAlert?.id}
          />
        )}

        {effectiveView === 'mitre' && AuthorizationService.isViewAuthorized(currentUser.role, 'mitre') && (
          <SecurityEngineerDashboard
            tactics={tactics}
            techniques={techniques}
            mitigations={mitigations}
            coverage={coverage}
          />
        )}

        {effectiveView === 'tasks' && AuthorizationService.isViewAuthorized(currentUser.role, 'tasks') && (
          <ITOperationsDashboard
            tasks={tasks}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onTriggerSimulatedAction={(action, target) =>
              handleInitiateSimulatedAction(action, target)
            }
            onInspectAlert={handleInspectAlert}
            currentRole={currentUser.role}
          />
        )}

        {effectiveView === 'network' && AuthorizationService.isViewAuthorized(currentUser.role, 'network') && (
          <NetworkFlowViewer />
        )}

        {effectiveView === 'audit' && AuthorizationService.isViewAuthorized(currentUser.role, 'audit') && (
          <AuditLogViewer logs={auditLogs} />
        )}

        {/* Deep-dive Investigation Drawer */}
        {selectedAlert && selectedTriageRecommendation && (
          <AlertDetailDrawer
            alert={selectedAlert}
            onClose={() => setSelectedAlert(null)}
            onUpdateStatus={handleUpdateAlertStatus}
            onAddNote={handleAddAnalystNote}
            mitreTechnique={selectedMitreTechnique}
            mitigations={selectedMitreMitigations}
            networkFlow={selectedNetworkFlow}
            triageRecommendation={selectedTriageRecommendation}
            currentRole={currentUser.role}
            onInitiateSimulatedAction={(action, target) =>
              handleInitiateSimulatedAction(action, target, selectedAlert.id)
            }
          />
        )}

        {/* Simulated Action Confirmation Dialog */}
        <SimulateActionModal
          isOpen={actionModal.isOpen}
          onClose={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
          actionType={actionModal.actionType}
          target={actionModal.target}
          alertId={actionModal.alertId}
          currentRole={currentUser.role}
          onConfirm={handleConfirmSimulatedAction}
        />
      </WorkspaceLayout>
    );
  }

  // Otherwise, render Public Website
  return (
    <PublicLayout
      currentRoute={publicRoute}
      onNavigate={handlePublicNavigate}
      onEnterApp={handleEnterWorkspace}
      isAuthenticated={isAuthenticated}
    >
      {publicRoute === 'home' && (
        <HomePage
          onNavigate={handlePublicNavigate}
          onEnterApp={handleEnterWorkspace}
          isAuthenticated={isAuthenticated}
        />
      )}

      {publicRoute === 'features' && (
        <FeaturesPage onNavigate={handlePublicNavigate} />
      )}

      {publicRoute === 'about' && (
        <AboutPage onNavigate={handlePublicNavigate} />
      )}

      {publicRoute === 'contact' && <ContactPage />}

      {publicRoute === 'login' && (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </PublicLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
