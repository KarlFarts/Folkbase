import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';
import { useEntityDetection } from '../hooks/useEntityDetection';
import {
  addNote,
  addContact,
  updateEvent,
  linkNoteToContact,
  readSheetData,
  SHEETS,
} from '../utils/devModeWrapper';
import { sanitizeStringInput, INPUT_LIMITS } from '../utils/inputSanitizer';
import { scoreContact } from '../utils/contactCompleteness';
import Avatar from '../components/Avatar';
import EntitySuggestionsPanel from '../components/braindump/EntitySuggestionsPanel';
import { ChevronDown, ChevronUp, UserPlus, GitMerge } from 'lucide-react';
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
  const [selectedUnresolvedKey, setSelectedUnresolvedKey] = useState(null);
  const [createName, setCreateName] = useState('');
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeMode, setMergeMode] = useState(false);
  const [creatingContact, setCreatingContact] = useState(false);
  const [braindumpText, setBraindumpText] = useState('');
  const [linkedEntities, setLinkedEntities] = useState(EMPTY_LINKED);

  const { detectedEntities, isDetecting } = useEntityDetection(braindumpText, { contacts, events });

  const buildQueue = useCallback((contactList, eventList = []) => {
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
      .map((contact) => ({ type: 'contact', contact, score: scoreContact(contact) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 50);

    // Extract unresolved attendees from events
    const unresolvedItems = [];
    for (const event of eventList) {
      const raw = event['Unresolved Attendees'];
      if (!raw) continue;
      let names;
      try {
        names = JSON.parse(raw);
      } catch {
        continue;
      }
      for (const name of names) {
        const dismissKey = `evt:${event['Event ID']}:${name}`;
        if (dismissed.includes(dismissKey)) continue;
        unresolvedItems.push({
          type: 'unresolved_attendee',
          name,
          eventId: event['Event ID'],
          eventName: event['Event Name'] || event['Event ID'],
        });
      }
    }

    setQueue([...unresolvedItems, ...scored]);
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
        buildQueue(loadedContacts, loadedEvents);
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
      buildQueue(contacts, events);
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
    buildQueue(contacts, events);
  };

  const handleDone = (e) => {
    e.stopPropagation();
    onNavigate('contacts');
  };

  const handleDismissUnresolved = (eventId, name) => {
    const dismissKey = `evt:${eventId}:${name}`;
    const dismissed = JSON.parse(localStorage.getItem('folkbase_review_dismissed') || '[]');
    if (!dismissed.includes(dismissKey)) {
      dismissed.push(dismissKey);
      localStorage.setItem('folkbase_review_dismissed', JSON.stringify(dismissed));
    }
    buildQueue(contacts, events);
  };

  const resolveUnresolved = async (eventId, name, newContactId = null) => {
    const event = events.find((e) => e['Event ID'] === eventId);
    if (!event) return;
    let names;
    try {
      names = JSON.parse(event['Unresolved Attendees'] || '[]');
    } catch {
      names = [];
    }
    const nextNames = names.filter((n) => n !== name);
    const updates = { 'Unresolved Attendees': JSON.stringify(nextNames) };
    if (newContactId) {
      const existing = (event['Attendees'] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!existing.includes(newContactId)) {
        updates['Attendees'] = [...existing, newContactId].join(', ');
      }
    }
    await updateEvent(accessToken, sheetId, eventId, updates);
    setEvents((prev) => prev.map((e) => (e['Event ID'] === eventId ? { ...e, ...updates } : e)));
  };

  const handleCreateContact = async (eventId, name) => {
    if (!guardWrite()) return;
    try {
      setCreatingContact(true);
      const parts = createName.trim().split(' ');
      const contactData = {
        'First Name': parts[0] || createName.trim(),
        'Last Name': parts.slice(1).join(' ') || '',
        'Display Name': createName.trim(),
      };
      const newId = await addContact(accessToken, sheetId, contactData, user?.email);
      if (newId) {
        await resolveUnresolved(eventId, name, newId);
        handleDismissUnresolved(eventId, name);
        notify.success(`Contact "${createName.trim()}" created`);
      }
    } catch (err) {
      console.error('Failed to create contact:', err);
      notify.error('Failed to create contact');
    } finally {
      setCreatingContact(false);
    }
  };

  const handleMergeContact = async (eventId, name, contactId) => {
    if (!guardWrite()) return;
    try {
      await resolveUnresolved(eventId, name, contactId);
      handleDismissUnresolved(eventId, name);
      notify.success('Attendee linked to contact');
    } catch (err) {
      console.error('Failed to merge:', err);
      notify.error('Failed to link attendee');
    }
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
          if (item.type === 'unresolved_attendee') {
            const itemKey = `${item.eventId}:${item.name}`;
            const isSelected = selectedUnresolvedKey === itemKey;
            return (
              <div
                key={itemKey}
                className={`crp-card${isSelected ? ' crp-card--selected' : ''}`}
                onClick={() => {
                  setSelectedUnresolvedKey((prev) => (prev === itemKey ? null : itemKey));
                  setCreateName(item.name);
                  setMergeSearch('');
                  setMergeMode(false);
                }}
              >
                <div className="crp-card-content">
                  <div className="crp-unresolved-icon">?</div>
                  <div className="crp-card-info">
                    <h3>{item.name}</h3>
                    <p className="crp-score-text">from: {item.eventName}</p>
                  </div>
                  <span className="badge badge-status-inactive crp-unresolved-badge">
                    Unresolved attendee
                  </span>
                  <div className="crp-expand-icon">
                    {isSelected ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {isSelected && (
                  <div className="crp-braindump-panel" onClick={(e) => e.stopPropagation()}>
                    {!mergeMode ? (
                      <>
                        <label className="form-label">Name</label>
                        <input
                          className="crp-unresolved-name-input"
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          placeholder="Edit name before creating..."
                        />
                        <div className="crp-actions" style={{ marginTop: 'var(--spacing-md)' }}>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleCreateContact(item.eventId, item.name)}
                            disabled={creatingContact || !createName.trim()}
                          >
                            <UserPlus size={14} />
                            {creatingContact ? 'Creating...' : 'Create Contact'}
                          </button>
                          <button className="btn btn-secondary" onClick={() => setMergeMode(true)}>
                            <GitMerge size={14} /> Merge with existing
                          </button>
                          <button
                            className="btn btn-tertiary"
                            onClick={() => handleDismissUnresolved(item.eventId, item.name)}
                          >
                            Dismiss
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="form-label">Search contacts to merge with</label>
                        <input
                          className="crp-unresolved-name-input"
                          value={mergeSearch}
                          onChange={(e) => setMergeSearch(e.target.value)}
                          placeholder="Type to search..."
                          autoFocus
                        />
                        <div className="crp-merge-list">
                          {contacts
                            .filter((c) => {
                              const q = mergeSearch.toLowerCase();
                              return (
                                q.length > 0 &&
                                ((c['Display Name'] || '').toLowerCase().includes(q) ||
                                  (c['First Name'] || '').toLowerCase().includes(q) ||
                                  (c['Last Name'] || '').toLowerCase().includes(q))
                              );
                            })
                            .slice(0, 8)
                            .map((c) => (
                              <button
                                key={c['Contact ID']}
                                className="crp-merge-option"
                                onClick={() =>
                                  handleMergeContact(item.eventId, item.name, c['Contact ID'])
                                }
                              >
                                {c['Display Name'] || `${c['First Name']} ${c['Last Name']}`.trim()}
                              </button>
                            ))}
                        </div>
                        <button
                          className="btn btn-tertiary"
                          style={{ marginTop: 'var(--spacing-sm)' }}
                          onClick={() => setMergeMode(false)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          }

          // Contact item
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
