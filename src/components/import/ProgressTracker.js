function ProgressTracker({ progress }) {
  const { phase, total, processed, current, canCancel, onCancel } = progress;

  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

  const phaseLabels = {
    parsing: 'Parsing file...',
    validating: 'Validating data...',
    detecting: 'Detecting duplicates...',
    importing: 'Importing contacts...',
  };

  return (
    <div className="progress-tracker">
      <div className="progress-header">
        <span className="progress-phase">{phaseLabels[phase] || 'Processing...'}</span>
        <span className="progress-percentage">{percentage}%</span>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="progress-details">
        <span className="progress-current">{current}</span>
        <span className="progress-count">
          {processed.toLocaleString()} of {total.toLocaleString()}
        </span>
      </div>

      {canCancel && onCancel && (
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}

export default ProgressTracker;
