import React, { useMemo, useCallback } from 'react';
import WindowTemplate from '../WindowTemplate';
import StepIndicator from './StepIndicator';
import WizardProgressBar from './WizardProgressBar';
import { useWizardState } from './useWizardState';
import WelcomeAuthStep from './steps/WelcomeAuthStep';
import ProfileStep from './steps/ProfileStep';
import CompletionStep from './steps/CompletionStep';
import './SetupWizard.css';

/**
 * Main Setup Wizard orchestrator
 * 3-step flow: Welcome (auth + sheet choice) → Profile → Complete (creates sheet)
 * @param {Object} props
 * @param {boolean} props.isInitialSetup - True if this is first-time setup (no close button)
 * @param {Function} props.onComplete - Called when wizard completes successfully
 */
const SetupWizard = ({ isInitialSetup = true, onComplete }) => {
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  const steps = useMemo(
    () => [
      {
        id: 'welcome',
        component: WelcomeAuthStep,
        title: 'Welcome',
      },
      {
        id: 'profile',
        component: ProfileStep,
        title: 'Profile',
      },
      {
        id: 'completion',
        component: CompletionStep,
        title: 'Complete',
      },
    ],
    []
  );

  const {
    wizardData,
    currentStepIndex,
    completedSteps,
    updateData,
    nextStep,
    prevStep,
    markStepComplete,
  } = useWizardState(isDevMode, steps.length);

  const currentStep = steps[currentStepIndex];
  const CurrentStepComponent = currentStep.component;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = useCallback(() => {
    markStepComplete(currentStep.id);
    nextStep();
  }, [currentStep.id, markStepComplete, nextStep]);

  const handleBack = useCallback(() => {
    prevStep();
  }, [prevStep]);

  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  if (isInitialSetup) {
    return (
      <div className="setup-wizard-fullscreen">
        <div className="setup-wizard-fullscreen-inner">
          <div className="setup-wizard-progress">
            <WizardProgressBar
              steps={steps}
              currentIndex={currentStepIndex}
              completedSteps={completedSteps}
            />
          </div>
          <div className="setup-wizard-content">
            <CurrentStepComponent
              wizardData={wizardData}
              onUpdate={updateData}
              onNext={handleNext}
              onBack={handleBack}
              onComplete={handleComplete}
              isFirstStep={isFirstStep}
              isLastStep={isLastStep}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <WindowTemplate
      isOpen={true}
      onClose={onComplete}
      title="Welcome to Folkbase"
      size="md"
      className="setup-wizard"
    >
      {/* Step progress indicator */}
      <div className="setup-wizard-progress">
        <StepIndicator
          steps={steps}
          currentIndex={currentStepIndex}
          completedSteps={completedSteps}
        />
      </div>

      {/* Current step content */}
      <div className="setup-wizard-content">
        <CurrentStepComponent
          wizardData={wizardData}
          onUpdate={updateData}
          onNext={handleNext}
          onBack={handleBack}
          onComplete={handleComplete}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
        />
      </div>
    </WindowTemplate>
  );
};

export default SetupWizard;
