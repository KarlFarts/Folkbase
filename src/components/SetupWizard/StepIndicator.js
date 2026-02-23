import React from 'react';
import { Check } from 'lucide-react';

/**
 * Progress indicator showing wizard steps as numbered circles with labels
 */
const StepIndicator = ({ steps, currentIndex, completedSteps }) => {
  return (
    <div className="step-indicator">
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isCompleted = completedSteps.includes(step.id) && !isCurrent;
        const isFuture = index > currentIndex && !isCompleted;

        return (
          <React.Fragment key={step.id}>
            <div
              className={`step-item ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''} ${isFuture ? 'future' : ''}`}
            >
              <div className="step-dot">{isCompleted ? <Check size={14} /> : index + 1}</div>
              <span className="step-label">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line ${index < currentIndex ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
