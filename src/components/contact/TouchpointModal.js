import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import WindowTemplate from '../WindowTemplate';

/**
 * LogTouchpointModal - Modal for logging a new touchpoint
 */
export function LogTouchpointModal({ touchpointData, setTouchpointData, onClose, onSave, saving }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <WindowTemplate
      isOpen={true}
      onClose={onClose}
      title="Log Touchpoint"
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Log Touchpoint'}
          </button>
        </>
      }
    >
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

      <div className="tpm-two-col">
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

      <button
        type="button"
        className="tpm-details-toggle"
        onClick={() => setShowDetails((prev) => !prev)}
      >
        {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showDetails ? 'Hide details' : 'More details'}
      </button>

      {showDetails && (
        <>
          <div className="form-group">
            <label className="form-label">Attendees</label>
            <input
              type="text"
              className="form-input"
              value={touchpointData['Attendees'] || ''}
              onChange={(e) =>
                setTouchpointData({ ...touchpointData, Attendees: e.target.value })
              }
              placeholder="Names of attendees"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={touchpointData['Location'] || ''}
              onChange={(e) =>
                setTouchpointData({ ...touchpointData, Location: e.target.value })
              }
              placeholder="Where did this happen?"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Linked Event ID</label>
            <input
              type="text"
              className="form-input"
              value={touchpointData['Event ID'] || ''}
              onChange={(e) =>
                setTouchpointData({ ...touchpointData, 'Event ID': e.target.value })
              }
              placeholder="e.g. EVT001"
            />
          </div>
        </>
      )}
    </WindowTemplate>
  );
}

/**
 * EditTouchpointModal - Modal for editing an existing touchpoint
 */
export function EditTouchpointModal({
  touchpoint,
  formData,
  setFormData,
  onClose,
  onSave,
  saving,
}) {
  return (
    <WindowTemplate
      isOpen={true}
      onClose={onClose}
      title="Edit Touchpoint"
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Contact</label>
        <input
          type="text"
          className="form-input tpm-disabled-input"
          value={touchpoint['Contact Name'] || ''}
          disabled
        />
      </div>

      <div className="form-group">
        <label className="form-label">Date *</label>
        <input
          type="date"
          className="form-input"
          value={formData.Date}
          onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Type *</label>
        <select
          className="form-select"
          value={formData.Type}
          onChange={(e) => setFormData({ ...formData, Type: e.target.value })}
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
          value={formData.Notes}
          onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
          placeholder="What happened?"
          rows={4}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Outcome</label>
        <select
          className="form-select"
          value={formData.Outcome}
          onChange={(e) => setFormData({ ...formData, Outcome: e.target.value })}
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

      <div className="tpm-two-col">
        <div className="form-group">
          <label className="form-label">Follow-up Needed</label>
          <select
            className="form-select"
            value={formData['Follow-up Needed']}
            onChange={(e) => setFormData({ ...formData, 'Follow-up Needed': e.target.value })}
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
            value={formData['Duration (min)']}
            onChange={(e) => setFormData({ ...formData, 'Duration (min)': e.target.value })}
            placeholder="Minutes"
          />
        </div>
      </div>

      {formData['Follow-up Needed'] === 'Yes' && (
        <div className="form-group">
          <label className="form-label">Follow-up Date *</label>
          <input
            type="date"
            className="form-input"
            value={formData['Follow-up Date']}
            onChange={(e) => setFormData({ ...formData, 'Follow-up Date': e.target.value })}
          />
        </div>
      )}
    </WindowTemplate>
  );
}

/**
 * TouchpointDetailModal - Modal for viewing touchpoint details
 */
export function TouchpointDetailModal({ touchpoint, onClose, onEdit, onDelete }) {
  if (!touchpoint) return null;

  return (
    <WindowTemplate
      isOpen={true}
      onClose={onClose}
      title={touchpoint['Type']}
      size="md"
      footer={
        <div className="tpm-footer-row">
          <div>
            {onDelete && (
              <button
                className="btn btn-ghost btn-sm tpm-delete-btn"
                onClick={() => onDelete(touchpoint)}
                title="Delete touchpoint"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
          <div className="tpm-footer-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {onEdit && (
              <button className="btn btn-primary" onClick={() => onEdit(touchpoint)}>
                Edit Touchpoint
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="tpm-detail-body">
        {/* Date */}
        <div>
          <label className="form-label">Date</label>
          <p>{touchpoint['Date']}</p>
        </div>

        {/* Notes */}
        {touchpoint['Notes'] && (
          <div>
            <label className="form-label">Notes</label>
            <p className="tpm-notes-text">{touchpoint['Notes']}</p>
          </div>
        )}

        {/* Outcome */}
        {touchpoint['Outcome'] && (
          <div>
            <label className="form-label">Outcome</label>
            <span className="tag">{touchpoint['Outcome']}</span>
          </div>
        )}

        {/* Duration */}
        {touchpoint['Duration (min)'] && (
          <div>
            <label className="form-label">Duration</label>
            <p>{touchpoint['Duration (min)']} minutes</p>
          </div>
        )}

        {/* Follow-up */}
        {touchpoint['Follow-up Needed'] === 'Yes' && (
          <div>
            <label className="form-label">Follow-up</label>
            <div className="tpm-followup-row">
              <span className="badge badge-priority-high">Follow-up needed</span>
              {touchpoint['Follow-up Date'] && (
                <span className="text-muted">by {touchpoint['Follow-up Date']}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </WindowTemplate>
  );
}
