import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import { parseFile } from '../utils/importParsers';
import { readSheetData, addContact, SHEETS } from '../utils/devModeWrapper';
import { isDuplicate, CONFIDENCE } from '../services/duplicateDetector';
import { isAlreadySynced, markAsSynced } from '../services/syncHashService';
import ContactFileDropzone from '../components/quicksync/ContactFileDropzone';
import NewContactCard from '../components/quicksync/NewContactCard';
import SyncSummary from '../components/quicksync/SyncSummary';
import './QuickSyncPage.css';

// State machine states
const STATES = {
  IDLE: 'IDLE',
  PARSING: 'PARSING',
  REVIEWING: 'REVIEWING',
  COMPLETE: 'COMPLETE',
};

function QuickSyncPage({ onNavigate }) {
  const { accessToken, user } = useAuth();
  const { config } = useConfig();
  const { notify } = useNotification();

  const [state, setState] = useState(STATES.IDLE);
  const [newContacts, setNewContacts] = useState([]);
  const [existingTags, setExistingTags] = useState([]);
  const [addingContactId, setAddingContactId] = useState(null);
  const [stats, setStats] = useState({
    added: 0,
    skipped: 0,
    alreadyExisted: 0,
    alreadySynced: 0,
  });
  const [recentlyAdded, setRecentlyAdded] = useState([]);
  const [parseError, setParseError] = useState(null);

  const handleFileAccepted = useCallback(
    async (file) => {
      setState(STATES.PARSING);
      setParseError(null);

      try {
        // Parse the file
        const { contacts: parsedContacts } = await parseFile(file);

        if (parsedContacts.length === 0) {
          setParseError('No contacts found in the file. Please check the file format.');
          setState(STATES.IDLE);
          return;
        }

        // Get existing contacts from Folkbase
        const { data: existingContacts } = await readSheetData(
          accessToken,
          config.personalSheetId,
          SHEETS.CONTACTS
        );

        // Extract existing tags for autocomplete
        const allTags = existingContacts
          .flatMap((c) => (c.Tags || '').split(',').map((t) => t.trim()))
          .filter(Boolean);
        setExistingTags([...new Set(allTags)]);

        // Filter contacts into categories
        const newOnes = [];
        let alreadyExistedCount = 0;
        let alreadySyncedCount = 0;

        for (const contact of parsedContacts) {
          // First check if already synced via Quick Sync before
          const syncedEntry = isAlreadySynced(contact);
          if (syncedEntry) {
            alreadySyncedCount++;
            continue;
          }

          // Then check if exists in Folkbase contacts
          let foundMatch = false;
          for (const existing of existingContacts) {
            const confidence = isDuplicate(contact, existing);
            if (confidence !== CONFIDENCE.NONE) {
              alreadyExistedCount++;
              foundMatch = true;
              break;
            }
          }

          if (!foundMatch) {
            newOnes.push(contact);
          }
        }

        setStats((prev) => ({
          ...prev,
          alreadyExisted: alreadyExistedCount,
          alreadySynced: alreadySyncedCount,
        }));

        if (newOnes.length === 0) {
          // No new contacts - go straight to summary
          setState(STATES.COMPLETE);
        } else {
          setNewContacts(newOnes);
          setState(STATES.REVIEWING);
        }
      } catch (error) {
        setParseError(`Error parsing file: ${error.message}`);
        setState(STATES.IDLE);
      }
    },
    [accessToken, config.personalSheetId]
  );

  const handleAddContact = useCallback(
    async (contact, enrichment) => {
      setAddingContactId(contact.Name);

      try {
        // Merge enrichment with contact data
        const enrichedContact = {
          ...contact,
          Tags: enrichment.tags || contact.Tags || '',
          Priority: enrichment.priority || 'Medium',
          Status: 'Active',
          FirstMet: enrichment.howWeMet || '',
        };

        // Add to Folkbase
        const result = await addContact(
          accessToken,
          config.personalSheetId,
          enrichedContact,
          user?.email
        );

        // Mark as synced in our registry
        markAsSynced(contact, result.contactId || result['Contact ID']);

        // Update state
        setRecentlyAdded((prev) => [...prev, enrichedContact]);
        setStats((prev) => ({ ...prev, added: prev.added + 1 }));
        setNewContacts((prev) => prev.filter((c) => c.Name !== contact.Name));
      } catch (error) {
        notify.error(`Failed to add contact: ${error.message}`);
      } finally {
        setAddingContactId(null);
      }
    },
    [accessToken, config.personalSheetId, user?.email]
  );

  const handleSkipContact = useCallback((contact) => {
    setStats((prev) => ({ ...prev, skipped: prev.skipped + 1 }));
    setNewContacts((prev) => prev.filter((c) => c.Name !== contact.Name));
  }, []);

  const handleAddAll = useCallback(async () => {
    for (const contact of newContacts) {
      await handleAddContact(contact, { priority: 'Medium' });
    }
    setState(STATES.COMPLETE);
  }, [newContacts, handleAddContact]);

  const handleSkipAll = useCallback(() => {
    setStats((prev) => ({ ...prev, skipped: prev.skipped + newContacts.length }));
    setNewContacts([]);
    setState(STATES.COMPLETE);
  }, [newContacts]);

  const handleSyncAnother = useCallback(() => {
    setState(STATES.IDLE);
    setNewContacts([]);
    setRecentlyAdded([]);
    setStats({ added: 0, skipped: 0, alreadyExisted: 0, alreadySynced: 0 });
    setParseError(null);
  }, []);

  const handleViewContacts = useCallback(() => {
    onNavigate('contacts');
  }, [onNavigate]);

  // Check if all contacts have been processed
  React.useEffect(() => {
    if (state === STATES.REVIEWING && newContacts.length === 0) {
      setState(STATES.COMPLETE);
    }
  }, [state, newContacts.length]);

  return (
    <div className="quick-sync-page">
      <header className="page-header">
        <button type="button" className="back-button" onClick={() => onNavigate('dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1>Quick Sync</h1>
        <p className="page-subtitle">Import contacts from your phone or other devices</p>
      </header>

      <div className="page-content">
        {state === STATES.IDLE && (
          <div className="dropzone-container">
            <ContactFileDropzone onFileAccepted={handleFileAccepted} isProcessing={false} />
            {parseError && (
              <div className="parse-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {parseError}
              </div>
            )}
          </div>
        )}

        {state === STATES.PARSING && (
          <div className="parsing-state">
            <div className="loading-spinner"></div>
            <p>Analyzing contacts...</p>
          </div>
        )}

        {state === STATES.REVIEWING && (
          <div className="reviewing-state">
            <div className="review-header">
              <div className="review-stats">
                <span className="stat-badge new-badge">{newContacts.length} new</span>
                {stats.alreadyExisted + stats.alreadySynced > 0 && (
                  <span className="stat-badge existing-badge">
                    {stats.alreadyExisted + stats.alreadySynced} already in Folkbase
                  </span>
                )}
              </div>
              <div className="bulk-actions">
                <button type="button" className="bulk-btn skip-all-btn" onClick={handleSkipAll}>
                  Skip All
                </button>
                <button type="button" className="bulk-btn add-all-btn" onClick={handleAddAll}>
                  Add All ({newContacts.length})
                </button>
              </div>
            </div>

            <div className="contacts-list">
              {newContacts.map((contact, index) => (
                <NewContactCard
                  key={`${contact.Name}-${index}`}
                  contact={contact}
                  onAdd={handleAddContact}
                  onSkip={handleSkipContact}
                  isAdding={addingContactId === contact.Name}
                  existingTags={existingTags}
                />
              ))}
            </div>
          </div>
        )}

        {state === STATES.COMPLETE && (
          <SyncSummary
            stats={stats}
            onSyncAnother={handleSyncAnother}
            onViewContacts={handleViewContacts}
            recentlyAdded={recentlyAdded}
          />
        )}
      </div>
    </div>
  );
}

export default QuickSyncPage;
