import React, { useEffect, useState } from 'react';
import { Sparkles, Link, Search, FolderCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { extractSheetId } from '../../../utils/sheetCreation';
import { hasDriveMetadataScope, findExistingSheets } from '../../../utils/sheetDiscovery';

/**
 * Step 1 — Binary choice: create new sheet or connect existing.
 * Auth is complete before this step renders.
 */
const WelcomeAuthStep = ({ wizardData, onUpdate, onNext }) => {
  const { user, accessToken } = useAuth();
  const [choice, setChoice] = useState(wizardData.sheetMethod || 'create');
  const [sheetInput, setSheetInput] = useState('');
  const [inputError, setInputError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredSheets, setDiscoveredSheets] = useState(null);
  const [discoveryError, setDiscoveryError] = useState(null);

  // Sync auth into wizard on mount
  useEffect(() => {
    if (user && accessToken) {
      onUpdate({ user, accessToken, displayName: user.displayName || user.email?.split('@')[0] || 'User' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-discover existing sheets
  useEffect(() => {
    if (!user || !accessToken || isSearching || discoveredSheets !== null) return;
    const run = async () => {
      setIsSearching(true);
      try {
        const hasScope = await hasDriveMetadataScope(accessToken);
        if (!hasScope) { setDiscoveredSheets([]); return; }
        const result = await findExistingSheets(accessToken);
        setDiscoveredSheets(result.success ? result.sheets : []);
        if (!result.success) setDiscoveryError(result.error);
      } catch (err) {
        setDiscoveredSheets([]);
        setDiscoveryError(err.message);
      } finally {
        setIsSearching(false);
      }
    };
    run();
  }, [user, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReconnect = (sheet) => {
    onUpdate({ sheetMethod: 'existing', sheetId: sheet.id, sheetTitle: sheet.name });
    onNext();
  };

  const handleProceed = () => {
    if (choice === 'existing') {
      const sheetId = extractSheetId(sheetInput.trim());
      if (!sheetId) { setInputError('Please enter a valid Google Sheet URL or ID.'); return; }
      onUpdate({ sheetMethod: 'existing', sheetId, sheetTitle: 'Connected Sheet' });
    } else {
      onUpdate({ sheetMethod: 'create' });
    }
    onNext();
  };

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <h2 className="wizard-step-title">How would you like to get started?</h2>
        <p className="wizard-step-description">
          {isSearching ? 'Checking for existing databases...' : 'Choose an option below to continue.'}
        </p>
      </div>

      <div className="wizard-step-body">
        {/* Discovered sheets */}
        {!isSearching && discoveredSheets && discoveredSheets.length > 0 && (
          <div className="wizard-step-section">
            <h3 className="wizard-section-title">
              We found {discoveredSheets.length} existing {discoveredSheets.length === 1 ? 'sheet' : 'sheets'}:
            </h3>
            <div className="discovered-sheets-list">
              {discoveredSheets.map((sheet) => (
                <div key={sheet.id} className="discovered-sheet-card">
                  <div className="discovered-sheet-info">
                    <div className="discovered-sheet-header">
                      <h4 className="discovered-sheet-name">{sheet.name}</h4>
                      {sheet.inFolder && (
                        <span className="folder-badge"><FolderCheck size={14} /></span>
                      )}
                    </div>
                    <p className="discovered-sheet-meta">
                      Last modified: {new Date(sheet.modifiedTime).toLocaleDateString()}
                      {!sheet.inFolder && ' • Will be moved to folder'}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleReconnect(sheet)} className="btn btn-primary btn-sm">
                    Reconnect
                  </button>
                </div>
              ))}
            </div>
            <p className="wizard-section-note">Or choose an option below:</p>
          </div>
        )}

        {discoveryError && (
          <div className="wizard-info-box warning">
            <strong>Note:</strong> Could not search for existing sheets. You can still create or connect manually.
          </div>
        )}

        {/* Binary choice cards */}
        {!isSearching && (
          <>
            <div className="wizard-choice-cards">
              {/* New User card */}
              <div
                className={`wizard-choice-card ${choice === 'create' ? 'selected' : ''}`}
                onClick={() => { setChoice('create'); setInputError(null); }}
              >
                <div className="wizard-choice-card-icon">
                  <Sparkles size={36} />
                </div>
                <h3 className="wizard-choice-card-title">New User</h3>
                <p className="wizard-choice-card-description">
                  We'll create a Google Sheet in your Drive with everything ready to go.
                </p>
                <button
                  type="button"
                  className={`wizard-choice-card-btn ${choice === 'create' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setChoice('create'); handleProceed(); }}
                  aria-label="Create new sheet and continue"
                >
                  <ArrowRight size={18} />
                </button>
              </div>

              {/* Connect Existing card */}
              <div
                className={`wizard-choice-card ${choice === 'existing' ? 'selected' : ''}`}
                onClick={() => setChoice('existing')}
              >
                <div className="wizard-choice-card-icon">
                  <Link size={36} />
                </div>
                <h3 className="wizard-choice-card-title">Connect to Existing</h3>
                <p className="wizard-choice-card-description">
                  Already have a Folkbase sheet? Paste your URL to reconnect.
                </p>
                <button
                  type="button"
                  className={`wizard-choice-card-btn ${choice === 'existing' ? 'active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setChoice('existing'); }}
                  aria-label="Connect existing sheet"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Sheet URL input — only shown when 'existing' is selected */}
            {choice === 'existing' && (
              <div className="wizard-form-group">
                <label htmlFor="sheet-input" className="wizard-form-label">
                  Google Sheet URL or ID
                </label>
                <input
                  id="sheet-input"
                  type="text"
                  className={`wizard-form-input ${inputError ? 'error' : ''}`}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetInput}
                  onChange={(e) => { setSheetInput(e.target.value); setInputError(null); }}
                />
                {inputError && <p className="wizard-form-error">{inputError}</p>}
                <div className="wizard-step-actions">
                  <button type="button" onClick={handleProceed} className="btn btn-primary btn-lg">
                    Connect &amp; Continue
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {isSearching && (
          <div className="wizard-searching">
            <Search size={40} className="wizard-searching-icon spinner" />
            <p className="wizard-searching-text">Searching your Google Drive...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeAuthStep;
