import { error as logError } from '../../utils/logger';
import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { updateNote } from '../../utils/devModeWrapper';

/**
 * QuickCommitButton Component
 *
 * A simple button component for quick commit without entity linking.
 * Immediately marks note as Processed, keeping existing tags/visibility.
 *
 * @param {Object} props
 * @param {Object} props.note - The note to commit
 * @param {Function} props.onCommit - Callback after successful commit
 * @param {boolean} props.disabled - Whether the button is disabled
 * @param {string} props.className - Optional CSS class name
 */
export default function QuickCommitButton({ note, onCommit, disabled = false, className = '' }) {
  const { accessToken } = useAuth();
  const { getCurrentSheetId } = useWorkspace();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleQuickCommit = async () => {
    if (!note || !note['Note ID']) {
      logError('Invalid note provided to QuickCommitButton');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const sheetId = getCurrentSheetId();

      // Update note status to Processed, keeping everything else the same
      const updatedNote = await updateNote(accessToken, sheetId, note['Note ID'], {
        Status: 'Processed',
      });

      // Show success state briefly
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);

      // Call parent callback
      if (onCommit) {
        onCommit(updatedNote);
      }
    } catch (err) {
      logError('Error committing note:', err);
      setError(err.message || 'Failed to commit note');

      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const buttonClass = className || 'btn btn-primary';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className={buttonClass}
        onClick={handleQuickCommit}
        disabled={disabled || isLoading || success}
        style={{
          cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
          opacity: disabled || isLoading ? 0.6 : 1,
          background: success ? 'var(--color-success)' : undefined,
          transition: 'background 0.3s ease',
        }}
      >
        {isLoading && 'Committing...'}
        {success && <><Check size={14} /> Committed</>}
        {!isLoading && !success && 'Quick Commit'}
      </button>

      {/* Error Toast */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '8px 12px',
            background: 'var(--color-danger)',
            color: 'var(--color-text-inverse)',
            borderRadius: '4px',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
          }}
        >
          {error}
        </div>
      )}

      {/* Success Toast */}
      {success && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '8px 12px',
            background: 'var(--color-success)',
            color: 'var(--color-text-inverse)',
            borderRadius: '4px',
            fontSize: '13px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
          }}
        >
          Note committed successfully!
        </div>
      )}
    </div>
  );
}
