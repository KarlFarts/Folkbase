import { useState } from 'react';
import { X } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import ContactSelector from '../ContactSelector';

/**
 * IncompleteTouchpointsWidget Component
 *
 * Dashboard widget showing touchpoints with Status='incomplete'
 * Allows user to complete touchpoints by adding contact and metadata
 *
 * @param {Array} incompleteTouchpoints - Touchpoints with Status='incomplete'
 * @param {Array} contacts - All contacts for selection
 * @param {Function} onCompleteTouchpoint - Called with (touchpointId, updatedData)
 * @param {Boolean} loading - Loading state
 */
function IncompleteTouchpointsWidget({ incompleteTouchpoints, contacts, onCompleteTouchpoint }) {
  const { notify } = useNotification();
  const [editingTouchpoint, setEditingTouchpoint] = useState(null);
  const [touchpointData, setTouchpointData] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleEditClick = (touchpoint) => {
    setEditingTouchpoint(touchpoint);
    setTouchpointData({
      'Contact ID': '',
      Date: touchpoint.Date || new Date().toISOString().split('T')[0],
      Type: touchpoint.Type || 'Call',
      Notes: touchpoint.Notes || '',
      Outcome: touchpoint.Outcome || '',
      'Follow-up Needed': touchpoint['Follow-up Needed'] || 'No',
      'Follow-up Date': touchpoint['Follow-up Date'] || '',
      'Duration (min)': touchpoint['Duration (min)'] || '',
    });
  };

  const handleSave = async () => {
    if (!touchpointData['Contact ID']) {
      notify.warning('Please select a contact to complete this touchpoint');
      return;
    }

    setSaving(true);
    try {
      // Find contact name
      const contact = contacts.find((c) => c['Contact ID'] === touchpointData['Contact ID']);
      const contactName = contact
        ? `${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim()
        : '';

      await onCompleteTouchpoint(editingTouchpoint['Touchpoint ID'], {
        ...touchpointData,
        'Contact Name': contactName,
      });

      setEditingTouchpoint(null);
      setTouchpointData(null);
    } catch (error) {
      notify.error(`Failed to complete touchpoint: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setEditingTouchpoint(null);
    setTouchpointData(null);
  };

  const truncateNotes = (notes, maxLength = 50) => {
    if (!notes || notes.length <= maxLength) return notes;
    return notes.substring(0, maxLength) + '...';
  };

  if (!incompleteTouchpoints || incompleteTouchpoints.length === 0) {
    return null; // Don't show widget if no incomplete touchpoints
  }

  return (
    <>
      <div className="sidebar-section">
        <h3 className="itw-heading">
          Incomplete Touchpoints
          <span className="itw-count-badge">{incompleteTouchpoints.length}</span>
        </h3>

        <div className="itw-list">
          {incompleteTouchpoints.slice(0, 5).map((touchpoint) => (
            <div key={touchpoint['Touchpoint ID']} className="itw-item">
              <div className="itw-item-header">
                <div className="itw-item-date">{touchpoint.Date || 'No date'}</div>
                <button
                  className="btn btn-primary btn-sm itw-complete-btn"
                  onClick={() => handleEditClick(touchpoint)}
                >
                  Complete
                </button>
              </div>
              <div className="itw-item-notes">{truncateNotes(touchpoint.Notes)}</div>
            </div>
          ))}
        </div>

        {incompleteTouchpoints.length > 5 && (
          <div className="itw-more">+ {incompleteTouchpoints.length - 5} more</div>
        )}
      </div>

      {/* Edit Modal */}
      {editingTouchpoint && touchpointData && (
        <div className="itw-modal-overlay">
          <div className="card itw-modal-card">
            <div className="card-header">
              <h3>Complete Touchpoint</h3>
              <button className="btn btn-ghost btn-sm" onClick={handleClose}>
                <X size={16} />
              </button>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Contact *</label>
                <ContactSelector
                  contacts={contacts}
                  value={touchpointData['Contact ID']}
                  onChange={(contactId) =>
                    setTouchpointData({ ...touchpointData, 'Contact ID': contactId })
                  }
                  placeholder="Select a contact..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
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
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Outcome</label>
                <select
                  className="form-select"
                  value={touchpointData.Outcome}
                  onChange={(e) =>
                    setTouchpointData({ ...touchpointData, Outcome: e.target.value })
                  }
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

              <div className="itw-form-two-col">
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
                  <label className="form-label">Follow-up Date *</label>
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
            </div>
            <div className="card-footer itw-modal-footer">
              <button className="btn btn-secondary" onClick={handleClose} disabled={saving}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !touchpointData['Contact ID']}
              >
                {saving ? 'Saving...' : 'Complete Touchpoint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default IncompleteTouchpointsWidget;
