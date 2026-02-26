import { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import ContactSelector from './ContactSelector';
import WindowTemplate from './WindowTemplate';

/**
 * LogTouchpointQuickModal Component
 *
 * A two-stage modal for logging touchpoints with contact selection
 * Stage 1: Select contact from dropdown
 * Stage 2: Fill touchpoint form for selected contact
 *
 * @param {Array} contacts - Array of contact objects to choose from
 * @param {Function} onClose - Called when modal closed without saving
 * @param {Function} onSave - Called with (contactId, contactName, touchpointData)
 * @param {Boolean} saving - Shows loading state on save button
 * @param {Array} filterContactIds - Optional: only show these contact IDs
 */
function LogTouchpointQuickModal({ contacts, onClose, onSave, saving, filterContactIds = null }) {
  const { notify } = useNotification();
  const [selectedContactId, setSelectedContactId] = useState('');
  const [touchpointData, setTouchpointData] = useState({
    Date: new Date().toISOString().split('T')[0],
    Type: 'Call',
    Notes: '',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
    Outcome: '',
    'Duration (min)': '',
  });

  // Filter contacts if filterContactIds provided
  const availableContacts = filterContactIds
    ? contacts.filter((c) => filterContactIds.includes(c['Contact ID']))
    : contacts;

  const selectedContact = availableContacts.find((c) => c['Contact ID'] === selectedContactId);
  const selectedContactName = selectedContact
    ? `${selectedContact['First Name'] || ''} ${selectedContact['Last Name'] || ''}`.trim()
    : '';

  const handleSave = () => {
    if (!selectedContactId) {
      notify.warning('Please select a contact');
      return;
    }
    onSave(selectedContactId, selectedContactName, touchpointData);
  };

  const handleChangeContact = () => {
    setSelectedContactId('');
  };

  // Stage 1: Contact Selection
  if (!selectedContactId) {
    return (
      <WindowTemplate
        isOpen={true}
        onClose={onClose}
        title="Select Contact"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => {}} disabled={!selectedContactId}>
              Next
            </button>
          </>
        }
      >
        {availableContacts.length === 0 ? (
          <div className="ltqm-empty-state">
            <p>No contacts available. Add a contact first.</p>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Contact</label>
            <ContactSelector
              contacts={availableContacts}
              value={selectedContactId}
              onChange={setSelectedContactId}
              placeholder="Search contacts..."
            />
          </div>
        )}
      </WindowTemplate>
    );
  }

  // Stage 2: Touchpoint Form
  return (
    <WindowTemplate
      isOpen={true}
      onClose={onClose}
      title="Log Touchpoint"
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Log Touchpoint'}
          </button>
        </>
      }
    >
      {/* Selected Contact Display */}
      <div className="ltqm-contact-display">
        <div>
          <div className="ltqm-contact-label">
            Contact
          </div>
          <div className="ltqm-contact-name">{selectedContactName || 'Unknown Contact'}</div>
        </div>
        <button
          className="btn btn-ghost btn-sm ltqm-change-btn"
          onClick={handleChangeContact}
        >
          Change
        </button>
      </div>

      {/* Touchpoint Form */}
      <div className="form-group">
        <label className="form-label">Date</label>
        <input
          type="date"
          className="form-input"
          value={touchpointData.Date}
          onChange={(e) => setTouchpointData({ ...touchpointData, Date: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Type</label>
        <select
          className="form-select"
          value={touchpointData.Type}
          onChange={(e) => setTouchpointData({ ...touchpointData, Type: e.target.value })}
        >
          <option value="Call">Call</option>
          <option value="Text">Text</option>
          <option value="Email">Email</option>
          <option value="Meeting">Meeting</option>
          <option value="Event">Event</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          value={touchpointData.Notes}
          onChange={(e) => setTouchpointData({ ...touchpointData, Notes: e.target.value })}
          placeholder="What happened?"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Outcome</label>
        <select
          className="form-select"
          value={touchpointData.Outcome}
          onChange={(e) => setTouchpointData({ ...touchpointData, Outcome: e.target.value })}
        >
          <option value="">Select outcome...</option>
          <option value="Successful">Successful</option>
          <option value="No Answer">No Answer</option>
          <option value="Left Message">Left Message</option>
          <option value="Email Bounced">Email Bounced</option>
          <option value="Wrong Number">Wrong Number</option>
          <option value="Will Follow Up">Will Follow Up</option>
          <option value="Not Interested">Not Interested</option>
        </select>
      </div>

      <div className="ltqm-two-col-grid">
        <div className="form-group">
          <label className="form-label">Follow-up Needed</label>
          <select
            className="form-select"
            value={touchpointData['Follow-up Needed']}
            onChange={(e) =>
              setTouchpointData({ ...touchpointData, 'Follow-up Needed': e.target.value })
            }
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Duration (min)</label>
          <input
            type="number"
            className="form-input"
            value={touchpointData['Duration (min)']}
            onChange={(e) =>
              setTouchpointData({ ...touchpointData, 'Duration (min)': e.target.value })
            }
            placeholder="Minutes"
          />
        </div>
      </div>

      {touchpointData['Follow-up Needed'] === 'Yes' && (
        <div className="form-group">
          <label className="form-label">Follow-up Date</label>
          <input
            type="date"
            className="form-input"
            value={touchpointData['Follow-up Date']}
            onChange={(e) =>
              setTouchpointData({ ...touchpointData, 'Follow-up Date': e.target.value })
            }
          />
        </div>
      )}
    </WindowTemplate>
  );
}

export default LogTouchpointQuickModal;
