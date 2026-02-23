import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import './UpgradePrompt.css';

/**
 * UpgradePrompt - Reusable component for prompting users to upgrade
 *
 * Used by PremiumGate as the default fallback, but can also be used
 * standalone for upgrade CTAs.
 */
export default function UpgradePrompt({ feature: _feature, title, description, compact = false }) {
  const { openUpgrade } = useSubscription();

  if (compact) {
    return (
      <div className="upgrade-prompt-compact">
        <Lock size={16} className="upgrade-prompt-compact-icon" />
        <span className="upgrade-prompt-compact-text">Premium Feature</span>
        <button className="upgrade-prompt-compact-button" onClick={openUpgrade}>
          Upgrade
        </button>
      </div>
    );
  }

  return (
    <div className="upgrade-prompt">
      <div className="upgrade-prompt-icon">
        <Lock size={48} />
      </div>
      <div className="upgrade-prompt-content">
        <h3 className="upgrade-prompt-title">{title || 'Premium Feature'}</h3>
        {description && <p className="upgrade-prompt-description">{description}</p>}
        <button className="btn btn-primary upgrade-prompt-button" onClick={openUpgrade}>
          <Zap size={16} />
          Upgrade to Unlock
        </button>
      </div>
    </div>
  );
}
