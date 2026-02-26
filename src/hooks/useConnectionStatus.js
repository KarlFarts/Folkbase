import { useState, useCallback, useMemo } from 'react';

const INITIAL_STATE = {
  account: { status: 'idle', error: null },
  sheets: { status: 'idle', error: null },
  drive: { status: 'idle', error: null },
  calendar: { status: 'idle', error: null },
};

const LABELS = {
  account: 'Google Account',
  sheets: 'Google Sheets',
  drive: 'Google Drive',
  calendar: 'Calendar',
};

/**
 * State machine for tracking connection status of Google services.
 * Each step has status: 'idle' | 'checking' | 'connected' | 'error'
 * and an optional error: { detail: string, fix: string }
 */
export function useConnectionStatus(initialOverrides) {
  const [steps, setSteps] = useState(() => ({
    ...INITIAL_STATE,
    ...initialOverrides,
  }));

  const setStepStatus = useCallback((stepId, status, error = null) => {
    setSteps((prev) => ({
      ...prev,
      [stepId]: { status, error },
    }));
  }, []);

  const resetStep = useCallback((stepId) => {
    setSteps((prev) => ({
      ...prev,
      [stepId]: { status: 'idle', error: null },
    }));
  }, []);

  const stepsArray = useMemo(
    () =>
      Object.entries(steps).map(([id, state]) => ({
        id,
        label: LABELS[id],
        ...state,
      })),
    [steps]
  );

  return { steps: stepsArray, setStepStatus, resetStep };
}
