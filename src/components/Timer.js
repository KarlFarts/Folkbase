import { useState, useEffect, useCallback } from 'react';

export default function Timer({ onTimeUpdate = () => {} }) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    onTimeUpdate(seconds);
  }, [seconds, onTimeUpdate]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setSeconds(0);
    setIsRunning(false);
  }, []);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div style={{
      background: 'var(--color-bg-secondary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-lg)',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: 'var(--color-primary)',
        marginBottom: 'var(--spacing-lg)',
        fontFamily: 'monospace'
      }}>
        {formatTime(seconds)}
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center' }}>
        {!isRunning ? (
          <button
            className="btn btn-primary"
            onClick={handleStart}
          >
            {seconds === 0 ? 'Start' : 'Resume'}
          </button>
        ) : (
          <button
            className="btn btn-secondary"
            onClick={handlePause}
          >
            Pause
          </button>
        )}

        <button
          className="btn btn-ghost"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
