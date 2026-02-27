import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Settings,
  Activity,
  User,
  Database,
  Info,
  Download,
  HardDrive,
  CheckCircle,
  XCircle,
  Loader,
  Calendar,
  FolderSync,
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
import PremiumGate from '../components/PremiumGate';
import { PREMIUM_FEATURES } from '../config/constants';
import { findExistingSheets } from '../utils/sheetDiscovery';
import { getOrCreateTouchpointFolder, moveFileToFolder } from '../utils/driveFolder';
import axios from 'axios';
import { useTheme } from '../hooks/useTheme';

function SettingsPage({ onShowSetup, onNavigate }) {
  const { user, accessToken, signInWithGoogle, signOut, hasCalendarAccess, requestCalendarAccess } =
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
    conflictResolution: 'prompt', // 'prompt' | 'crm' | 'calendar' | 'latest'
    autoSync: false,
    autoSyncInterval: 30, // minutes
  });
  const [requestingCalendarAccess, setRequestingCalendarAccess] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    lastSyncedAt: null,
    lastPushed: 0,
    lastPulled: 0,
    syncing: false,
  });
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

  // Load sync status from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('touchpoint_calendar_sync_status');
    if (stored) {
      try {
        setSyncStatus((prev) => ({ ...prev, ...JSON.parse(stored) }));
      } catch {
        // Invalid stored status, use defaults
      }
    }
  }, []);

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
        const tokenResponse = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`
        );

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
      } catch (error) {
        setSheetsStatus({
          loading: false,
          connected: false,
          error: error.response?.data?.error?.message || error.message,
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
    } catch (error) {
      notify.error(`Failed to reconnect: ${error.message}. Please try again.`);
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
    } catch (error) {
      setMigrationStatus({
        scanning: false,
        migrating: false,
        sheets: [],
        error: error.message,
      });
      notify.error(`Scan failed: ${error.message}`);
    }
  };

  const handleMigrateSheets = async () => {
    if (!accessToken || migrationStatus.sheets.length === 0) {
      return;
    }

    setMigrationStatus((prev) => ({ ...prev, migrating: true, error: null }));

    try {
      // Get or create folder
      const folderResult = await getOrCreateTouchpointFolder(accessToken);

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
    } catch (error) {
      setMigrationStatus((prev) => ({ ...prev, migrating: false, error: error.message }));
      notify.error(`Migration failed: ${error.message}`);
    }
  };

  const handleManualSync = async () => {
    if (!accessToken || !config.personalSheetId || !calendarSettings.enabled) {
      return;
    }

    setSyncStatus((prev) => ({ ...prev, syncing: true }));

    try {
      const { syncEvents } = await import('../utils/syncEngine');
      const result = await syncEvents(accessToken, config.personalSheetId);

      const newStatus = {
        lastSyncedAt: new Date().toISOString(),
        lastPushed: result.pushed.length,
        lastPulled: result.pulled.length,
        syncing: false,
      };

      setSyncStatus(newStatus);
      localStorage.setItem('touchpoint_calendar_sync_status', JSON.stringify(newStatus));

      const summary = `Pushed ${result.pushed.length} events, pulled ${result.pulled.length} updates`;
      if (result.conflicts.length > 0) {
        notify.warning(`${summary}. ${result.conflicts.length} conflicts need resolution.`);
      } else {
        notify.success(summary);
      }
    } catch (error) {
      setSyncStatus((prev) => ({ ...prev, syncing: false }));
      notify.error(`Sync failed: ${error.message}`);
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

      {/* Calendar Sync Section */}
      <section className="sp-section">
        <h2 className="sp-section-heading">
          <Calendar size={18} />
          Google Calendar Sync
        </h2>

        <div className="sp-cal-body">
          <p className="sp-section-desc">
            Sync CRM events with your Google Calendar. Your personal calendar events can be
            imported as CRM events or touchpoints.
          </p>

          {!calendarAccess ? (
            <div>
              <button
                onClick={async () => {
                  setRequestingCalendarAccess(true);
                  try {
                    await requestCalendarAccess();
                    setCalendarAccess(true);
                    notify('Calendar access granted', 'success');
                  } catch (error) {
                    notify('Failed to connect calendar: ' + error.message, 'error');
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

              <div className="sp-cal-toggle-row">
                <label className="sp-cal-setting-label">Enable Sync</label>
                <input
                  type="checkbox"
                  checked={calendarSettings.enabled}
                  onChange={(e) => {
                    const newSettings = { ...calendarSettings, enabled: e.target.checked };
                    setCalendarSettings(newSettings);
                    localStorage.setItem(
                      'touchpoint_calendar_settings',
                      JSON.stringify(newSettings)
                    );
                  }}
                  className="sp-cal-checkbox"
                />
              </div>

              {calendarSettings.enabled && (
                <>
                  {/* Calendar Selector */}
                  <div className="sp-cal-subsection">
                    <label className="sp-cal-setting-label">Which Calendar to Sync</label>
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

                  {/* Sync Status */}
                  {syncStatus.lastSyncedAt && (
                    <div className="sp-cal-sync-status">
                      <div className="sp-cal-sync-row">
                        <CheckCircle size={14} className="sp-icon-success" />
                        <span className="sp-cal-sync-text">
                          Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
                        </span>
                      </div>
                      <span className="sp-cal-sync-text">
                        Pushed {syncStatus.lastPushed} events, pulled {syncStatus.lastPulled} updates
                      </span>
                    </div>
                  )}

                  {/* Manual Sync Button */}
                  <div className="sp-cal-subsection">
                    <button
                      onClick={handleManualSync}
                      disabled={syncStatus.syncing}
                      className="btn btn-secondary btn-sm sp-icon-btn"
                    >
                      {syncStatus.syncing ? (
                        <Loader size={14} className="spin" />
                      ) : (
                        <FolderSync size={14} />
                      )}
                      {syncStatus.syncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>

                  {/* Auto-Sync Settings */}
                  <div className="sp-cal-subsection">
                    <div className="sp-cal-toggle-row">
                      <label className="sp-cal-setting-label">Auto-Sync</label>
                      <input
                        type="checkbox"
                        checked={calendarSettings.autoSync}
                        onChange={(e) => {
                          const newSettings = { ...calendarSettings, autoSync: e.target.checked };
                          setCalendarSettings(newSettings);
                          localStorage.setItem(
                            'touchpoint_calendar_settings',
                            JSON.stringify(newSettings)
                          );
                        }}
                        className="sp-cal-checkbox"
                      />
                    </div>

                    {calendarSettings.autoSync && (
                      <div>
                        <label className="sp-cal-setting-label sp-cal-setting-label--block">
                          Sync Interval
                        </label>
                        <select
                          value={calendarSettings.autoSyncInterval}
                          onChange={(e) => {
                            const newSettings = {
                              ...calendarSettings,
                              autoSyncInterval: parseInt(e.target.value),
                            };
                            setCalendarSettings(newSettings);
                            localStorage.setItem(
                              'touchpoint_calendar_settings',
                              JSON.stringify(newSettings)
                            );
                          }}
                          className="form-select sp-cal-select--sm"
                        >
                          <option value="15">Every 15 minutes</option>
                          <option value="30">Every 30 minutes</option>
                          <option value="60">Every hour</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              {calendarSettings.enabled && (
                <div className="sp-cal-subsection">
                  <label className="sp-cal-setting-label">Conflict Resolution</label>
                  <select
                    value={calendarSettings.conflictResolution}
                    onChange={(e) => {
                      const newSettings = {
                        ...calendarSettings,
                        conflictResolution: e.target.value,
                      };
                      setCalendarSettings(newSettings);
                      localStorage.setItem(
                        'touchpoint_calendar_settings',
                        JSON.stringify(newSettings)
                      );
                    }}
                    className="form-select sp-cal-select--md"
                  >
                    <option value="prompt">Always Ask</option>
                    <option value="crm">Keep CRM Version</option>
                    <option value="calendar">Keep Calendar Version</option>
                    <option value="latest">Keep Latest Edit</option>
                  </select>
                  <p className="sp-cal-conflict-hint">
                    How to handle conflicts when the same event is edited in both places
                  </p>
                </div>
              )}
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
          await signOut();
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
