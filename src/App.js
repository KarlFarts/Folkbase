import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useConfig } from './contexts/ConfigContext';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { useApiTracking } from './hooks/useApiTracking';
import { useCalendarSync } from './hooks/useCalendarSync';
import { useTheme } from './hooks/useTheme';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import UniversalSearch from './components/UniversalSearch';

// Lazy load all pages for better initial load performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ContactList = lazy(() => import('./pages/ContactList'));
const ContactProfile = lazy(() => import('./pages/ContactProfile'));
const AddContact = lazy(() => import('./pages/AddContact'));
const OrganizationList = lazy(() => import('./pages/OrganizationList'));
const OrganizationProfile = lazy(() => import('./pages/OrganizationProfile'));
const AddOrganization = lazy(() => import('./pages/AddOrganization'));
const LocationList = lazy(() => import('./pages/LocationList'));
const LocationProfile = lazy(() => import('./pages/LocationProfile'));
const AddLocation = lazy(() => import('./pages/AddLocation'));
const TouchpointsList = lazy(() => import('./pages/TouchpointsList'));
const EventsList = lazy(() => import('./pages/EventsList'));
const AddEvent = lazy(() => import('./pages/AddEvent'));
const EventDetails = lazy(() => import('./pages/EventDetails'));
const TaskProfile = lazy(() => import('./pages/TaskProfile'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const ExportPage = lazy(() => import('./pages/ExportPage'));
const DuplicateManager = lazy(() => import('./pages/DuplicateManager'));
const CallMode = lazy(() => import('./pages/CallMode'));
const MeetingMode = lazy(() => import('./pages/MeetingMode'));
const WorkspaceDashboard = lazy(() => import('./pages/WorkspaceDashboard'));
const CreateWorkspace = lazy(() => import('./pages/CreateWorkspace'));
const JoinWorkspace = lazy(() => import('./pages/JoinWorkspace'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotesInbox = lazy(() => import('./pages/NotesInbox'));
const BraindumpPage = lazy(() => import('./pages/BraindumpPage'));
const QuickSyncPage = lazy(() => import('./pages/QuickSyncPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const BackupRestorePage = lazy(() => import('./pages/BackupRestorePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
import TokenExpiryNotifier from './components/TokenExpiryNotifier';
import NotificationContainer from './components/NotificationToast';
import KeyboardShortcutHandler from './components/KeyboardShortcutHandler';
import BraindumpFAB from './components/BraindumpFAB';
import InstallPrompt from './components/InstallPrompt';
import { NotificationProvider } from './contexts/NotificationContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { MonitoringPanel } from './components/MonitoringPanel';
import { needsMigration } from './services/migrationService';
import MigrationBanner from './components/MigrationBanner';
import { useActiveSheetId } from './utils/sheetResolver';

// Lazy load setup wizard (only loaded when needed)
const SetupWizard = lazy(() => import('./components/SetupWizard/SetupWizard'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const NoWorkspaceLandingPage = lazy(() => import('./pages/NoWorkspaceLandingPage'));

function AppContent() {
  const { user, accessToken, loading } = useAuth();
  const { config } = useConfig();
  const { userWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(false);
  const [signInError, setSignInError] = useState(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const activeSheetId = useActiveSheetId();

  // Initialize API tracking on app startup
  useApiTracking();

  // Initialize auto-sync for calendar
  useCalendarSync();

  // Apply theme (light/dark) from localStorage or system preference
  useTheme();

  // Check if migration is needed — only after setup is complete and sheet exists
  useEffect(() => {
    const checkMigration = async () => {
      if (user && accessToken && activeSheetId && config.personalSheetId) {
        try {
          const needed = await needsMigration(accessToken, activeSheetId);
          setMigrationNeeded(needed);
        } catch {
          // Sheet may not exist yet (new user) — silently skip migration check
        }
      }
    };
    checkMigration();
  }, [user, accessToken, activeSheetId, config.personalSheetId]);

  // Show loading until both config and auth are ready
  // This prevents race condition where dashboard shows before auth state resolves
  if (!config.isLoaded || loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Folkbase...</p>
      </div>
    );
  }

  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  // Step 1: Not signed in → show sign-in page
  // (DEV MODE skips this entirely — mock auth is always present)
  if (!isDevMode && (!user || !accessToken)) {
    return (
      <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div></div>}>
        <SignInPage
          initialError={signInError}
          onSignedIn={() => {
            // App.js re-renders automatically when AuthContext updates user/accessToken.
            // Nothing to do here — the routing logic below will take over.
            setSignInError(null);
          }}
        />
      </Suspense>
    );
  }

  // Step 2: Signed in but no sheet configured — check if they can skip setup
  // Allow /join route through so invited users aren't blocked
  const isPendingJoin = window.location.pathname === '/join';

  // Also check localStorage cache for known workspaces (collaborator-only users)
  const knownWorkspaces = JSON.parse(localStorage.getItem('folkbase_known_workspaces') || '[]');
  const hasWorkspaceAccess = userWorkspaces.length > 0 || knownWorkspaces.length > 0;

  // Only block if no personal sheet AND no workspace access AND not in the middle of joining
  const needsSetup = !isDevMode && !config.personalSheetId && !hasWorkspaceAccess && !isPendingJoin;

  if (showSetup) {
    return (
      <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div></div>}>
        <SetupWizard
          isInitialSetup={false}
          onComplete={() => {
            setShowSetup(false);
          }}
        />
      </Suspense>
    );
  }

  if (needsSetup) {
    return (
      <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div></div>}>
        <NoWorkspaceLandingPage onSetup={() => setShowSetup(true)} />
      </Suspense>
    );
  }

  const navigateTo = (page, id = null) => {
    switch (page) {
      case 'dashboard':
        navigate('/');
        break;
      case 'contacts':
        navigate('/contacts');
        break;
      case 'contact-profile':
        navigate(`/contacts/${id}`);
        break;
      case 'add-contact':
        navigate('/contacts/add');
        break;
      case 'organizations':
        navigate('/organizations');
        break;
      case 'organization-profile':
        navigate(`/organizations/${id}`);
        break;
      case 'add-organization':
        navigate('/organizations/add');
        break;
      case 'locations':
        navigate('/locations');
        break;
      case 'location-profile':
        navigate(`/locations/${id}`);
        break;
      case 'add-location':
        navigate('/locations/add');
        break;
      case 'touchpoints':
        navigate('/touchpoints');
        break;
      case 'events':
        navigate('/events');
        break;
      case 'add-event':
        navigate('/events/add');
        break;
      case 'event-details':
        navigate(`/events/${id}`);
        break;
      case 'task-profile':
        navigate(`/tasks/${id}`);
        break;
      case 'import':
        navigate('/import');
        break;
      case 'export':
        navigate('/export');
        break;
      case 'duplicates':
        navigate('/duplicates');
        break;
      case 'call-mode':
        navigate(`/call-mode/${id}`);
        break;
      case 'meeting-mode':
        navigate('/meeting-mode');
        break;
      case 'notes':
      case 'notes-inbox':
        navigate('/notes');
        break;
      case 'braindump':
        navigate('/braindump');
        break;
      case 'quick-sync':
        navigate('/quick-sync');
        break;
      case 'tasks':
        navigate('/tasks');
        break;
      case 'backup':
        navigate('/backup');
        break;
      case 'workspaces':
        navigate('/workspaces');
        break;
      case 'create-workspace':
        navigate('/workspaces/create');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <ErrorBoundary>
      <KeyboardShortcutHandler onCommandPalette={() => setShowSearch(true)}>
        <div className="app-container">
          <Navbar onNavigate={navigateTo} onShowSetup={() => setShowSetup(true)} />
          <TokenExpiryNotifier />
          {migrationNeeded && (
            <MigrationBanner
              accessToken={accessToken}
              sheetId={activeSheetId}
              onComplete={() => setMigrationNeeded(false)}
            />
          )}
          <main className="main-content">
            <Suspense
              fallback={<div className="loading-container--page">Loading...</div>}
            >
              <Routes>
                <Route path="/" element={<Dashboard onNavigate={navigateTo} />} />
                <Route path="/contacts" element={<ContactList onNavigate={navigateTo} />} />
                <Route path="/contacts/:id" element={<ContactProfile onNavigate={navigateTo} />} />
                <Route path="/contacts/add" element={<AddContact onNavigate={navigateTo} />} />
                <Route
                  path="/organizations"
                  element={<OrganizationList onNavigate={navigateTo} />}
                />
                <Route
                  path="/organizations/:id"
                  element={<OrganizationProfile onNavigate={navigateTo} />}
                />
                <Route
                  path="/organizations/add"
                  element={<AddOrganization onNavigate={navigateTo} />}
                />
                <Route path="/locations" element={<LocationList onNavigate={navigateTo} />} />
                <Route
                  path="/locations/:id"
                  element={<LocationProfile onNavigate={navigateTo} />}
                />
                <Route path="/locations/add" element={<AddLocation onNavigate={navigateTo} />} />
                <Route path="/touchpoints" element={<TouchpointsList onNavigate={navigateTo} />} />
                <Route path="/events" element={<EventsList onNavigate={navigateTo} />} />
                <Route path="/events/add" element={<AddEvent onNavigate={navigateTo} />} />
                <Route path="/events/:id" element={<EventDetails onNavigate={navigateTo} />} />
                <Route path="/tasks/:id" element={<TaskProfile onNavigate={navigateTo} />} />
                <Route path="/import" element={<ImportPage onNavigate={navigateTo} />} />
                <Route path="/export" element={<ExportPage onNavigate={navigateTo} />} />
                <Route path="/duplicates" element={<DuplicateManager onNavigate={navigateTo} />} />
                <Route
                  path="/call-mode/:contactId"
                  element={<CallMode onNavigate={navigateTo} />}
                />
                <Route path="/meeting-mode" element={<MeetingMode onNavigate={navigateTo} />} />
                <Route path="/notes" element={<NotesInbox onNavigate={navigateTo} />} />
                <Route path="/braindump" element={<BraindumpPage onNavigate={navigateTo} />} />
                <Route path="/quick-sync" element={<QuickSyncPage onNavigate={navigateTo} />} />
                <Route path="/tasks" element={<TasksPage onNavigate={navigateTo} />} />
                <Route path="/backup" element={<BackupRestorePage onNavigate={navigateTo} />} />
                <Route path="/workspaces" element={<WorkspaceDashboard onNavigate={navigateTo} />} />
                <Route
                  path="/workspaces/create"
                  element={<CreateWorkspace onNavigate={navigateTo} />}
                />
                <Route path="/join" element={<JoinWorkspace />} />
                <Route
                  path="/settings"
                  element={
                    <SettingsPage onShowSetup={() => setShowSetup(true)} onNavigate={navigateTo} />
                  }
                />
                <Route path="*" element={<NotFoundPage onNavigate={navigateTo} />} />
              </Routes>
            </Suspense>
          </main>
          <BraindumpFAB />
          <InstallPrompt />
          {import.meta.env.VITE_DEV_MODE === 'true' && <MonitoringPanel />}
          {showSearch && (
            <UniversalSearch onNavigate={navigateTo} onClose={() => setShowSearch(false)} />
          )}
        </div>
      </KeyboardShortcutHandler>
    </ErrorBoundary>
  );
}

function App() {
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
  const content = (
    <>
      <AppContent />
      <NotificationContainer />
    </>
  );

  return (
    <AuthProvider>
      <NotificationProvider>
        <WorkspaceProvider>
          {isDevMode ? <MonitoringProvider>{content}</MonitoringProvider> : content}
        </WorkspaceProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
