import React from 'react';
import { Check } from 'lucide-react';
import './WizardProgressBar.css';

/**
 * Pill-shaped wizard progress bar.
 * - Pill container with accent fill track
 * - Numbered circles → checkmarks for completed steps
 * - Downward caret above the active step
 */
const WizardProgressBar = ({ steps, currentIndex, completedSteps }) => {
  const fillPercent = steps.length > 1
    ? (currentIndex / (steps.length - 1)) * 100
    : 0;

  return (
    <div className="wizard-progress-bar-wrapper">
      {/* Caret row — positioned above the nodes */}
      <div className="wizard-progress-carets">
        {steps.map((step, index) => (
          <div key={step.id} className="wizard-progress-caret-slot">
            {index === currentIndex && (
              <span className="wizard-progress-caret">&#9660;</span>
            )}
          </div>
        ))}
      </div>

      {/* Pill track */}
      <div className="wizard-progress-pill">
        {/* Filled accent track */}
        <div
          className="wizard-progress-fill"
          style={{ width: `${fillPercent}%` }}
        />

        {/* Step nodes */}
        <div className="wizard-progress-nodes">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id) && index !== currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <div
                key={step.id}
                className={`wizard-progress-node ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                {isCompleted ? <Check size={12} strokeWidth={3} /> : index + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step labels below */}
      <div className="wizard-progress-labels">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = completedSteps.includes(step.id) && index !== currentIndex;
          return (
            <div
              key={step.id}
              className={`wizard-progress-label ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}`}
            >
              {step.title}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardProgressBar;
