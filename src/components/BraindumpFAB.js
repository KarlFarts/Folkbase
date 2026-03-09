import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StickyNote, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { addNote } from '../utils/devModeWrapper';
import { getUIPreferences } from '../services/braindumpPreferences';
import ConfirmDialog from './ConfirmDialog';
import './BraindumpFAB.css';

/**
 * BraindumpFAB Component
 * Floating Action Button for quick braindump capture
 * Accessible from anywhere in the app via click or Ctrl/Cmd+B
 */
function BraindumpFAB() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const textareaRef = useRef(null);

  // Load visibility preference
  useEffect(() => {
    const prefs = getUIPreferences();
    setIsVisible(prefs.showFAB !== false);
  }, []);

  // Hide FAB on braindump page (redundant)
  useEffect(() => {
    if (location.pathname === '/braindump') {
      setIsExpanded(false);
    }
  }, [location]);

  // Keyboard shortcut: Ctrl/Cmd + B
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + B to toggle FAB
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();

        // If on braindump page, navigate away first
        if (location.pathname === '/braindump') {
          return;
        }

        setIsExpanded((prev) => !prev);
      }

      // Escape to close
      if (e.key === 'Escape' && isExpanded) {
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, location]);

  // Auto-focus textarea when expanded
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const handleSave = async () => {
    if (!content || content.trim().length === 0) {
      notify.warning('Please enter some content');
      return;
    }

    try {
      setSaving(true);

      const noteData = {
        Content: content.trim(),
        'Note Type': 'Braindump',
        Status: 'Unprocessed',
        Visibility: 'Workspace-Wide',
        'Created By': user?.email || '',
      };

      await addNote(accessToken, sheetId, noteData);

      notify.success('Braindump saved! Review in Notes Inbox.');

      // Clear and collapse
      setContent('');
      setIsExpanded(false);
    } catch {
      notify.error('Failed to save braindump');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (content && content.trim().length > 0) {
      setShowDiscardConfirm(true);
      return;
    }
    setContent('');
    setIsExpanded(false);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    setContent('');
    setIsExpanded(false);
  };

  const handleKeyDown = (e) => {
    // Cmd/Ctrl + Enter to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleFullMode = () => {
    setContent('');
    setIsExpanded(false);
    navigate('/braindump');
  };

  // Don't show on braindump page
  if (location.pathname === '/braindump') {
    return null;
  }

  // Don't show if user disabled
  if (!isVisible) {
    return null;
  }

  return (
    <>
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowDiscardConfirm(false)}
        title="Discard Braindump"
        message="Discard your unsaved braindump? This text will be lost."
        confirmLabel="Discard"
      />
      <div className={`braindump-fab ${isExpanded ? 'expanded' : ''}`}>
        {!isExpanded ? (
          <button
            className="fab-button"
            onClick={() => setIsExpanded(true)}
            title="Quick braindump (Ctrl/Cmd+B)"
          >
            <StickyNote size={16} />
          </button>
        ) : (
          <div className="fab-expanded-content">
            <div className="fab-header">
              <span className="fab-title">Quick Braindump</span>
              <button className="fab-close" onClick={handleCancel} title="Close (Esc)">
                <X size={16} />
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className="fab-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your thoughts... (Ctrl/Cmd+Enter to save)"
              rows={6}
            />

            <div className="fab-footer">
              <button
                className="fab-link"
                onClick={handleFullMode}
                title="Open full braindump page"
              >
                Full mode →
              </button>
              <div className="fab-actions">
                <button className="btn btn-ghost btn-sm" onClick={handleCancel} disabled={saving}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving || !content || content.trim().length === 0}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  );
}

export default BraindumpFAB;
