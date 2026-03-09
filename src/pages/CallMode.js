import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Phone, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  addTouchpoint,
  logActivity,
  ACTIVITY_TYPES,
  readSheetData,
  SHEETS,
} from '../utils/devModeWrapper';
import Timer from '../components/Timer';

export default function CallMode({ onNavigate }) {
  const { contactId } = useParams();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { guardWrite } = usePermissions();

  const [notes, setNotes] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [closing, setClosing] = useState(false);

  // Load contact data on mount
  useEffect(() => {
    const loadContact = async () => {
      try {
        const { data: contacts } = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
        const foundContact = contacts.find((c) => c['Contact ID'] === contactId);
        setContact(foundContact);
      } catch {
        // Silently fail - contact may not exist
      } finally {
        setLoading(false);
      }
    };
    loadContact();
  }, [contactId, accessToken, sheetId]);

  const handleCloseCall = useCallback(async () => {
    if (!guardWrite('touchpoints')) return;
    setClosing(true);

    try {
      // Create touchpoint with auto-logged data
      const touchpointData = {
        'Contact ID': contactId,
        'Contact Name': contact?.Name || '',
        Date: new Date().toISOString().split('T')[0],
        Type: 'Call',
        'Duration (min)': Math.round(elapsedSeconds / 60),
        Notes: notes,
        'Follow-up Needed': 'No',
        Outcome: 'Successful',
      };

      await addTouchpoint(accessToken, sheetId, touchpointData, user.email);

      // Log activity for audit trail
      await logActivity(
        contactId,
        ACTIVITY_TYPES.TOUCHPOINT_LOGGED,
        `Call logged: ${Math.round(elapsedSeconds / 60)} minutes${notes ? ` - ${notes.substring(0, 50)}...` : ''}`,
        { relatedId: 'call-mode-auto' }
      );

      // Brief success feedback
      setTimeout(() => {
        onNavigate('contact-profile', contactId);
      }, 1000);
    } catch {
      notify.error('Failed to save call. Please try again.');
      setClosing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, contact, elapsedSeconds, notes, accessToken, sheetId, user.email, onNavigate]);

  if (loading) {
    return <div className="focus-mode-loading">Loading...</div>;
  }

  if (!contact) {
    return <div className="focus-mode-loading">Contact not found</div>;
  }

  return (
    <div className="focus-mode">
      {/* Header */}
      <div className="focus-mode-header">
        <div>
          <h1 className="focus-mode-title">
            <Phone size={16} className="focus-mode-title-icon" /> Call with {contact?.Name}
          </h1>
          <small className="focus-mode-subtitle">{contact?.Organization}</small>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onNavigate('contact-profile', contactId)}
          disabled={closing}
        >
          <X size={16} />
        </button>
      </div>

      {/* Main Content */}
      <div className="focus-mode-body">
        <Timer onTimeUpdate={setElapsedSeconds} />

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea focus-mode-textarea"
            placeholder="Take notes during the call..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <small className="text-muted">Optional - will be saved with the touchpoint</small>
        </div>
      </div>

      {/* Footer */}
      <div className="focus-mode-footer">
        <button
          className="btn btn-secondary"
          onClick={() => onNavigate('contact-profile', contactId)}
          disabled={closing}
        >
          Discard & Close
        </button>
        <button className="btn btn-primary" onClick={handleCloseCall} disabled={closing}>
          {closing ? 'Saving...' : 'Close Call'}
        </button>
      </div>
    </div>
  );
}
