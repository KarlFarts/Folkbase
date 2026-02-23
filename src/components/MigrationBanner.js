import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { migrateSheet } from '../services/migrationService';
import './MigrationBanner.css';

export default function MigrationBanner({ accessToken, sheetId, onComplete }) {
  const [status, setStatus] = useState('pending'); // pending, running, success, error
  const [progress, setProgress] = useState({ message: '', percent: 0 });
  const [error, setError] = useState(null);

  async function runMigration() {
    setStatus('running');
    const result = await migrateSheet(accessToken, sheetId, (prog) => {
      setProgress(prog);
    });

    if (result.success) {
      setStatus('success');
      setTimeout(() => {
        onComplete();
      }, 2000);
    } else {
      setStatus('error');
      setError(result.error);
    }
  }

  useEffect(() => {
    // Auto-start migration on mount
    async function startMigration() {
      await runMigration();
    }
    startMigration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'success') {
    return (
      <div className="migration-banner success">
        <CheckCircle size={20} />
        <span>Schema updated successfully!</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="migration-banner error">
        <AlertCircle size={20} />
        <span>Migration failed: {error}</span>
        <button className="btn btn-sm" onClick={runMigration}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="migration-banner running">
      <Loader size={20} className="spinner" />
      <div style={{ flex: 1 }}>
        <div>{progress.message}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
    </div>
  );
}
