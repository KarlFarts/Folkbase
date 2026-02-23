import { useState, useCallback } from 'react';

/**
 * Custom hook for managing wizard state
 * @param {boolean} devMode - If true, pre-populate auth and sheet steps
 * @param {number} totalSteps - Total number of wizard steps (for bounds checking)
 * @returns {Object} - Wizard state and update functions
 */
export const useWizardState = (devMode = false, totalSteps = 3) => {
  const [state, setState] = useState(() => {
    if (devMode) {
      // In dev mode, skip to profile step with pre-filled auth/sheet data
      return {
        currentStepIndex: 1, // Profile step is index 1
        completedSteps: ['welcome'],
        data: {
          user: {
            email: 'dev@example.com',
            displayName: 'Dev User',
            picture: null,
          },
          accessToken: 'dev-mode-token',
          sheetMethod: 'existing',
          sheetId: 'dev-mode-dummy-sheet-id',
          sheetTitle: 'Dev Mode Sheet',
          displayName: 'Dev User',
          avatarColor: null,
          avatarIcon: null,
          importedCount: 0,
        },
      };
    }

    return {
      currentStepIndex: 0,
      completedSteps: [],
      data: {
        user: null,
        accessToken: null,
        sheetMethod: null,
        sheetId: null,
        sheetTitle: null,
        displayName: null,
        avatarColor: null,
        avatarIcon: null,
        importedCount: 0,
      },
    };
  });

  /**
   * Update wizard data
   * @param {Object} updates - Partial data updates to merge
   */
  const updateData = useCallback((updates) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, ...updates },
    }));
  }, []);

  /**
   * Move to next step (capped at last step)
   */
  const nextStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.min(prev.currentStepIndex + 1, totalSteps - 1),
    }));
  }, [totalSteps]);

  /**
   * Move to previous step
   */
  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: Math.max(0, prev.currentStepIndex - 1),
    }));
  }, []);

  /**
   * Mark a step as complete
   * @param {string} stepId - Step identifier
   */
  const markStepComplete = useCallback((stepId) => {
    setState((prev) => ({
      ...prev,
      completedSteps: [...new Set([...prev.completedSteps, stepId])],
    }));
  }, []);

  /**
   * Skip to a specific step
   * @param {number} stepIndex - Target step index
   */
  const skipToStep = useCallback((stepIndex) => {
    setState((prev) => ({
      ...prev,
      currentStepIndex: stepIndex,
    }));
  }, []);

  return {
    wizardData: state.data,
    currentStepIndex: state.currentStepIndex,
    completedSteps: state.completedSteps,
    updateData,
    nextStep,
    prevStep,
    markStepComplete,
    skipToStep,
  };
};
