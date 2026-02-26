import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveSheetId } from '../../utils/sheetResolver';
import { useNotification } from '../../contexts/NotificationContext';
import { addTouchpoint, logActivity, ACTIVITY_TYPES } from '../../utils/devModeWrapper';
import LogTouchpointMinimal from '../LogTouchpointMinimal';

function QuickActions({ onNavigate, onRefresh }) {
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [showLogModal, setShowLogModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveTouchpoint = async (touchpointData) => {
    try {
      setSaving(true);
      const result = await addTouchpoint(
        accessToken,
        sheetId,
        {
          ...touchpointData,
        },
        user.email
      );

      // Only log activity if contact is connected
      if (touchpointData['Contact ID']) {
        await logActivity(
          touchpointData['Contact ID'],
          ACTIVITY_TYPES.TOUCHPOINT_LOGGED,
          `${touchpointData.Type || 'Note'}: ${touchpointData.Notes ? touchpointData.Notes.substring(0, 50) + (touchpointData.Notes.length > 50 ? '...' : '') : 'No notes'}`,
          {
            relatedId: result?.touchpointId || '',
            relatedType: 'touchpoint',
            touchpointType: touchpointData.Type,
            outcome: touchpointData.Outcome,
          }
        );
      }

      setShowLogModal(false);

      // Refresh dashboard data
      if (onRefresh) {
        onRefresh();
      }
    } catch {
      notify.error('Failed to log touchpoint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sidebar-quick-actions">
        <button className="btn btn-primary btn-full" onClick={() => setShowLogModal(true)}>
          Log Touchpoint
        </button>
        <button className="btn btn-primary btn-full" onClick={() => onNavigate('add-contact')}>
          Add Contact
        </button>
        <button className="btn btn-primary btn-full" onClick={() => onNavigate('add-event')}>
          Create Event
        </button>
        <button
          className="btn btn-secondary btn-full"
          onClick={() => onNavigate('quick-sync')}
          title="Import contacts from your phone"
        >
          Quick Sync
        </button>
      </div>

      {showLogModal && (
        <LogTouchpointMinimal
          onClose={() => setShowLogModal(false)}
          onSave={handleSaveTouchpoint}
          saving={saving}
        />
      )}
    </>
  );
}

export default QuickActions;
