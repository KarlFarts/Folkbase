import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';
import { useEntityDetection } from '../hooks/useEntityDetection';
import { addNote, linkNoteToContact, updateContact, readSheetData, SHEETS } from '../utils/devModeWrapper';
import { sanitizeFormData, sanitizeStringInput, SCHEMAS, INPUT_LIMITS } from '../utils/inputSanitizer';
import { scoreContact } from '../utils/contactCompleteness';
import Avatar from '../components/Avatar';
import EntitySuggestionsPanel from '../components/braindump/EntitySuggestionsPanel';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './ContactReviewPage.css';

function ContactReviewPage({ onNavigate }) {
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { guardWrite } = usePermissions();

  const [contacts, setContacts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Review state
  const [queue, setQueue] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [braindumpText, setBraindumpText] = useState('');

  // Entity detection for braindump
  const { detectedEntities, isDetecting } = useEntityDetection(braindumpText, {
    contacts,
    events,
  });

  // Load contacts and events on mount
  useEffect(() => {
    loadData();
  }, [accessToken, sheetId]);

  // Build queue whenever contacts or localStorage changes
  useEffect(() => {
    buildQueue();
  }, [contacts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsResult, eventsResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
        readSheetData(accessToken, sheetId, SHEETS.EVENTS),
      ]);

      setContacts(contactsResult?.data && Array.isArray(contactsResult.data) ? contactsResult.data : []);
      setEvents(eventsResult?.data && Array.isArray(eventsResult.data) ? eventsResult.data : []);
    } catch (err) {
      console.error('Failed to load data:', err);
      notify.error('Failed to load contacts and events');
    } finally {
      setLoading(false);
    }
  };

  const buildQueue = () => {
    const dismissed = JSON.parse(localStorage.getItem('folkbase_review_dismissed') || '[]');
    const snoozed = JSON.parse(localStorage.getItem('folkbase_review_snoozed') || '{}');
    const now = new Date();

    const filtered = contacts.filter((contact) => {
      const contactId = contact['Contact ID'];

      // Skip if dismissed
      if (dismissed.includes(contactId)) return false;

      // Skip if snoozed and snooze not expired
      if (snoozed[contactId]) {
        const snoozeUntil = new Date(snoozed[contactId]);
        if (snoozeUntil > now) return false;
        // Snooze expired, remove it
        delete snoozed[contactId];
      }

      return true;
    });

    // Save cleaned snoozed state
    localStorage.setItem('folkbase_review_snoozed', JSON.stringify(snoozed));

    // Score and sort
    const scored = filtered.map((contact) => ({
      contact,
      score: scoreContact(contact),
    }));

    scored.sort((a, b) => a.score - b.score);

    // Take top 50
    setQueue(scored.slice(0, 50));
    setSelectedContactId(null);
    setBraindumpText('');
  };

  const getDisplayName = (contact) => {
    return contact['Display Name'] || contact['First Name'] || contact['Last Name'] || 'Unknown';
  };

  const handleSave = async () => {
    if (!selectedContactId || !braindumpText.trim()) {
      notify.warn('Please write something before saving');
      return;
    }

    try {
      setSaving(true);
      const selected = queue.find((q) => q.contact['Contact ID'] === selectedContactId)?.contact;
      if (!selected) return;

      // Build update data from confirmed suggestions
      const updateData = {};

      // Collect confirmed tags
      if (detectedEntities.contacts?.length > 0) {
        // Not using contact detections for fields
      }

      // For now, we just save the text as a note and mark as reviewed
      // User can manually add tags/org via the suggestions they confirm

      // Sanitize and save as note
      const sanitizedText = sanitizeStringInput(braindumpText, INPUT_LIMITS.veryLongText);
      const noteData = {
        Content: sanitizedText,
        'Note Type': 'Review',
        Visibility: 'Private',
      };

      const noteId = await addNote(accessToken, sheetId, noteData, user?.email);
      if (noteId) {
        await linkNoteToContact(accessToken, sheetId, noteId, selectedContactId, user?.email);
      }

      // Mark as dismissed
      const dismissed = JSON.parse(localStorage.getItem('folkbase_review_dismissed') || '[]');
      if (!dismissed.includes(selectedContactId)) {
        dismissed.push(selectedContactId);
        localStorage.setItem('folkbase_review_dismissed', JSON.stringify(dismissed));
      }

      notify.success('Review saved');
      advanceToNext();
    } catch (err) {
      console.error('Save failed:', err);
      notify.error('Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (!selectedContactId) return;

    const snoozed = JSON.parse(localStorage.getItem('folkbase_review_snoozed') || '{}');
    const now = new Date();
    const snoozeUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    snoozed[selectedContactId] = snoozeUntil.toISOString();
    localStorage.setItem('folkbase_review_snoozed', JSON.stringify(snoozed));

    notify.info('Snoozed for 7 days');
    advanceToNext();
  };

  const handleDone = () => {
    onNavigate('contacts');
  };

  const advanceToNext = () => {
    // Rebuild queue
    buildQueue();
  };

  if (loading) {
    return <div className="crp-page"><p>Loading contacts...</p></div>;
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

  const selectedCard = queue.find((q) => q.contact['Contact ID'] === selectedContactId);

  return (
    <div className="crp-page">
      <div className="crp-header">
        <h1>Review Incomplete Contacts</h1>
        <p>{queue.length} contacts need your attention</p>
      </div>

      <div className="crp-queue">
        {queue.map((item) => (
          <div
            key={item.contact['Contact ID']}
            className={`crp-card ${selectedContactId === item.contact['Contact ID'] ? 'crp-card--selected' : ''}`}
            onClick={() =>
              setSelectedContactId(
                selectedContactId === item.contact['Contact ID'] ? null : item.contact['Contact ID']
              )
            }
          >
            <div className="crp-card-content">
              <Avatar name={getDisplayName(item.contact)} size="sm" />
              <div className="crp-card-info">
                <h3>{getDisplayName(item.contact)}</h3>
                <div className="crp-score-bar">
                  <div className="crp-score-fill" style={{ width: `${(item.score / 9) * 100}%` }} />
                </div>
                <p className="crp-score-text">
                  {item.score} of 9 fields filled
                </p>
              </div>
              <div className="crp-expand-icon">
                {selectedContactId === item.contact['Contact ID'] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {selectedContactId === item.contact['Contact ID'] && selectedCard && (
              <div className="crp-braindump-panel">
                <h4>What do you know about {getDisplayName(selectedCard.contact)}?</h4>
                <textarea
                  className="crp-textarea"
                  placeholder={`Write anything you know about ${getDisplayName(selectedCard.contact)}...`}
                  value={braindumpText}
                  onChange={(e) => setBraindumpText(e.target.value)}
                  maxLength={10000}
                />
                <div className="crp-char-count">{braindumpText.length} / 10000</div>

                {braindumpText.trim().length > 0 && (
                  <div className="crp-suggestions">
                    <EntitySuggestionsPanel entities={detectedEntities} isDetecting={isDetecting} />
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
                    Skip for now
                    <span className="crp-tooltip-icon" title="Snooze is saved on this device only.">
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
        ))}
      </div>
    </div>
  );
}

export default ContactReviewPage;
