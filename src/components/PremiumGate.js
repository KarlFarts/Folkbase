import React from 'react';
import { Lock } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import './PremiumGate.css';

/**
 * Feature name mapping for display
 */
const FEATURE_LABELS = {
  workspaces: 'Shared Workspaces',
  calendar_sync: 'Google Calendar Sync',
  import_export: 'Import & Export',
  duplicate_detection: 'Duplicate Detection',
  backup_restore: 'Backup & Restore',
  braindump: 'Braindump',
};

/**
 * Feature description mapping
 */
const FEATURE_DESCRIPTIONS = {
  workspaces: 'Create and collaborate in shared workspaces with your team',
  calendar_sync: 'Sync events with Google Calendar automatically',
  import_export: 'Import contacts from CSV/vCard and export your data',
  duplicate_detection: 'Automatically detect and merge duplicate contacts',
  backup_restore: 'Backup and restore your entire database',
  braindump: 'Quick capture notes with AI entity detection',
};

/**
 * Default upgrade prompt card
 */
function UpgradeCard({ feature }) {
  const { openUpgrade } = useSubscription();

  const featureName = FEATURE_LABELS[feature] || 'This Feature';
  const featureDescription = FEATURE_DESCRIPTIONS[feature] || 'Upgrade to unlock this feature';

  return (
    <div className="premium-gate-card card">
      <div className="premium-gate-icon">
        <Lock size={48} />
      </div>
      <div className="premium-gate-content">
        <h3 className="premium-gate-title">{featureName}</h3>
        <p className="premium-gate-description">{featureDescription}</p>
        <button className="btn btn-primary premium-gate-button" onClick={openUpgrade}>
          Upgrade to Unlock
        </button>
      </div>
    </div>
  );
}

/**
 * Inline upgrade prompt (for menu items, small UI elements)
 */
function InlineUpgradePrompt({ feature }) {
  const { openUpgrade } = useSubscription();
  const featureName = FEATURE_LABELS[feature] || 'Premium Feature';

  return (
    <div className="premium-gate-inline">
      <Lock size={16} className="premium-gate-inline-icon" />
      <span className="premium-gate-inline-text">{featureName}</span>
      <button
        className="premium-gate-inline-link"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openUpgrade();
        }}
      >
        Upgrade
      </button>
    </div>
  );
}

/**
 * PremiumGate - Conditionally renders content based on subscription status
 *
 * @param {string} feature - Feature key from PREMIUM_FEATURES
 * @param {React.ReactNode} children - Content to render if feature is unlocked
 * @param {React.ReactNode} fallback - Custom fallback UI (optional)
 * @param {boolean} inline - Use inline variant for small UI elements (optional)
 */
export default function PremiumGate({ feature, children, fallback, inline = false }) {
  const { hasFeature } = useSubscription();

  const isUnlocked = hasFeature(feature);

  if (isUnlocked) {
    return <>{children}</>;
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show inline variant
  if (inline) {
    return <InlineUpgradePrompt feature={feature} />;
  }

  // Show default card variant
  return <UpgradeCard feature={feature} />;
}

/**
 * Hook for programmatic premium feature checks
 */
export function usePremiumFeature(featureKey) {
  const { hasFeature, openUpgrade } = useSubscription();

  return {
    isUnlocked: hasFeature(featureKey),
    requestUpgrade: openUpgrade,
  };
}
