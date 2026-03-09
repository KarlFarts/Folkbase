import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Settings,
  Activity,
  User,
  Database,
  Info,
  Download,
  FolderSync,
  HardDrive,
  CheckCircle,
  XCircle,
  Loader,
  Calendar,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import { getAllServices, getRateLimitStatus } from '../utils/apiUsageLogger';
import { getDataHealth } from '../services/dataHealthService';
import { CacheConfigSection } from '../components/CacheConfigSection';
import ConfirmDialog from '../components/ConfirmDialog';
import { findExistingSheets } from '../utils/sheetDiscovery';
import { getOrCreateFolkbaseFolder, moveFileToFolder } from '../utils/driveFolder';
import axios from 'axios';
import { useTheme } from '../hooks/useTheme';

function SettingsPage({ onShowSetup, onNavigate }) {
  const { user, accessToken, signInWithGoogle, logout, hasCalendarAccess, requestCalendarAccess } =
    useAuth();
  const { config } = useConfig();
  const { notify } = useNotification();
  const { isDark, toggleTheme } = useTheme();
  const [sheetsStatus, setSheetsStatus] = useState({
    loading: true,
    connected: false,
    error: null,
  });
  const [reconnecting, setReconnecting] = useState(false);
  const [dataHealth, setDataHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [calendarAccess, setCalendarAccess] = useState(false);
  const [calendarSettings, setCalendarSettings] = useState({
    enabled: false,
    selectedCalendarId: 'primary',
  });
  const [requestingCalendarAccess, setRequestingCalendarAccess] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState({
    scanning: false,
    migrating: false,
    sheets: [],
    error: null,
  });

  // Load calendar settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('touchpoint_calendar_settings');
    if (stored) {
      try {
        setCalendarSettings(JSON.parse(stored));
      } catch {
        // Invalid stored settings, use defaults
      }
    }
  }, []);

  // Check calendar access
  useEffect(() => {
    const checkAccess = async () => {
      const hasAccess = await hasCalendarAccess();
      setCalendarAccess(hasAccess);
      if (hasAccess) {
        // Ensure enabled is written to localStorage for any user with actual calendar access
        const stored = JSON.parse(localStorage.getItem('touchpoint_calendar_settings') || '{}');
        if (!stored.enabled) {
          const updated = { selectedCalendarId: stored.selectedCalendarId || 'primary', enabled: true };
          localStorage.setItem('touchpoint_calendar_settings', JSON.stringify(updated));
          setCalendarSettings((prev) => ({ ...prev, enabled: true }));
        }
      }
    };
    if (accessToken) {
      checkAccess();
    }
  }, [accessToken, hasCalendarAccess]);

  // Load calendar list when access is granted
  useEffect(() => {
    const loadCalendars = async () => {
      if (!calendarAccess || !accessToken) {
        return;
      }
      setLoadingCalendars(true);
      try {
        const { fetchCalendarList } = await import('../utils/devModeWrapper');
        const calList = await fetchCalendarList(accessToken);
        setCalendars(calList);
      } catch (error) {
        console.error('Failed to load calendars:', error);
        notify.error('Failed to load calendar list');
      } finally {
        setLoadingCalendars(false);
      }
    };
    loadCalendars();
  }, [calendarAccess, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check Google Sheets API connection with real token validation
  useEffect(() => {
    const checkSheetsConnection = async () => {
      // In dev mode, localStorage is the backend — skip real API checks
      if (import.meta.env.VITE_DEV_MODE === 'true') {
        setSheetsStatus({ loading: false, connected: true, error: null, sheetTitle: 'Dev Mode (localStorage)' });
        return;
      }

      if (!accessToken || !config.personalSheetId) {
        setSheetsStatus({
          loading: false,
          connected: false,
          error: !accessToken ? 'No access token' : 'No sheet ID configured',
        });
        return;
      }

      setSheetsStatus({ loading: true, connected: false, error: null });

      try {
        const tokenResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!tokenResponse.ok) {
          throw new Error('Token validation failed - please re-authenticate');
        }

        const tokenData = await tokenResponse.json();
        const expiresIn = tokenData.expires_in || 0;
        const expiresInMinutes = Math.floor(expiresIn / 60);

        const response = await axios.get(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.personalSheetId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { fields: 'properties.title' },
          }
        );

        setSheetsStatus({
          loading: false,
          connected: true,
          error: null,
          sheetTitle: response.data.properties?.title,
          tokenExpiresIn: expiresInMinutes,
        });
      } catch {
        setSheetsStatus({
          loading: false,
          connected: false,
          error: 'Unable to connect to Google Sheets. Check your connection and try again.',
        });
      }
    };

    checkSheetsConnection();
    const interval = setInterval(checkSheetsConnection, 30000);
    return () => clearInterval(interval);
  }, [accessToken, config.personalSheetId]);

  // Load data health metrics
  useEffect(() => {
    const loadDataHealth = async () => {
      if (!accessToken || !config.personalSheetId) {
        setDataHealth(null);
        return;
      }

      setLoadingHealth(true);
      try {
        const health = await getDataHealth(accessToken, config.personalSheetId);
        setDataHealth(health);
      } catch (error) {
        console.error('Failed to load data health:', error);
        setDataHealth(null);
      } finally {
        setLoadingHealth(false);
      }
    };

    loadDataHealth();
  }, [accessToken, config.personalSheetId]);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await signInWithGoogle(true);
      window.location.reload();
    } catch {
      notify.error('Failed to reconnect Google. Please try again.');
    } finally {
      setReconnecting(false);
    }
  };

  const handleScanForSheets = async () => {
    if (!accessToken) {
      notify.error('Please sign in first');
      return;
    }

    setMigrationStatus({ scanning: true, migrating: false, sheets: [], error: null });

    try {
      const result = await findExistingSheets(accessToken);

      if (!result.success) {
        if (result.isAuthError) {
          notify.error('Drive permissions required. Click "Reconnect Now" to re-authorize.');
          setMigrationStatus({ scanning: false, migrating: false, sheets: [], error: null });
          return;
        }
        throw new Error(result.error || 'Failed to scan for sheets');
      }

      // Filter to only show sheets NOT in folder
      const unmigrated = result.sheets.filter((sheet) => !sheet.inFolder);

      setMigrationStatus({
        scanning: false,
        migrating: false,
        sheets: unmigrated,
        error: null,
      });

      if (unmigrated.length === 0) {
        notify.success('All Folkbase sheets are already in the folder!');
      } else {
        notify.success(`Found ${unmigrated.length} sheet(s) to migrate`);
      }
    } catch {
      setMigrationStatus({
        scanning: false,
        migrating: false,
        sheets: [],
        error: 'Scan failed. Check your connection and try again.',
      });
      notify.error('Scan failed. Check your connection and try again.');
    }
  };

  const handleMigrateSheets = async () => {
    if (!accessToken || migrationStatus.sheets.length === 0) {
      return;
    }

    setMigrationStatus((prev) => ({ ...prev, migrating: true, error: null }));

    try {
      // Get or create folder
      const folderResult = await getOrCreateFolkbaseFolder(accessToken);

      if (!folderResult.success) {
        throw new Error(folderResult.error || 'Failed to create/find folder');
      }

      // Move each sheet
      let successCount = 0;
      let failCount = 0;

      for (const sheet of migrationStatus.sheets) {
        try {
          const moveResult = await moveFileToFolder(accessToken, sheet.id, folderResult.folderId);

          if (moveResult.success) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to move ${sheet.name}:`, moveResult.error);
          }
        } catch (error) {
          failCount++;
          console.error(`Failed to move ${sheet.name}:`, error);
        }
      }

      setMigrationStatus({
        scanning: false,
        migrating: false,
        sheets: [],
        error: null,
      });

      if (failCount === 0) {
        notify.success(`Successfully migrated ${successCount} sheet(s) to folder!`);
      } else {
        notify.warning(
          `Migrated ${successCount} sheet(s), ${failCount} failed. Check console for details.`
        );
      }
    } catch {
      setMigrationStatus((prev) => ({ ...prev, migrating: false, error: 'Migration failed. Check your connection and try again.' }));
      notify.error('Migration failed. Check your connection and try again.');
    }
  };

  // Get API service statuses
  const services = getAllServices();
  const serviceStatuses = services.map((service) => {
    const status = getRateLimitStatus(service.id);
    return { ...service, rateStatus: status };
  });

  const allConnected =
    !!user && !!accessToken && sheetsStatus.connected && !!config.personalSheetId;

  return (
    <div className="page-container sp-page">
      <div className="sp-heading">
        <h1 className="sp-title">
          <Settings size={24} className="sp-title-icon" />
          Settings
        </h1>
        <p className="sp-subtitle">Manage your account, connection, and application settings.</p>
      </div>

      {/* Personal sheet setup card — shown only for collaborator-only users */}
      {!config.personalSheetId && (
        <div className="sp-collab-setup-card">
          <div className="sp-collab-setup-body">
            <HardDrive size={20} className="sp-collab-setup-icon" />
            <div>
              <strong>No personal contact sheet</strong>
              <p className="sp-collab-setup-desc">
                You are currently using workspaces only. Set up your own contact sheet to manage
                personal contacts and create workspaces.
              </p>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onShowSetup?.()}>
            Set Up Personal Sheet
          </button>
        </div>
      )}

      {/* Account Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          <User size={18} />
          Account
        </h2>
        <div className="sp-field-list">
          <div className="sp-field-row sp-field-row--bordered">
            <span className="sp-field-label">Email</span>
            <span className="sp-field-value">{user?.email || 'Not signed in'}</span>
          </div>
          <div className="sp-field-row">
            <span className="sp-field-label">Display Name</span>
            <span className="sp-field-value">{user?.displayName || 'Not set'}</span>
          </div>
        </div>
        {user && (
          <div className="sp-section-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSignOutConfirm(true)}
            >
              Sign Out
            </button>
          </div>
        )}
      </section>

      {/* Appearance Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          {isDark ? <Moon size={18} /> : <Sun size={18} />}
          Appearance
        </h2>
        <div className="sp-field-list">
          <div className="sp-field-row">
            <span className="sp-field-label">Theme</span>
            <button className="btn btn-secondary btn-sm" onClick={toggleTheme}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {isDark ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>
      </section>

      {/* Connection Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          <Database size={18} />
          Connection
        </h2>

        {/* Overall status banner */}
        <div className={`sp-status-banner${allConnected ? ' sp-status-banner--ok' : ' sp-status-banner--warn'}`}>
          {allConnected ? (
            <>
              <CheckCircle size={16} className="sp-icon-success" />
              All systems connected
            </>
          ) : (
            <>
              <AlertTriangle size={16} className="sp-icon-warn" />
              Connection issues detected
            </>
          )}
        </div>

        {/* Three-item checklist */}
        <div className="sp-checklist">
          {[
            {
              label: 'Google Account',
              passed: !!user && !!accessToken,
              loading: false,
              detail: user ? user.email : 'Not signed in',
            },
            {
              label: 'Google Sheets Access',
              passed: sheetsStatus.connected,
              loading: sheetsStatus.loading,
              detail: sheetsStatus.connected
                ? 'API accessible'
                : sheetsStatus.error || 'Unable to connect',
            },
            {
              label: 'Your Database',
              passed: !!config.personalSheetId && sheetsStatus.connected,
              loading: sheetsStatus.loading,
              detail: sheetsStatus.sheetTitle
                ? sheetsStatus.sheetTitle
                : !config.personalSheetId
                  ? 'Not configured'
                  : 'Sheet not found',
            },
          ].map((check) => (
            <div key={check.label} className="sp-check-row">
              {check.loading ? (
                <Loader size={16} className="spinner sp-icon-muted" />
              ) : check.passed ? (
                <CheckCircle size={16} className="sp-icon-success" />
              ) : (
                <XCircle size={16} className="sp-icon-error" />
              )}
              <div className="sp-check-body">
                <div className="sp-check-label">{check.label}</div>
                <div className="sp-check-detail">
                  {check.loading ? 'Checking...' : check.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Token expiry */}
        {sheetsStatus.tokenExpiresIn !== undefined && (
          <div className={`sp-token-expiry${sheetsStatus.tokenExpiresIn < 10 ? ' sp-token-expiry--warn' : ''}`}>
            Session expires in {sheetsStatus.tokenExpiresIn} minutes
          </div>
        )}

        <div className="sp-btn-group">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onShowSetup?.()}
            disabled={!user}
          >
            {config.personalSheetId ? 'Change Sheet' : 'Connect Sheet'}
          </button>
          {user && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleReconnect}
              disabled={reconnecting}
            >
              {reconnecting ? 'Reconnecting...' : 'Reconnect Google'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => onShowSetup?.()}>
            Run Setup Wizard
          </button>
        </div>
      </section>

      {/* Data Management Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          <Database size={18} />
          Data Management
        </h2>
        <p className="sp-section-desc">
          Protect your data with backups and monitor your database health.
        </p>
        <button
          className="btn btn-secondary btn-sm sp-icon-btn"
          onClick={() => onNavigate?.('backup')}
        >
          <Download size={16} />
          Backup & Restore
        </button>
      </section>

      {/* Folder Migration Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          <FolderSync size={18} />
          Folder Organization
        </h2>
        <p className="sp-section-desc">
          All Folkbase sheets should be in the &quot;Folkbase&quot; folder in your Google
          Drive. Scan for sheets outside the folder and migrate them.
        </p>

        {migrationStatus.error && (
          <div className="sp-error-box">{migrationStatus.error}</div>
        )}

        {migrationStatus.sheets.length > 0 && (
          <div className="sp-warning-box">
            <p className="sp-warning-box-title">
              Found {migrationStatus.sheets.length} sheet(s) outside the folder:
            </p>
            <ul className="sp-warning-box-list">
              {migrationStatus.sheets.map((sheet) => (
                <li key={sheet.id}>{sheet.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="sp-btn-group">
          <button
            className="btn btn-secondary btn-sm sp-icon-btn"
            onClick={handleScanForSheets}
            disabled={migrationStatus.scanning || migrationStatus.migrating || !accessToken}
          >
            {migrationStatus.scanning ? (
              <>
                <Loader size={16} className="spinner" />
                Scanning...
              </>
            ) : (
              <>
                <FolderSync size={16} />
                Scan for Sheets
              </>
            )}
          </button>

          {migrationStatus.sheets.length > 0 && (
            <button
              className="btn btn-primary btn-sm sp-icon-btn"
              onClick={handleMigrateSheets}
              disabled={migrationStatus.migrating}
            >
              {migrationStatus.migrating ? (
                <>
                  <Loader size={16} className="spinner" />
                  Migrating...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Migrate to Folder
                </>
              )}
            </button>
          )}
        </div>
      </section>

      {/* API Status Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          <Activity size={18} />
          API Status
        </h2>

        {serviceStatuses.length === 0 ? (
          <p className="sp-muted-sm">No API services registered yet.</p>
        ) : (
          <div className="sp-service-list">
            {serviceStatuses.map((service) => {
              const status = service.rateStatus?.status || 'unknown';
              const statusColor =
                status === 'safe'
                  ? 'var(--color-success)'
                  : status === 'warning'
                    ? 'var(--color-warning)'
                    : status === 'exceeded'
                      ? 'var(--color-error)'
                      : 'var(--color-text-muted)';

              return (
                <div key={service.id} className="sp-service-row">
                  <div>
                    <div className="sp-service-name">{service.name}</div>
                    <div className="sp-service-meta">
                      {service.quotas?.length || 0} quota{service.quotas?.length !== 1 ? 's' : ''}{' '}
                      tracked
                    </div>
                  </div>
                  <div className="sp-service-status" style={{ color: statusColor }}>
                    <div className="sp-service-dot" style={{ background: statusColor }} />
                    {status === 'safe'
                      ? 'Healthy'
                      : status === 'warning'
                        ? 'Warning'
                        : status === 'exceeded'
                          ? 'Exceeded'
                          : 'Unknown'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Data Health Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          <Database size={18} />
          Data Health
        </h2>

        {loadingHealth ? (
          <p className="sp-muted-sm">Loading data health metrics...</p>
        ) : !dataHealth ? (
          <p className="sp-muted-sm">Connect your Google Sheet to view data health metrics.</p>
        ) : (
          <div className="sp-health-grid">
            {/* Total Records Card */}
            <div className="card sp-health-card">
              <div className="sp-health-card-label">
                <Database size={16} className="sp-icon-muted" />
                <span className="sp-health-card-label-text">Records</span>
              </div>
              <div className="sp-health-card-value">
                {Object.values(dataHealth.entityCounts)
                  .reduce((sum, count) => sum + count, 0)
                  .toLocaleString()}
              </div>
              <div className="sp-health-card-sub">Total records</div>
            </div>

            {/* Storage Card */}
            <div className="card sp-health-card">
              <div className="sp-health-card-label">
                <HardDrive size={16} className="sp-icon-muted" />
                <span className="sp-health-card-label-text">Storage</span>
              </div>
              <div className="sp-health-card-value">
                {dataHealth.storageEstimate.percentage.toFixed(1)}%
              </div>
              <div className="sp-health-card-sub">
                {dataHealth.storageEstimate.cellsUsed.toLocaleString()} /{' '}
                {(dataHealth.storageEstimate.cellLimit / 1000000).toFixed(0)}M cells
              </div>
            </div>

            {/* API Usage Card */}
            <div className="card sp-health-card">
              <div className="sp-health-card-label">
                <Activity size={16} className="sp-icon-muted" />
                <span className="sp-health-card-label-text">API Usage</span>
              </div>
              <div className="sp-health-card-value">
                {dataHealth.apiUsage?.windows?.['100seconds']?.calls || 0}
              </div>
              <div className="sp-health-card-sub">Calls (last 100s)</div>
            </div>

            {/* Integrity Card */}
            <div className="card sp-health-card">
              <div className="sp-health-card-label">
                {dataHealth.integrityIssues.length === 0 ? (
                  <CheckCircle size={16} className="sp-icon-success" />
                ) : (
                  <AlertTriangle size={16} className="sp-icon-warn" />
                )}
                <span className="sp-health-card-label-text">Integrity</span>
              </div>
              <div className="sp-health-card-value">
                {dataHealth.integrityIssues.length === 0
                  ? 'Healthy'
                  : dataHealth.integrityIssues.length}
              </div>
              <div className="sp-health-card-sub">
                {dataHealth.integrityIssues.length === 0
                  ? 'No issues found'
                  : `Issue${dataHealth.integrityIssues.length !== 1 ? 's' : ''} detected`}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Cache Configuration Section */}
      <CacheConfigSection />

      {/* Calendar Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          <Calendar size={18} />
          Google Calendar
        </h2>

        <div className="sp-cal-body">
          <p className="sp-section-desc">
            Connect Google Calendar to import events and send calendar invites to attendees.
          </p>

          {!calendarAccess ? (
            <div>
              <button
                onClick={async () => {
                  setRequestingCalendarAccess(true);
                  try {
                    await requestCalendarAccess();
                    setCalendarAccess(true);
                    notify.success('Calendar access granted');
                    const newSettings = { ...calendarSettings, enabled: true };
                    setCalendarSettings(newSettings);
                    localStorage.setItem('touchpoint_calendar_settings', JSON.stringify(newSettings));
                  } catch {
                    notify.error('Failed to connect calendar. Please try again.');
                  } finally {
                    setRequestingCalendarAccess(false);
                  }
                }}
                disabled={requestingCalendarAccess}
                className="btn btn-primary sp-icon-btn"
              >
                {requestingCalendarAccess ? (
                  <Loader size={16} className="spin" />
                ) : (
                  <Calendar size={16} />
                )}
                {requestingCalendarAccess ? 'Connecting...' : 'Connect Google Calendar'}
              </button>
              <p className="sp-cal-hint">
                This will open a popup to grant calendar access. Your existing permissions remain
                unchanged.
              </p>
            </div>
          ) : (
            <div className="sp-cal-settings">
              <div className="sp-cal-connected">
                <CheckCircle size={16} className="sp-icon-success" />
                <span className="sp-cal-connected-label">Calendar Connected</span>
              </div>

              {/* Calendar Selector — always shown when connected */}
              <div className="sp-cal-subsection">
                <label className="sp-cal-setting-label">Default Calendar</label>
                {loadingCalendars ? (
                  <div className="sp-cal-loading">
                    <Loader size={14} className="spin" />
                    <span className="sp-cal-loading-text">Loading calendars...</span>
                  </div>
                ) : (
                  <select
                    value={calendarSettings.selectedCalendarId}
                    onChange={(e) => {
                      const newSettings = {
                        ...calendarSettings,
                        selectedCalendarId: e.target.value,
                      };
                      setCalendarSettings(newSettings);
                      localStorage.setItem(
                        'touchpoint_calendar_settings',
                        JSON.stringify(newSettings)
                      );
                    }}
                    className="form-select sp-cal-select"
                  >
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.summary} {cal.primary ? '(Primary)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="sp-section sp-section--last">
        <h2 className="sp-section-heading">
          <Info size={18} />
          About
        </h2>
        <div className="sp-field-list">
          <div className="sp-field-row sp-field-row--bordered">
            <span className="sp-field-label">Application</span>
            <span className="sp-field-value">Folkbase</span>
          </div>
          <div className="sp-field-row">
            <span className="sp-field-label">Stack</span>
            <span className="sp-field-value">React + Google Sheets + Google OAuth</span>
          </div>
        </div>
      </section>
      <ConfirmDialog
        isOpen={showSignOutConfirm}
        onConfirm={async () => {
          setShowSignOutConfirm(false);
          await logout();
          window.location.reload();
        }}
        onCancel={() => setShowSignOutConfirm(false)}
        title="Sign Out"
        message="Sign out of Google? You will need to sign in again."
        confirmLabel="Sign Out"
        variant="danger"
      />
    </div>
  );
}

export default SettingsPage;
