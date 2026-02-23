import React, { useEffect, useState } from 'react';
import { Handshake, CheckCircle, Sparkles, Link, Search, FolderCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { extractSheetId } from '../../../utils/sheetCreation';
import { hasDriveMetadataScope, findExistingSheets } from '../../../utils/sheetDiscovery';

/**
 * Welcome step — handles auth and sheet choice (create new or connect existing)
 * No side effects here — sheet creation is deferred to CompletionStep
 */
const WelcomeAuthStep = ({ wizardData, onUpdate, onNext }) => {
  const { user, accessToken, signInWithGoogle } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [sheetChoice, setSheetChoice] = useState(wizardData.sheetMethod || 'create');
  const [sheetInput, setSheetInput] = useState('');
  const [inputError, setInputError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredSheets, setDiscoveredSheets] = useState(null);
  const [discoveryError, setDiscoveryError] = useState(null);

  // Sync auth data into wizard state when signed in
  useEffect(() => {
    if (user && accessToken) {
      onUpdate({
        user,
        accessToken,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
      });
    }
  }, [user, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-discover existing sheets after sign-in
  useEffect(() => {
    const discoverSheets = async () => {
      if (!user || !accessToken || isSearching || discoveredSheets !== null) {
        return;
      }

      setIsSearching(true);
      setDiscoveryError(null);

      try {
        // Check if token has Drive scope
        const hasScope = await hasDriveMetadataScope(accessToken);

        if (!hasScope) {
          // Legacy token without Drive scope - skip discovery
          setDiscoveredSheets([]);
          setIsSearching(false);
          return;
        }

        // Search for existing sheets
        const result = await findExistingSheets(accessToken);

        if (result.success) {
          setDiscoveredSheets(result.sheets);
        } else {
          setDiscoveryError(result.error);
          setDiscoveredSheets([]);
        }
      } catch (error) {
        console.error('Sheet discovery error:', error);
        setDiscoveryError(error.message);
        setDiscoveredSheets([]);
      } finally {
        setIsSearching(false);
      }
    };

    discoverSheets();
  }, [user, accessToken, isSearching, discoveredSheets]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in failed:', error);
      setIsSigningIn(false);
    }
  };

  const handleReconnect = (sheet) => {
    onUpdate({
      sheetMethod: 'existing',
      sheetId: sheet.id,
      sheetTitle: sheet.name,
    });
    onNext();
  };

  const handleContinue = () => {
    if (sheetChoice === 'existing') {
      // Validate the input before continuing
      const sheetId = extractSheetId(sheetInput.trim());
      if (!sheetId) {
        setInputError('Please enter a valid Google Sheet URL or ID.');
        return;
      }
      onUpdate({
        sheetMethod: 'existing',
        sheetId,
        sheetTitle: 'Connected Sheet',
      });
    } else {
      onUpdate({ sheetMethod: 'create' });
    }
    onNext();
  };

  // Not signed in — show welcome + sign-in button
  if (!user || !accessToken) {
    return (
      <div className="wizard-step">
        <div className="wizard-step-header">
          <div className="wizard-step-icon">
            <Handshake size={64} />
          </div>
          <h2 className="wizard-step-title">Welcome to Folkbase</h2>
          <p className="wizard-step-description">
            Your personal CRM powered by Google Sheets — 100% free, 100% yours.
          </p>
        </div>

        <div className="wizard-step-body">
          <div className="wizard-info-box">
            <strong>Your privacy matters:</strong> All your data stays in your own Google account.
            Folkbase never uploads your contacts to external servers.
          </div>

          <div className="wizard-step-actions">
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="btn btn-primary btn-lg"
            >
              {isSigningIn ? 'Signing In...' : 'Sign in with Google'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Signed in — show welcome + sheet choice
  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <div className="wizard-step-icon success">
          <CheckCircle size={64} />
        </div>
        <h2 className="wizard-step-title">Welcome, {user.displayName || user.email}!</h2>
        <p className="wizard-step-description">
          {isSearching
            ? 'Checking for existing databases...'
            : 'How would you like to set up your database?'}
        </p>
      </div>

      <div className="wizard-step-body">
        {/* Searching state */}
        {isSearching && (
          <div className="wizard-searching">
            <Search size={48} className="wizard-searching-icon" />
            <p className="wizard-searching-text">
              Searching your Google Drive for Folkbase sheets...
            </p>
          </div>
        )}

        {/* Discovery error warning */}
        {!isSearching && discoveryError && (
          <div className="wizard-info-box warning wizard-info-box-spaced">
            <strong>Note:</strong> Could not search for existing sheets. You can still create a new
            sheet or enter a URL manually.
          </div>
        )}

        {/* Discovered sheets list */}
        {!isSearching && discoveredSheets && discoveredSheets.length > 0 && (
          <div className="wizard-step-section">
            <h3 className="wizard-section-title">
              We found {discoveredSheets.length} existing{' '}
              {discoveredSheets.length === 1 ? 'sheet' : 'sheets'}:
            </h3>
            <div className="discovered-sheets-list">
              {discoveredSheets.map((sheet) => (
                <div key={sheet.id} className="discovered-sheet-card">
                  <div className="discovered-sheet-info">
                    <div className="discovered-sheet-header">
                      <h4 className="discovered-sheet-name">{sheet.name}</h4>
                      {sheet.inFolder && (
                        <span className="folder-badge" title="Already in Folkbase folder">
                          <FolderCheck size={14} />
                        </span>
                      )}
                    </div>
                    <p className="discovered-sheet-meta">
                      Last modified: {new Date(sheet.modifiedTime).toLocaleDateString()}
                      {!sheet.inFolder && ' • Will be moved to folder'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReconnect(sheet)}
                    className="btn btn-primary btn-sm"
                  >
                    Reconnect
                  </button>
                </div>
              ))}
            </div>
            <p className="wizard-section-note">Or create a new sheet or connect manually:</p>
          </div>
        )}

        {/* Only show choice cards after discovery completes */}
        {!isSearching && discoveredSheets !== null && (
          <>
            <div className="path-selection">
              <div
                className={`path-card recommended ${sheetChoice === 'create' ? 'selected' : ''}`}
                onClick={() => {
                  setSheetChoice('create');
                  setInputError(null);
                }}
              >
                <div className="path-card-icon">
                  <Sparkles size={32} />
                </div>
                <h3 className="path-card-title">Create New Sheet</h3>
                <p className="path-card-description">
                  We&apos;ll create a Google Sheet in your Drive with everything set up.
                </p>
              </div>

              <div
                className={`path-card ${sheetChoice === 'existing' ? 'selected' : ''}`}
                onClick={() => setSheetChoice('existing')}
              >
                <div className="path-card-icon">
                  <Link size={32} />
                </div>
                <h3 className="path-card-title">Connect Existing Sheet</h3>
                <p className="path-card-description">
                  Already have a Folkbase sheet? Paste the URL to connect.
                </p>
              </div>
            </div>

            {/* Existing sheet input */}
            {sheetChoice === 'existing' && (
              <div className="wizard-form-group wizard-form-group-spaced">
                <label htmlFor="sheet-input" className="wizard-form-label">
                  Google Sheet URL or ID
                </label>
                <input
                  id="sheet-input"
                  type="text"
                  className={`wizard-form-input ${inputError ? 'error' : ''}`}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetInput}
                  onChange={(e) => {
                    setSheetInput(e.target.value);
                    setInputError(null);
                  }}
                />
                {inputError && <p className="wizard-form-error">{inputError}</p>}
              </div>
            )}

            <div className="wizard-step-actions">
              <button type="button" onClick={handleContinue} className="btn btn-primary btn-lg">
                Continue
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WelcomeAuthStep;
