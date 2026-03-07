import { error as logError } from '../../utils/logger';
import { useState, useRef, useEffect } from 'react';
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
  const timersRef = useRef([]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

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
      timersRef.current.push(setTimeout(() => setSuccess(false), 2000));

      // Call parent callback
      if (onCommit) {
        onCommit(updatedNote);
      }
    } catch (err) {
      logError('Error committing note:', err);
      setError('Failed to commit note. Please try again.');

      // Clear error after 3 seconds
      timersRef.current.push(setTimeout(() => setError(''), 3000));
    } finally {
      setIsLoading(false);
    }
  };

  const buttonClass = className || 'btn btn-primary';

  return (
    <div className="qcb-wrapper">
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
        <div className="qcb-toast qcb-toast-error">
          {error}
        </div>
      )}

      {/* Success Toast */}
      {success && (
        <div className="qcb-toast qcb-toast-success">
          Note committed successfully!
        </div>
      )}
    </div>
  );
}
