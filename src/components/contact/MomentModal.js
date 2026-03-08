import { useState } from 'react';
import { X } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';

const MOMENT_TYPES = ['Vacation', 'Trip', 'Family Event', 'Funeral', 'Celebration', 'Other'];

/**
 * MomentModal - Add or Edit a Moment
 *
 * Props:
 *   isOpen         {boolean}
 *   onClose        {function}
 *   onSave         {function}
 *   saving         {boolean}
 *   momentId       {string|null}  null = Add, string = Edit
 *   momentData     {object}       controlled form state
 *   setMomentData  {function}
 *   allContacts    {array}        full contacts list for People search
 *   currentContactId {string}    exclude from People suggestions
 */
export default function MomentModal({
  isOpen,
  onClose,
  onSave,
  saving,
  momentId = null,
  momentData,
  setMomentData,
  allContacts = [],
  currentContactId,
}) {
  const [peopleSearch, setPeopleSearch] = useState('');

  const isEdit = Boolean(momentId);

  // Parse current ContactIDs into array
  const taggedIds = (momentData['Contact IDs'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Contacts available to tag: exclude current contact + already tagged
  const suggestions = allContacts.filter((c) => {
    const id = c['Contact ID'];
    if (id === currentContactId) return false;
    if (taggedIds.includes(id)) return false;
    const name = (c['Display Name'] || c['First Name'] || c.Name || '').toLowerCase();
    return !peopleSearch || name.includes(peopleSearch.toLowerCase());
  });

  const addPerson = (contact) => {
    const newIds = [...taggedIds, contact['Contact ID']].join(',');
    setMomentData({ ...momentData, 'Contact IDs': newIds });
    setPeopleSearch('');
  };

  const removePerson = (id) => {
    const newIds = taggedIds.filter((i) => i !== id).join(',');
    setMomentData({ ...momentData, 'Contact IDs': newIds });
  };

  const getContactName = (id) => {
    const c = allContacts.find((c) => c['Contact ID'] === id);
    return c ? c['Display Name'] || c['First Name'] || c.Name || id : id;
  };

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Moment' : 'Add Moment'}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Moment'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Beach vacation in Florida"
          value={momentData.Title}
          onChange={(e) => setMomentData({ ...momentData, Title: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Type</label>
        <select
          className="form-select"
          value={momentData.Type}
          onChange={(e) => setMomentData({ ...momentData, Type: e.target.value })}
        >
          {MOMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input
            type="date"
            className="form-input"
            value={momentData['Start Date']}
            onChange={(e) => setMomentData({ ...momentData, 'Start Date': e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-input"
            value={momentData['End Date']}
            onChange={(e) => setMomentData({ ...momentData, 'End Date': e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Location</label>
        <input
          type="text"
          className="form-input"
          placeholder="Where did this happen?"
          value={momentData.Location}
          onChange={(e) => setMomentData({ ...momentData, Location: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          rows={5}
          placeholder="Any details to remember..."
          value={momentData.Notes}
          onChange={(e) => setMomentData({ ...momentData, Notes: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">People</label>
        {taggedIds.length > 0 && (
          <div className="moment-people-chips">
            {taggedIds.map((id) => (
              <span key={id} className="moment-chip">
                {getContactName(id)}
                <button
                  className="moment-chip-remove"
                  onClick={() => removePerson(id)}
                  aria-label={`Remove ${getContactName(id)}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          className="form-input"
          placeholder="Search contacts..."
          value={peopleSearch}
          onChange={(e) => setPeopleSearch(e.target.value)}
        />
        {peopleSearch && suggestions.length > 0 && (
          <ul className="moment-suggestions">
            {suggestions.slice(0, 6).map((c) => (
              <li key={c['Contact ID']} className="moment-suggestion-item">
                <button onClick={() => addPerson(c)}>
                  {c['Display Name'] || c['First Name'] || c.Name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WindowTemplate>
  );
}
