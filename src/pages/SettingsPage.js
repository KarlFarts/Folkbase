import React, { useState, useEffect } from 'react';
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

function SettingsPage({ onShowSetup, onNavigate }) {
  const { user, accessToken, signInWithGoogle, signOut, hasCalendarAccess, requestCalendarAccess } =
    useAuth();
  const { config } = useConfig();
  const { notify } = useNotification();
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
    <div
      className="page-container"
      style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--spacing-lg)' }}
    >
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-xs)',
          }}
        >
          <Settings
            size={24}
            style={{ marginRight: 'var(--spacing-sm)', verticalAlign: 'middle' }}
          />
          Settings
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
          Manage your account, connection, and application settings.
        </p>
      </div>

      {/* Account Section */}
      <section
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <User size={18} />
          Account
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--spacing-sm) 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Email
            </span>
            <span
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {user?.email || 'Not signed in'}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--spacing-sm) 0',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Display Name
            </span>
            <span
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              {user?.displayName || 'Not set'}
            </span>
          </div>
        </div>
        {user && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSignOutConfirm(true)}
            >
              Sign Out
            </button>
          </div>
        )}
      </section>

      {/* Connection Section */}
      <section
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <Database size={18} />
          Connection
        </h2>

        {/* Overall status banner */}
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-md)',
            background: allConnected
              ? 'var(--color-success-bg, rgba(34, 197, 94, 0.1))'
              : 'var(--color-warning-bg)',
            border: `1px solid ${allConnected ? 'var(--color-success)' : 'var(--color-warning)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          {allConnected ? (
            <>
              <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
              All systems connected
            </>
          ) : (
            <>
              <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
              Connection issues detected
            </>
          )}
        </div>

        {/* Three-item checklist */}
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
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
            <div
              key={check.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm) 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {check.loading ? (
                <Loader
                  size={16}
                  className="spinner"
                  style={{ color: 'var(--color-text-muted)' }}
                />
              ) : check.passed ? (
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
              ) : (
                <XCircle size={16} style={{ color: 'var(--color-error)' }} />
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  {check.label}
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  {check.loading ? 'Checking...' : check.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Token expiry */}
        {sheetsStatus.tokenExpiresIn !== undefined && (
          <div
            style={{
              fontSize: 'var(--font-size-xs)',
              color:
                sheetsStatus.tokenExpiresIn < 10
                  ? 'var(--color-warning)'
                  : 'var(--color-text-muted)',
              padding: 'var(--spacing-sm) 0',
            }}
          >
            Session expires in {sheetsStatus.tokenExpiresIn} minutes
          </div>
        )}

        <div
          style={{
            display: 'flex',
            gap: 'var(--spacing-sm)',
            marginTop: 'var(--spacing-md)',
            flexWrap: 'wrap',
          }}
        >
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
      <section
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <Database size={18} />
          Data Management
        </h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--spacing-md)',
          }}
        >
          Protect your data with backups and monitor your database health.
        </p>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate?.('backup')}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
        >
          <Download size={16} />
          Backup & Restore
        </button>
      </section>

      {/* Folder Migration Section */}
      <section
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <FolderSync size={18} />
          Folder Organization
        </h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
            marginBottom: 'var(--spacing-md)',
          }}
        >
          All Folkbase sheets should be in the &quot;Folkbase&quot; folder in your Google
          Drive. Scan for sheets outside the folder and migrate them.
        </p>

        {migrationStatus.error && (
          <div
            style={{
              padding: 'var(--spacing-sm)',
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-error-text)',
              fontSize: 'var(--font-size-sm)',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            {migrationStatus.error}
          </div>
        )}

        {migrationStatus.sheets.length > 0 && (
          <div
            style={{
              padding: 'var(--spacing-md)',
              background: 'var(--color-warning-bg)',
              border: '1px solid var(--color-warning)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-md)',
            }}
          >
            <p
              style={{
                color: 'var(--color-warning-text)',
                fontSize: 'var(--font-size-sm)',
                marginBottom: 'var(--spacing-sm)',
                fontWeight: 'var(--font-weight-semibold)',
              }}
            >
              Found {migrationStatus.sheets.length} sheet(s) outside the folder:
            </p>
            <ul
              style={{
                margin: 0,
                paddingLeft: '20px',
                color: 'var(--color-warning-text)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              {migrationStatus.sheets.map((sheet) => (
                <li key={sheet.id}>{sheet.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleScanForSheets}
            disabled={migrationStatus.scanning || migrationStatus.migrating || !accessToken}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
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
              className="btn btn-primary btn-sm"
              onClick={handleMigrateSheets}
              disabled={migrationStatus.migrating}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
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
      <section
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <Activity size={18} />
          API Status
        </h2>

        {serviceStatuses.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No API services registered yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
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
                <div
                  key={service.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    background: 'var(--color-bg-primary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {service.name}
                    </div>
                    <div
                      style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}
                    >
                      {service.quotas?.length || 0} quota{service.quotas?.length !== 1 ? 's' : ''}{' '}
                      tracked
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      fontSize: 'var(--font-size-sm)',
                      color: statusColor,
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: statusColor,
                      }}
                    />
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
      <section
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <Database size={18} />
          Data Health
        </h2>

        {loadingHealth ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Loading data health metrics...
          </p>
        ) : !dataHealth ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Connect your Google Sheet to view data health metrics.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--spacing-md)',
            }}
          >
            {/* Total Records Card */}
            <div
              className="card"
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                <Database size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Records
                </span>
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                {Object.values(dataHealth.entityCounts)
                  .reduce((sum, count) => sum + count, 0)
                  .toLocaleString()}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Total records
              </div>
            </div>

            {/* Storage Card */}
            <div
              className="card"
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                <HardDrive size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Storage
                </span>
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                {dataHealth.storageEstimate.percentage.toFixed(1)}%
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {dataHealth.storageEstimate.cellsUsed.toLocaleString()} /{' '}
                {(dataHealth.storageEstimate.cellLimit / 1000000).toFixed(0)}M cells
              </div>
            </div>

            {/* API Usage Card */}
            <div
              className="card"
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                <Activity size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  API Usage
                </span>
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                {dataHealth.apiUsage?.windows?.['100seconds']?.calls || 0}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Calls (last 100s)
              </div>
            </div>

            {/* Integrity Card */}
            <div
              className="card"
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                {dataHealth.integrityIssues.length === 0 ? (
                  <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
                )}
                <span
                  style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  Integrity
                </span>
              </div>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 'var(--font-weight-bold)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                {dataHealth.integrityIssues.length === 0
                  ? 'Healthy'
                  : dataHealth.integrityIssues.length}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
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
      <section
          style={{
            background: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-lg)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
            }}
          >
            <Calendar size={18} />
            Google Calendar Sync
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
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
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                >
                  {requestingCalendarAccess ? (
                    <Loader size={16} className="spin" />
                  ) : (
                    <Calendar size={16} />
                  )}
                  {requestingCalendarAccess ? 'Connecting...' : 'Connect Google Calendar'}
                </button>
                <p
                  style={{
                    color: 'var(--color-text-secondary)',
                    fontSize: 'var(--font-size-xs)',
                    marginTop: 'var(--spacing-xs)',
                  }}
                >
                  This will open a popup to grant calendar access. Your existing permissions remain
                  unchanged.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                  <span
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Calendar Connected
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-md)',
                    padding: 'var(--spacing-sm) 0',
                  }}
                >
                  <label
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Enable Sync
                  </label>
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
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {calendarSettings.enabled && (
                  <>
                    {/* Calendar Selector */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-xs)',
                        paddingLeft: 'var(--spacing-md)',
                      }}
                    >
                      <label
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        Which Calendar to Sync
                      </label>
                      {loadingCalendars ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                          <Loader size={14} className="spin" />
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                            Loading calendars...
                          </span>
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
                          style={{
                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-bg-primary)',
                            fontSize: 'var(--font-size-sm)',
                            width: '300px',
                          }}
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
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--spacing-xs)',
                          paddingLeft: 'var(--spacing-md)',
                          padding: 'var(--spacing-sm)',
                          background: 'var(--color-bg-secondary)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                          <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                            Last synced: {new Date(syncStatus.lastSyncedAt).toLocaleString()}
                          </span>
                        </div>
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          Pushed {syncStatus.lastPushed} events, pulled {syncStatus.lastPulled} updates
                        </span>
                      </div>
                    )}

                    {/* Manual Sync Button */}
                    <div style={{ paddingLeft: 'var(--spacing-md)' }}>
                      <button
                        onClick={handleManualSync}
                        disabled={syncStatus.syncing}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
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
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--spacing-xs)',
                        paddingLeft: 'var(--spacing-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <label
                          style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          Auto-Sync
                        </label>
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
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      </div>

                      {calendarSettings.autoSync && (
                        <div>
                          <label
                            style={{
                              fontSize: 'var(--font-size-sm)',
                              color: 'var(--color-text-secondary)',
                              marginBottom: 'var(--spacing-xs)',
                              display: 'block',
                            }}
                          >
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
                            style={{
                              padding: 'var(--spacing-xs) var(--spacing-sm)',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-bg-primary)',
                              fontSize: 'var(--font-size-sm)',
                              width: '150px',
                            }}
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
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-xs)',
                      paddingLeft: 'var(--spacing-md)',
                    }}
                  >
                    <label
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      Conflict Resolution
                    </label>
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
                      style={{
                        padding: 'var(--spacing-xs) var(--spacing-sm)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-bg-primary)',
                        fontSize: 'var(--font-size-sm)',
                        width: '200px',
                      }}
                    >
                      <option value="prompt">Always Ask</option>
                      <option value="crm">Keep CRM Version</option>
                      <option value="calendar">Keep Calendar Version</option>
                      <option value="latest">Keep Latest Edit</option>
                    </select>
                    <p
                      style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-xs)',
                      }}
                    >
                      How to handle conflicts when the same event is edited in both places
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

      {/* About Section */}
      <section
        style={{
          background: 'var(--color-bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: 'var(--spacing-lg)',
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <Info size={18} />
          About
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--spacing-sm) 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Application
            </span>
            <span
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              Folkbase
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'var(--spacing-sm) 0',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              Stack
            </span>
            <span
              style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}
            >
              React + Google Sheets + Google OAuth
            </span>
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
