import React from 'react';
import './SyncSummary.css';

function SyncSummary({
  stats,
  onSyncAnother,
  onViewContacts,
  recentlyAdded = [],
}) {
  const { added, skipped, alreadyExisted, alreadySynced } = stats;
  const total = added + skipped + alreadyExisted + alreadySynced;

  return (
    <div className="sync-summary">
      <div className="summary-header">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2>Sync Complete!</h2>
      </div>

      <div className="summary-stats">
        <div className="stat-item stat-added">
          <span className="stat-number">{added}</span>
          <span className="stat-label">Added</span>
        </div>
        <div className="stat-item stat-skipped">
          <span className="stat-number">{skipped}</span>
          <span className="stat-label">Skipped</span>
        </div>
        <div className="stat-item stat-existing">
          <span className="stat-number">{alreadyExisted + alreadySynced}</span>
          <span className="stat-label">Already in Folkbase</span>
        </div>
      </div>

      {added > 0 && recentlyAdded.length > 0 && (
        <div className="recently-added">
          <h4>Recently Added</h4>
          <ul className="added-list">
            {recentlyAdded.slice(0, 5).map((contact, index) => (
              <li key={index} className="added-item">
                <span className="added-name">{contact.Name}</span>
                {contact.Organization && (
                  <span className="added-org">{contact.Organization}</span>
                )}
              </li>
            ))}
            {recentlyAdded.length > 5 && (
              <li className="added-more">
                +{recentlyAdded.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {added === 0 && total > 0 && (
        <div className="no-new-message">
          <p>All contacts in the file are already in Folkbase.</p>
          <p className="hint">Try exporting a different set of contacts, or check if you've already synced these.</p>
        </div>
      )}

      <div className="summary-actions">
        <button
          type="button"
          className="action-btn secondary-btn"
          onClick={onSyncAnother}
        >
          Sync Another File
        </button>
        <button
          type="button"
          className="action-btn primary-btn"
          onClick={onViewContacts}
        >
          View Contacts
        </button>
      </div>
    </div>
  );
}

export default SyncSummary;
