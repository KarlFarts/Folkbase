import { useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import {
  createFullBackup,
  restoreFromBackup,
  validateBackup,
  getBackupStats,
} from '../services/backupService';
import { downloadFile, generateFilename } from '../services/exportService';
import ProgressTracker from '../components/import/ProgressTracker';
import WindowTemplate from '../components/WindowTemplate';

function BackupRestorePage() {
  const { accessToken } = useAuth();
  const { notify } = useNotification();
  const sheetId = useActiveSheetId();

  // Backup state
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(null);

  // Restore state
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [backupData, setBackupData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreMode, setRestoreMode] = useState('overwrite');

  // Handle create backup
  const handleCreateBackup = async () => {
    if (!accessToken || !sheetId) {
      notify.error('Please configure your Google Sheet first');
      return;
    }

    setCreatingBackup(true);
    setBackupProgress({
      phase: 'backup',
      total: 0,
      processed: 0,
      current: 'Starting...',
      canCancel: false,
    });

    try {
      const backup = await createFullBackup(accessToken, sheetId, (progress) => {
        setBackupProgress(progress);
      });

      // Download as JSON file
      const content = JSON.stringify(backup, null, 2);
      downloadFile(content, generateFilename('touchpoint-backup', 'json'), 'application/json');

      const stats = getBackupStats(backup);
      notify.success(
        `Backup created successfully! ${stats.totalTabs} tabs, ${stats.totalRecords.toLocaleString()} records`
      );

      // Show warnings if any
      if (backup.metadata.errors && backup.metadata.errors.length > 0) {
        notify.warning(
          `Backup completed with ${backup.metadata.errors.length} error(s). Check the downloaded file for details.`
        );
      }
    } catch (error) {
      console.error('Backup failed:', error);
      notify.error(`Backup failed: ${error.message}`);
    } finally {
      setCreatingBackup(false);
      setBackupProgress(null);
    }
  };

  // Handle file selection for restore
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setBackupData(null);
    setValidationResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        setBackupData(data);

        // Validate backup
        const validation = validateBackup(data);
        setValidationResult(validation);

        if (!validation.valid) {
          notify.error(`Invalid backup file: ${validation.errors.join(', ')}`);
        } else if (validation.warnings.length > 0) {
          notify.warning(
            `Backup validation warnings: ${validation.warnings.slice(0, 2).join('; ')}`
          );
        }
      } catch (error) {
        console.error('Failed to parse backup file:', error);
        notify.error('Invalid backup file format');
        setSelectedFile(null);
      }
    };

    reader.readAsText(file);
  };

  // Show restore confirmation
  const handleShowRestoreConfirm = () => {
    if (!validationResult?.valid) {
      notify.error('Please select a valid backup file first');
      return;
    }
    setShowRestoreConfirm(true);
  };

  // Handle restore
  const handleRestore = async () => {
    if (!accessToken || !sheetId || !backupData) {
      notify.error('Missing required data for restore');
      return;
    }

    setShowRestoreConfirm(false);
    setRestoring(true);
    setRestoreProgress({
      phase: 'restore',
      total: 0,
      processed: 0,
      current: 'Starting...',
      canCancel: false,
    });

    try {
      const results = await restoreFromBackup(
        accessToken,
        sheetId,
        backupData,
        { mode: restoreMode },
        (progress) => {
          setRestoreProgress(progress);
        }
      );

      notify.success(
        `Restore complete! ${results.tabsRestored} tabs, ${results.recordsRestored.toLocaleString()} records restored`
      );

      if (results.warnings.length > 0) {
        notify.warning(`Restore completed with ${results.warnings.length} warning(s)`);
      }

      // Clear selection
      setSelectedFile(null);
      setBackupData(null);
      setValidationResult(null);
    } catch (error) {
      console.error('Restore failed:', error);
      notify.error(`Restore failed: ${error.message}`);
    } finally {
      setRestoring(false);
      setRestoreProgress(null);
    }
  };

  const stats = backupData ? getBackupStats(backupData) : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>
            <Database size={32} className="br-title-icon" />
            Backup & Restore
          </h1>
          <p className="page-description">
            Protect your data with full backups and restore from previous saves
          </p>
        </div>
      </div>

      <div className="page-content br-content">
        {/* Create Backup Section */}
        <div className="card br-backup-card">
          <div className="card-header">
            <h2>
              <Download size={20} className="br-section-icon" />
              Create Backup
            </h2>
          </div>
          <div className="card-body">
            <p className="br-card-intro">
              Download a complete backup of all your data (contacts, organizations, locations,
              touchpoints, events, tasks, notes, lists, and all relationships). The backup file can
              be used to restore your data later.
            </p>

            {creatingBackup && backupProgress ? (
              <ProgressTracker progress={backupProgress} />
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleCreateBackup}
                disabled={!accessToken || !sheetId}
              >
                <Download size={18} />
                Create Backup
              </button>
            )}

            {!accessToken && (
              <p className="text-muted br-auth-note">
                Please sign in with Google to create backups
              </p>
            )}
          </div>
        </div>

        {/* Restore from Backup Section */}
        <div className="card">
          <div className="card-header">
            <h2>
              <Upload size={20} className="br-section-icon" />
              Restore from Backup
            </h2>
          </div>
          <div className="card-body">
            <div className="br-warning-alert">
              <AlertTriangle size={20} color="var(--color-warning)" />
              <div>
                <strong>Warning:</strong> Restoring a backup in overwrite mode will replace all
                existing data in your Google Sheet. This action cannot be undone. We recommend
                creating a backup of your current data first.
              </div>
            </div>

            {/* File Input */}
            <div className="br-file-input-row">
              <label htmlFor="backup-file" className="btn btn-secondary">
                <Upload size={18} />
                Select Backup File (.json)
              </label>
              <input
                id="backup-file"
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="br-file-hidden"
              />
              {selectedFile && (
                <p className="br-selected-file">Selected: {selectedFile.name}</p>
              )}
            </div>

            {/* Backup Info */}
            {stats && validationResult?.valid && (
              <div className="card br-info-card">
                <div className="card-header">
                  <h3 className="br-info-heading">
                    <Info size={18} />
                    Backup Information
                  </h3>
                </div>
                <div className="card-body">
                  <div className="br-info-grid">
                    <div>
                      <strong>Created:</strong> {new Date(stats.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>Version:</strong> {stats.version}
                    </div>
                    <div>
                      <strong>Total Tabs:</strong> {stats.totalTabs}
                    </div>
                    <div>
                      <strong>Total Records:</strong> {stats.totalRecords.toLocaleString()}
                    </div>
                    {stats.devMode && (
                      <div>
                        <strong>Mode:</strong> Development (localStorage)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {validationResult?.warnings && validationResult.warnings.length > 0 && (
              <div className="br-validation-alert">
                <div>
                  <strong>Validation Warnings:</strong>
                  <ul className="br-warnings-list">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Restore Mode */}
            {validationResult?.valid && (
              <div className="br-restore-mode">
                <label htmlFor="restore-mode" className="br-restore-mode-label">
                  <strong>Restore Mode:</strong>
                </label>
                <select
                  id="restore-mode"
                  value={restoreMode}
                  onChange={(e) => setRestoreMode(e.target.value)}
                  className="input br-restore-mode-select"
                >
                  <option value="overwrite">Overwrite (clear existing data)</option>
                  <option value="merge">Merge (keep existing data)</option>
                </select>
                <p className="text-muted br-restore-hint">
                  {restoreMode === 'overwrite'
                    ? 'All existing data will be deleted before restoring'
                    : 'Backup data will be added to existing data (may create duplicates)'}
                </p>
              </div>
            )}

            {/* Restore Progress */}
            {restoring && restoreProgress ? (
              <ProgressTracker progress={restoreProgress} />
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleShowRestoreConfirm}
                disabled={!validationResult?.valid || !accessToken || !sheetId}
              >
                <Upload size={18} />
                Restore from Backup
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <WindowTemplate
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        title="Confirm Restore"
        size="md"
      >
        <div className="br-confirm-body">
          <div className="br-confirm-warning">
            <AlertTriangle size={24} color="var(--color-warning)" />
            <div>
              <strong>Are you sure you want to restore this backup?</strong>
            </div>
          </div>

          {stats && (
            <div className="br-confirm-list">
              <p>This will restore:</p>
              <ul className="br-confirm-list-items">
                <li>{stats.totalTabs} sheet tabs</li>
                <li>{stats.totalRecords.toLocaleString()} records</li>
                <li>Backup created: {new Date(stats.createdAt).toLocaleString()}</li>
              </ul>
            </div>
          )}

          {restoreMode === 'overwrite' && (
            <p className="br-danger-text">All existing data will be permanently deleted!</p>
          )}
        </div>

        <div className="br-confirm-actions">
          <button className="btn btn-secondary" onClick={() => setShowRestoreConfirm(false)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleRestore}>
            <CheckCircle size={18} />
            Yes, Restore Backup
          </button>
        </div>
      </WindowTemplate>
    </div>
  );
}

export default BackupRestorePage;
