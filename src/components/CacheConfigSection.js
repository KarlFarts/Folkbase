import React, { useState } from 'react';
import { Settings, RotateCcw, ChevronDown, ChevronUp, Save, Zap, Star, Rocket } from 'lucide-react';
import { SHEET_NAMES, CACHE_CONFIG } from '../config/constants';
import { invalidateAllCaches } from '../utils/indexedDbCache';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmDialog from './ConfirmDialog';
import './CacheConfigSection.css';

const PRESETS = {
  'real-time': {
    name: 'Real-time',
    description: 'Freshest data, more API calls',
    multiplier: 0.5,
    icon: <Zap size={16} />,
  },
  balanced: {
    name: 'Balanced',
    description: 'Recommended for most users',
    multiplier: 1.0,
    icon: <Star size={16} />,
    recommended: true,
  },
  performance: {
    name: 'Performance',
    description: 'Fastest, less frequent updates',
    multiplier: 3.0,
    icon: <Rocket size={16} />,
  },
};

export function CacheConfigSection() {
  const { notify } = useNotification();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(() => {
    const saved = localStorage.getItem('touchpoint_cache_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        return config.preset || 'balanced';
      } catch (error) {
        console.error('Failed to load cache config:', error);
        return 'balanced';
      }
    }
    return 'balanced';
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customTTLs, setCustomTTLs] = useState(() => {
    const saved = localStorage.getItem('touchpoint_cache_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        return config.customTTLs || {};
      } catch (error) {
        console.error('Failed to load cache config:', error);
        return {};
      }
    }
    return {};
  });
  const [isSaving, setIsSaving] = useState(false);

  const handlePresetChange = (preset) => {
    setSelectedPreset(preset);
  };

  const handleTTLChange = (entityType, value) => {
    setCustomTTLs((prev) => ({
      ...prev,
      [entityType]: parseInt(value, 10),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Save to localStorage
    const config = {
      preset: selectedPreset,
      customTTLs: showAdvanced ? customTTLs : {},
    };
    localStorage.setItem('touchpoint_cache_config', JSON.stringify(config));

    // Invalidate all caches to apply new settings
    await invalidateAllCaches();

    setIsSaving(false);

    notify.success('Cache configuration saved! All caches cleared to apply new settings.');
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setSelectedPreset('balanced');
    setCustomTTLs({});
    localStorage.removeItem('touchpoint_cache_config');
    invalidateAllCaches();
    setShowResetConfirm(false);
    notify.success('Cache configuration reset to defaults.');
  };

  const getEffectiveTTL = (entityType) => {
    // If advanced mode and custom TTL set, use that
    if (showAdvanced && customTTLs[entityType]) {
      return customTTLs[entityType];
    }

    // Otherwise use preset multiplier
    const multiplier = PRESETS[selectedPreset].multiplier;
    const baseTTL = getBaseTTL(entityType);
    return Math.round(baseTTL * multiplier);
  };

  const getBaseTTL = (entityType) => {
    // High churn entities
    if (
      [
        SHEET_NAMES.CONTACTS,
        SHEET_NAMES.TOUCHPOINTS,
        SHEET_NAMES.TASKS,
        SHEET_NAMES.NOTES,
        SHEET_NAMES.EVENTS,
      ].includes(entityType)
    ) {
      return CACHE_CONFIG.HIGH_CHURN_TTL;
    }

    // Low churn entities
    if ([SHEET_NAMES.LISTS, SHEET_NAMES.IMPORT_SETTINGS].includes(entityType)) {
      return CACHE_CONFIG.LOW_CHURN_TTL;
    }

    // Default
    return CACHE_CONFIG.DEFAULT_TTL;
  };

  const estimateImpact = () => {
    const multiplier = PRESETS[selectedPreset].multiplier;
    const baseCallsPerSession = 5;
    const newCallsPerSession = Math.max(1, Math.round(baseCallsPerSession / multiplier));

    return {
      current: baseCallsPerSession,
      new: newCallsPerSession,
      reduction: Math.round(
        ((baseCallsPerSession - newCallsPerSession) / baseCallsPerSession) * 100
      ),
    };
  };

  const impact = estimateImpact();

  return (
    <div className="cache-config-section">
      <div className="card">
        <div className="card-header">
          <Settings size={20} />
          <h3>Cache Configuration</h3>
        </div>
        <div className="card-body">
          <p className="cache-config-description">
            Adjust cache behavior to balance speed vs. data freshness. Higher cache times mean
            faster performance but potentially stale data.
          </p>

          {/* Preset selector */}
          <div className="preset-selector">
            <h4>Quick Presets</h4>
            <div className="preset-buttons">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-btn ${selectedPreset === key ? 'active' : ''} ${preset.recommended ? 'recommended' : ''}`}
                  onClick={() => handlePresetChange(key)}
                >
                  <span className="preset-icon">{preset.icon}</span>
                  <span className="preset-name">{preset.name}</span>
                  <span className="preset-desc">{preset.description}</span>
                  {preset.recommended && <span className="preset-badge">Recommended</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Impact estimate */}
          <div className="impact-estimate">
            <strong>Estimated impact:</strong> ~{impact.new} API calls per session
            {impact.reduction !== 0 && (
              <span className={impact.reduction > 0 ? 'positive' : 'negative'}>
                ({impact.reduction > 0 ? '-' : '+'}
                {Math.abs(impact.reduction)}% vs. current)
              </span>
            )}
          </div>

          {/* Advanced settings */}
          <div className="advanced-toggle">
            <button className="btn btn-sm btn-ghost" onClick={() => setShowAdvanced(!showAdvanced)}>
              Advanced Settings
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-settings">
              <h4>Per-Entity TTL Settings</h4>
              <p className="advanced-note">
                Fine-tune cache lifetime for each entity type. Values in seconds.
              </p>

              <div className="entity-ttl-list">
                {Object.values(SHEET_NAMES).map((entityType) => {
                  const baseTTL = getBaseTTL(entityType);
                  const effectiveTTL = getEffectiveTTL(entityType);
                  const isHighChurn = baseTTL === CACHE_CONFIG.HIGH_CHURN_TTL;
                  const isLowChurn = baseTTL === CACHE_CONFIG.LOW_CHURN_TTL;

                  return (
                    <div key={entityType} className="entity-ttl-row">
                      <div className="entity-info">
                        <span className="entity-name">{entityType}</span>
                        <span
                          className={`entity-type ${isHighChurn ? 'high-churn' : isLowChurn ? 'low-churn' : 'default'}`}
                        >
                          {isHighChurn ? 'High Churn' : isLowChurn ? 'Low Churn' : 'Default'}
                        </span>
                      </div>

                      <div className="ttl-controls">
                        <input
                          type="range"
                          min="10"
                          max="3600"
                          step="10"
                          value={customTTLs[entityType] || effectiveTTL}
                          onChange={(e) => handleTTLChange(entityType, e.target.value)}
                          className="ttl-slider"
                        />
                        <input
                          type="number"
                          min="10"
                          max="3600"
                          value={customTTLs[entityType] || effectiveTTL}
                          onChange={(e) => handleTTLChange(entityType, e.target.value)}
                          className="ttl-input"
                        />
                        <span className="ttl-unit">sec</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="cache-config-actions">
            <button className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset to Defaults
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          <div className="cache-config-note">
            <strong>Note:</strong> Changing cache settings will clear all cached data. Your next
            page load may be slower as the cache rebuilds.
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={showResetConfirm}
        onConfirm={confirmReset}
        onCancel={() => setShowResetConfirm(false)}
        title="Reset Cache Configuration"
        message="Reset cache configuration to defaults?"
        confirmLabel="Reset"
        variant="danger"
      />
    </div>
  );
}
