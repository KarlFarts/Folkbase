import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';
import { useEntityDetection } from '../hooks/useEntityDetection';
import { addNote, linkNoteToContact, readSheetData, SHEETS } from '../utils/devModeWrapper';
import { sanitizeStringInput, INPUT_LIMITS } from '../utils/inputSanitizer';
import { scoreContact } from '../utils/contactCompleteness';
import Avatar from '../components/Avatar';
import EntitySuggestionsPanel from '../components/braindump/EntitySuggestionsPanel';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './ContactReviewPage.css';

const EMPTY_LINKED = { contacts: [], events: [], locations: [], tasks: [] };

function ContactReviewPage({ onNavigate }) {
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { guardWrite } = usePermissions();

  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [queue, setQueue] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [braindumpText, setBraindumpText] = useState('');
  const [linkedEntities, setLinkedEntities] = useState(EMPTY_LINKED);

  const { detectedEntities, isDetecting } = useEntityDetection(braindumpText, { contacts, events });

  const buildQueue = useCallback((contactList) => {
    const dismissed = JSON.parse(localStorage.getItem('folkbase_review_dismissed') || '[]');
    const snoozed = JSON.parse(localStorage.getItem('folkbase_review_snoozed') || '{}');
    const now = new Date();
    let snoozedChanged = false;

    const filtered = contactList.filter((contact) => {
      const contactId = contact['Contact ID'];
      if (dismissed.includes(contactId)) return false;
      if (snoozed[contactId]) {
        const snoozeUntil = new Date(snoozed[contactId]);
        if (snoozeUntil > now) return false;
        delete snoozed[contactId];
        snoozedChanged = true;
      }
      return true;
    });

    if (snoozedChanged) {
      localStorage.setItem('folkbase_review_snoozed', JSON.stringify(snoozed));
    }

    const scored = filtered
      .map((contact) => ({ contact, score: scoreContact(contact) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 50);

    setQueue(scored);
    setSelectedContactId(null);
    setBraindumpText('');
    setLinkedEntities(EMPTY_LINKED);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [contactsResult, eventsResult] = await Promise.all([
          readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
          readSheetData(accessToken, sheetId, SHEETS.EVENTS),
        ]);
        const loadedContacts =
          contactsResult?.data && Array.isArray(contactsResult.data) ? contactsResult.data : [];
        const loadedEvents =
          eventsResult?.data && Array.isArray(eventsResult.data) ? eventsResult.data : [];
        setContacts(loadedContacts);
        setEvents(loadedEvents);
        buildQueue(loadedContacts);
      } catch (err) {
        console.error('Failed to load data:', err);
        notify.error('Failed to load contacts and events');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken || import.meta.env.VITE_DEV_MODE === 'true') {
      loadData();
    }
  }, [accessToken, sheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectContact = (contactId) => {
    setSelectedContactId((prev) => (prev === contactId ? null : contactId));
    setBraindumpText('');
    setLinkedEntities(EMPTY_LINKED);
  };

  const handleLinkEntity = (entity, type) => {
    setLinkedEntities((prev) => ({
      ...prev,
      [type + 's']: [...prev[type + 's'], entity],
    }));
  };

  const handleIgnoreEntity = (_entity, _type) => {
    // User dismissed the suggestion — no action needed
  };

  const handleAcceptAllHighConfidence = () => {
    if (!detectedEntities) return;
    const { CONFIDENCE_THRESHOLD } = { CONFIDENCE_THRESHOLD: { AUTO_LINK: 85 } };
    setLinkedEntities({
      contacts: detectedEntities.contacts.filter((e) => e.confidence >= CONFIDENCE_THRESHOLD),
      events: detectedEntities.events.filter((e) => e.confidence >= CONFIDENCE_THRESHOLD),
      locations: detectedEntities.locations.filter((e) => e.confidence >= CONFIDENCE_THRESHOLD),
      tasks: detectedEntities.tasks.filter((e) => e.confidence >= CONFIDENCE_THRESHOLD),
    });
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    if (!selectedContactId || !braindumpText.trim()) {
      notify.warn('Please write something before saving');
      return;
    }

    if (!guardWrite()) return;

    try {
      setSaving(true);

      const sanitizedText = sanitizeStringInput(braindumpText, INPUT_LIMITS.veryLongText);
      const noteData = {
        Content: sanitizedText,
        'Note Type': 'Review',
        Visibility: 'Private',
      };

      const noteId = await addNote(accessToken, sheetId, noteData, user?.email);

      if (noteId) {
        // Link note to the contact being reviewed
        await linkNoteToContact(accessToken, sheetId, noteId, selectedContactId, user?.email);

        // Link note to any confirmed contacts from suggestions
        for (const linked of linkedEntities.contacts) {
          if (linked.contactId && linked.contactId !== selectedContactId) {
            await linkNoteToContact(accessToken, sheetId, noteId, linked.contactId, user?.email);
          }
        }
      } else {
        console.error('addNote did not return a noteId');
      }

      // Mark as dismissed
      const dismissed = JSON.parse(localStorage.getItem('folkbase_review_dismissed') || '[]');
      if (!dismissed.includes(selectedContactId)) {
        dismissed.push(selectedContactId);
        localStorage.setItem('folkbase_review_dismissed', JSON.stringify(dismissed));
      }

      notify.success('Review saved');
      buildQueue(contacts);
    } catch (err) {
      console.error('Save failed:', err);
      notify.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = (e) => {
    e.stopPropagation();
    if (!selectedContactId) return;

    const snoozed = JSON.parse(localStorage.getItem('folkbase_review_snoozed') || '{}');
    snoozed[selectedContactId] = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('folkbase_review_snoozed', JSON.stringify(snoozed));

    notify.info('Snoozed for 7 days');
    buildQueue(contacts);
  };

  const handleDone = (e) => {
    e.stopPropagation();
    onNavigate('contacts');
  };

  const getDisplayName = (contact) =>
    contact['Display Name'] || contact['First Name'] || contact['Last Name'] || 'Unknown';

  if (loading) {
    return (
      <div className="crp-page">
        <p>Loading contacts...</p>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="crp-page">
        <div className="crp-empty">
          <h2>No contacts to review</h2>
          <p>All your contacts are caught up. Great job!</p>
          <button className="btn btn-primary" onClick={() => onNavigate('contacts')}>
            Back to Contacts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="crp-page">
      <div className="crp-header">
        <h1>Review Incomplete Contacts</h1>
        <p>{queue.length} contacts need your attention</p>
      </div>

      <div className="crp-queue">
        {queue.map((item) => {
          const contactId = item.contact['Contact ID'];
          const isSelected = selectedContactId === contactId;

          return (
            <div
              key={contactId}
              className={`crp-card${isSelected ? ' crp-card--selected' : ''}`}
              onClick={() => handleSelectContact(contactId)}
            >
              <div className="crp-card-content">
                <Avatar name={getDisplayName(item.contact)} size="sm" />
                <div className="crp-card-info">
                  <h3>{getDisplayName(item.contact)}</h3>
                  <div className="crp-score-bar">
                    <div
                      className="crp-score-fill"
                      style={{ width: `${(item.score / 9) * 100}%` }}
                    />
                  </div>
                  <p className="crp-score-text">{item.score} of 9 fields filled</p>
                </div>
                <div className="crp-expand-icon">
                  {isSelected ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isSelected && (
                <div className="crp-braindump-panel" onClick={(e) => e.stopPropagation()}>
                  <h4>What do you know about {getDisplayName(item.contact)}?</h4>
                  <textarea
                    className="crp-textarea"
                    placeholder={`Write anything you know about ${getDisplayName(item.contact)}...`}
                    value={braindumpText}
                    onChange={(e) => setBraindumpText(e.target.value)}
                    maxLength={10000}
                  />
                  <div className="crp-char-count">{braindumpText.length} / 10000</div>

                  {braindumpText.trim().length > 0 && (
                    <div className="crp-suggestions">
                      <EntitySuggestionsPanel
                        detectedEntities={detectedEntities}
                        linkedEntities={linkedEntities}
                        isDetecting={isDetecting}
                        onLinkEntity={handleLinkEntity}
                        onIgnoreEntity={handleIgnoreEntity}
                        onDisambiguate={handleIgnoreEntity}
                        onAcceptAllHighConfidence={handleAcceptAllHighConfidence}
                      />
                    </div>
                  )}

                  <div className="crp-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleSave}
                      disabled={saving || !braindumpText.trim()}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleSkip} disabled={saving}>
                      Skip for now{' '}
                      <span
                        className="crp-tooltip-icon"
                        title="Snooze is saved on this device only."
                      >
                        ⓘ
                      </span>
                    </button>
                    <button className="btn btn-tertiary" onClick={handleDone} disabled={saving}>
                      Done for now
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ContactReviewPage;
