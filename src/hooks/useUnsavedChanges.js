import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Warns the user before they lose unsaved form data.
 *
 * - Browser refresh / tab close: native "Leave site?" dialog via `beforeunload`.
 * - In-app navigation (React Router): `useBlocker` intercepts the transition and
 *   shows a `window.confirm` dialog.
 *
 * @param {boolean} isDirty - True when the form has unsaved changes.
 */
export function useUnsavedChanges(isDirty) {
  // Browser refresh / tab close
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      // Modern browsers ignore the string but still show their own dialog.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // In-app navigation (React Router v7)
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('You have unsaved changes. Leave this page and discard them?')) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);
}
