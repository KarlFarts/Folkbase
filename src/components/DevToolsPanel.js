/**
 * Development Tools Panel Component
 *
 * Floating panel with tools for managing test data and development mode features.
 * Only visible when VITE_DEV_MODE is enabled.
 *
 * IMPORTANT: This component is dev-mode only and will not appear in production builds.
 */

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sprout,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Check,
  X as XIcon,
} from 'lucide-react';
import { useTestDataManager } from '../__tests__/hooks/useTestDataManager';
import './DevToolsPanel.css';

export function DevToolsPanel() {
  const { isDevMode, stats, refreshStats, seed, clear, reload, clearAll, isSeeded } =
    useTestDataManager();
  const [isMinimized, setIsMinimized] = useState(true);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  if (!isDevMode) {
    return null;
  }

  return (
    <div className={`dev-tools-panel ${isMinimized ? 'minimized' : 'expanded'}`}>
      {/* Header/Toggle Button */}
      <button
        className="dev-tools-header"
        onClick={() => setIsMinimized(!isMinimized)}
        title="Toggle dev tools panel"
      >
        <span className="dev-tools-title">
          <span className="icon">
            <Settings size={16} />
          </span>{' '}
          Dev Tools
        </span>
        <span className={`toggle-arrow ${isMinimized ? 'collapsed' : 'expanded'}`}>
          {isMinimized ? '▶' : '▼'}
        </span>
      </button>

      {!isMinimized && (
        <div className="dev-tools-content">
          {/* Stats Section */}
          <div className="dev-tools-section">
            <div className="section-title">Data Statistics</div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Total Contacts</div>
                <div className="stat-value">{stats.totalContacts}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Test Contacts</div>
                <div className="stat-value">{stats.testContacts}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Real Contacts</div>
                <div className="stat-value">{stats.realContacts}</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Touchpoints</div>
                <div className="stat-value">{stats.touchpoints}</div>
              </div>
            </div>
          </div>

          {/* Test Data Controls */}
          <div className="dev-tools-section">
            <div className="section-title">Test Data Controls</div>
            <div className="button-group">
              <button
                className="dev-btn btn-seed"
                onClick={() => {
                  seed();
                  refreshStats();
                }}
                title="Add test contacts to your data (if not already added)"
              >
                <Sprout size={16} /> Seed Test Data
              </button>
              <button
                className="dev-btn btn-reload"
                onClick={() => {
                  reload();
                  refreshStats();
                }}
                title="Clear and re-add all test contacts"
              >
                <RefreshCw size={16} /> Reload Test Data
              </button>
              <button
                className="dev-btn btn-clear"
                onClick={() => {
                  clear();
                  refreshStats();
                }}
                title="Remove all test contacts (keeps real contacts)"
              >
                <Trash2 size={16} /> Clear Test Data
              </button>
              <button
                className="dev-btn btn-danger"
                onClick={() => setShowConfirmClearAll(true)}
                title="Permanently delete all data (use with caution!)"
              >
                <AlertTriangle size={16} /> Clear All Data
              </button>
            </div>
          </div>

          {/* Confirmation Dialog */}
          {showConfirmClearAll && (
            <div className="confirmation-dialog">
              <div className="confirmation-content">
                <p className="confirmation-message">
                  <AlertTriangle size={16} /> Are you sure you want to clear ALL dev data?
                </p>
                <p className="confirmation-warning">
                  This will delete ALL contacts and touchpoints. This action cannot be undone.
                </p>
                <div className="confirmation-buttons">
                  <button
                    className="dev-btn btn-danger-confirm"
                    onClick={() => {
                      clearAll();
                      refreshStats();
                      setShowConfirmClearAll(false);
                    }}
                  >
                    Yes, Clear Everything
                  </button>
                  <button
                    className="dev-btn btn-cancel"
                    onClick={() => setShowConfirmClearAll(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Status/Help Section */}
          <div className="dev-tools-section">
            <div className="section-title">Status</div>
            <div className="status-info">
              <p>
                <strong>Mode:</strong> Development
              </p>
              <p>
                <strong>Test Data Seeded:</strong>{' '}
                <span className={isSeeded ? 'status-yes' : 'status-no'}>
                  {isSeeded ? (
                    <>
                      <Check size={14} /> Yes
                    </>
                  ) : (
                    <>
                      <XIcon size={14} /> No
                    </>
                  )}
                </span>
              </p>
              <p className="status-note">
                Test data is stored in localStorage and persists across page reloads.
              </p>
            </div>
          </div>

          {/* Info Footer */}
          <div className="dev-tools-footer">
            <p>
              This panel is only visible in dev mode (<code>REACT_APP_DEV_MODE=true</code>)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
