import { useState } from 'react';
import { X } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

/**
 * LogTouchpointMinimal Component
 *
 * Minimal quick-capture modal for logging touchpoints
 * Only requires notes - contact and other metadata optional
 * Creates touchpoint with Status='incomplete' if no contact
 *
 * @param {Function} onClose - Called when modal closed without saving
 * @param {Function} onSave - Called with touchpointData (no contact required)
 * @param {Boolean} saving - Shows loading state on save button
 */
function LogTouchpointMinimal({ onClose, onSave, saving }) {
  const { notify } = useNotification();
  const [touchpointData, setTouchpointData] = useState({
    Date: new Date().toISOString().split('T')[0],
    Notes: ''
  });

  const handleSave = () => {
    if (!touchpointData.Notes.trim()) {
      notify.warning('Please enter some notes');
      return;
    }
    onSave(touchpointData);
  };

  const handleKeyDown = (e) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="ltm-overlay">
      <div className="card ltm-card">
        <div className="card-header">
          <h3>Quick Note</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={touchpointData.Date}
              onChange={(e) => setTouchpointData({...touchpointData, Date: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes *</label>
            <textarea
              className="form-textarea"
              value={touchpointData.Notes}
              onChange={(e) => setTouchpointData({...touchpointData, Notes: e.target.value})}
              onKeyDown={handleKeyDown}
              placeholder="What happened? (You can add contact details later)"
              rows={6}
              autoFocus
            />
            <div className="ltm-tip">
              Tip: Press ⌘+Enter to save
            </div>
          </div>
        </div>
        <div className="card-footer ltm-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !touchpointData.Notes.trim()}
          >
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogTouchpointMinimal;
