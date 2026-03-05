import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, Mail, Database, Folder } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import {
  createNewSheet,
  validateSheetAccess,
  autoCreateMissingTabs,
} from '../../../utils/sheetCreation';
import { getOrCreateFolkbaseFolder, moveFileToFolder } from '../../../utils/driveFolder';
import { useConnectionStatus } from '../../../hooks/useConnectionStatus';
import ConnectionStatusPanel from '../../ConnectionStatusPanel';

/**
 * Completion step — creates/connects the sheet, saves config, shows summary.
 * Shows a ConnectionStatusPanel tracking Account, Sheets, and Drive status.
 */
const CompletionStep = ({ wizardData, onUpdate, onComplete }) => {
  const { saveConfig } = useConfig();
  const [phase, setPhase] = useState('provisioning'); // 'provisioning' | 'done' | 'error'
  const [status, setStatus] = useState('Setting up your database...');
  const [error, setError] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [folderWarning, setFolderWarning] = useState(null);
  const hasStartedRef = useRef(false);

  // Account and sheets are already verified from sign-in
  const { steps, setStepStatus, resetStep } = useConnectionStatus({
    account: { status: 'connected', error: null },
    sheets: { status: 'connected', error: null },
  });

  // Provision sheet: create/connect + organize in folder
  const provision = useCallback(async () => {
    try {
      let sheetId;
      let sheetTitle;

      if (wizardData.sheetMethod === 'existing' && wizardData.sheetId) {
        // Connect to existing sheet
        setStatus('Validating sheet access...');
        setStepStatus('sheets', 'checking');
        const accessCheck = await validateSheetAccess(wizardData.accessToken, wizardData.sheetId);

        if (!accessCheck.valid) {
          setStepStatus('sheets', 'error', {
            detail: accessCheck.error || 'Sheet validation failed.',
            fix: 'Check that the sheet exists and you have edit access.',
          });
          throw new Error(accessCheck.error);
        }

        if (accessCheck.needsAutoCreate) {
          setStatus(`Creating ${accessCheck.totalTabsToCreate} missing tabs...`);
          const createResult = await autoCreateMissingTabs(
            wizardData.accessToken,
            wizardData.sheetId,
            accessCheck.missingTabs
          );
          if (!createResult.success) {
            setStepStatus('sheets', 'error', {
              detail: createResult.error || 'Failed to create missing tabs.',
              fix: 'Try again, or create a new sheet instead.',
            });
            throw new Error(createResult.error);
          }
        }

        setStepStatus('sheets', 'connected');
        sheetId = wizardData.sheetId;
        sheetTitle = accessCheck.title || 'Connected Sheet';
      } else {
        // Create new sheet
        setStatus('Creating your Google Sheet...');
        setStepStatus('sheets', 'checking');
        const result = await createNewSheet(wizardData.accessToken, wizardData.displayName);
        setStepStatus('sheets', 'connected');

        sheetId = result.sheetId;
        sheetTitle = result.sheetTitle;
      }

      // Get or create Folkbase folder
      setStatus('Organizing your files...');
      setStepStatus('drive', 'checking');
      const folderResult = await getOrCreateFolkbaseFolder(wizardData.accessToken);

      if (folderResult.success) {
        // Move sheet into folder (if not already there)
        setStatus('Moving sheet to Folkbase folder...');
        const moveResult = await moveFileToFolder(
          wizardData.accessToken,
          sheetId,
          folderResult.folderId
        );

        if (!moveResult.success) {
          console.warn('Failed to move sheet to folder:', moveResult.error);
          setFolderWarning(
            'Could not move sheet to folder. Your sheet works fine, but you may want to organize it manually in Google Drive.'
          );
        }

        setStepStatus('drive', 'connected');
        setFolderId(folderResult.folderId);
      } else {
        console.warn('Failed to create/find Folkbase folder:', folderResult.error);
        setStepStatus('drive', 'error', {
          detail: 'Could not create the Folkbase folder.',
          fix: 'Check Drive storage and permissions. Your sheet still works without the folder.',
        });
        setFolderWarning(
          'Could not create Folkbase folder. Your sheet works fine, but you may want to create the folder manually in Google Drive.'
        );
      }

      onUpdate({
        sheetId,
        sheetTitle,
      });

      setPhase('done');
    } catch (err) {
      setError(err.message || 'Failed to set up your sheet. Please try again.');
      setPhase('error');
    }
  }, [wizardData, onUpdate, setStepStatus]);

  // Run provisioning on mount (once)
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    provision();
  }, [provision]);

  const handleFinish = () => {
    // Save sheet ID to ConfigContext
    saveConfig({ personalSheetId: wizardData.sheetId });

    // Save profile preferences to localStorage
    if (wizardData.displayName) {
      localStorage.setItem('user-display-name', wizardData.displayName);
    }
    if (wizardData.avatarColor) {
      localStorage.setItem('user-avatar-color', wizardData.avatarColor);
    }
    if (wizardData.avatarIcon) {
      localStorage.setItem('user-avatar-icon', wizardData.avatarIcon);
    }

    onComplete();
  };

  const handleRetry = (stepId) => {
    resetStep(stepId);
    setError(null);
    setPhase('provisioning');
    setStatus('Retrying...');
    provision();
  };

  // Provisioning in progress
  if (phase === 'provisioning') {
    return (
      <div className="wizard-step">
        <div className="wizard-step-header">
          <div className="wizard-step-icon">
            <Loader size={64} className="spinner" />
          </div>
          <h2 className="wizard-step-title">Setting Things Up</h2>
          <p className="wizard-step-description">{status}</p>
        </div>
        <div className="wizard-step-body">
          <ConnectionStatusPanel steps={steps} onRetry={handleRetry} />
        </div>
      </div>
    );
  }

  // Error
  if (phase === 'error') {
    return (
      <div className="wizard-step">
        <div className="wizard-step-header">
          <h2 className="wizard-step-title">Something Went Wrong</h2>
          <p className="wizard-step-description">{error}</p>
        </div>
        <div className="wizard-step-body">
          <ConnectionStatusPanel steps={steps} onRetry={handleRetry} />
          <div className="wizard-step-actions">
            <button type="button" onClick={() => handleRetry('drive')} className="btn btn-primary btn-lg">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Done — show summary
  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <h2 className="wizard-step-title">You&apos;re All Set!</h2>
        <p className="wizard-step-description">Your Folkbase is ready to use.</p>
      </div>

      <div className="wizard-step-body">
        <ConnectionStatusPanel steps={steps} />

        <div className="wizard-summary-card">
          <div className="wizard-summary-item">
            <div className="wizard-summary-label">
              <Mail size={16} />
              Account
            </div>
            <div className="wizard-summary-value">{wizardData.user?.email || 'Connected'}</div>
          </div>

          <div className="wizard-summary-item">
            <div className="wizard-summary-label">
              <Database size={16} />
              Google Sheet
            </div>
            <div className="wizard-summary-value">{wizardData.sheetTitle || 'Connected'}</div>
          </div>

          {folderId && (
            <div className="wizard-summary-item">
              <div className="wizard-summary-label">
                <Folder size={16} />
                Drive Folder
              </div>
              <div className="wizard-summary-value">
                <a
                  href={`https://drive.google.com/drive/folders/${folderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wizard-summary-link"
                >
                  Folkbase
                </a>
              </div>
            </div>
          )}
        </div>

        {folderWarning && (
          <div className="wizard-info-box warning wizard-info-box-spaced">
            <strong>Note:</strong> {folderWarning}
          </div>
        )}

        <div className="wizard-info-box success">
          <strong>What&apos;s next?</strong>
          <ul className="wizard-next-steps">
            <li>Start adding contacts to your CRM</li>
            <li>Import contacts from CSV or vCard</li>
            <li>Create workspaces to collaborate with others</li>
            <li>Customize your theme in Settings</li>
          </ul>
        </div>

        <div className="wizard-step-actions">
          <button type="button" onClick={handleFinish} className="btn btn-primary btn-lg">
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionStep;
