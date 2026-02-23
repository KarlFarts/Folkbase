import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, Loader, AlertCircle, Mail, Database, Folder } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import {
  createNewSheet,
  validateSheetAccess,
  autoCreateMissingTabs,
} from '../../../utils/sheetCreation';
import { getOrCreateTouchpointFolder, moveFileToFolder } from '../../../utils/driveFolder';

/**
 * Completion step — creates/connects the sheet, saves config, shows summary
 */
const CompletionStep = ({ wizardData, onUpdate, onComplete }) => {
  const { saveConfig } = useConfig();
  const [phase, setPhase] = useState('provisioning'); // 'provisioning' | 'done' | 'error'
  const [status, setStatus] = useState('Setting up your database...');
  const [error, setError] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [folderWarning, setFolderWarning] = useState(null);
  const hasStartedRef = useRef(false);

  // Provision sheet: create/connect + organize in folder
  const provision = useCallback(async () => {
    try {
      let sheetId;
      let sheetTitle;

      if (wizardData.sheetMethod === 'existing' && wizardData.sheetId) {
        // Connect to existing sheet
        setStatus('Validating sheet access...');
        const accessCheck = await validateSheetAccess(wizardData.accessToken, wizardData.sheetId);

        if (!accessCheck.valid) {
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
            throw new Error(createResult.error);
          }
        }

        sheetId = wizardData.sheetId;
        sheetTitle = accessCheck.title || 'Connected Sheet';
      } else {
        // Create new sheet
        setStatus('Creating your Google Sheet...');
        const result = await createNewSheet(wizardData.accessToken, wizardData.displayName);

        sheetId = result.sheetId;
        sheetTitle = result.sheetTitle;
      }

      // Get or create Folkbase folder
      setStatus('Organizing your files...');
      const folderResult = await getOrCreateTouchpointFolder(wizardData.accessToken);

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

        setFolderId(folderResult.folderId);
      } else {
        console.warn('Failed to create/find Folkbase folder:', folderResult.error);
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
  }, [wizardData, onUpdate]);

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

  const handleRetry = () => {
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
      </div>
    );
  }

  // Error
  if (phase === 'error') {
    return (
      <div className="wizard-step">
        <div className="wizard-step-header">
          <div className="wizard-step-icon error">
            <AlertCircle size={64} />
          </div>
          <h2 className="wizard-step-title">Something Went Wrong</h2>
          <p className="wizard-step-description">{error}</p>
        </div>
        <div className="wizard-step-body">
          <div className="wizard-step-actions">
            <button type="button" onClick={handleRetry} className="btn btn-primary btn-lg">
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
        <div className="wizard-step-icon success">
          <CheckCircle size={64} />
        </div>
        <h2 className="wizard-step-title">You&apos;re All Set!</h2>
        <p className="wizard-step-description">Your Folkbase is ready to use.</p>
      </div>

      <div className="wizard-step-body">
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
