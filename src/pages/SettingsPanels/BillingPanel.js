import React from 'react';
import { CreditCard, Zap, Users, FolderOpen, CheckCircle } from 'lucide-react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { SUBSCRIPTION_STATUS, PREMIUM_FEATURES } from '../../config/constants';
import './BillingPanel.css';

const FEATURE_LABELS = {
  [PREMIUM_FEATURES.WORKSPACES]: 'Shared Workspaces',
  [PREMIUM_FEATURES.CALENDAR_SYNC]: 'Google Calendar Sync',
  [PREMIUM_FEATURES.IMPORT_EXPORT]: 'Import & Export',
  [PREMIUM_FEATURES.DUPLICATE_DETECTION]: 'Duplicate Detection',
  [PREMIUM_FEATURES.BACKUP_RESTORE]: 'Backup & Restore',
  [PREMIUM_FEATURES.BRAINDUMP]: 'Braindump',
};

export default function BillingPanel() {
  const { subscription, loading, openUpgrade, openManage } = useSubscription();

  if (loading) {
    return <div>Loading subscription...</div>;
  }

  const isFree = subscription.status === SUBSCRIPTION_STATUS.FREE;
  const isActive = subscription.status === SUBSCRIPTION_STATUS.ACTIVE;

  return (
    <div className="billing-panel">
      <h2 className="billing-panel-title">
        <CreditCard size={20} />
        Subscription
      </h2>

      {/* Current Plan */}
      <div className="billing-plan-card">
        <div className="billing-plan-header">
          <div>
            <h3 className="billing-plan-name">{isFree ? 'Free Plan' : 'Premium Plan'}</h3>
            <p className="billing-plan-status">
              Status:{' '}
              <span className={`status-badge status-${subscription.status}`}>
                {subscription.status}
              </span>
            </p>
          </div>
          {isActive && (
            <button className="btn btn-secondary" onClick={openManage}>
              Manage Subscription
            </button>
          )}
          {isFree && (
            <button className="btn btn-primary" onClick={openUpgrade}>
              <Zap size={16} />
              Upgrade to Premium
            </button>
          )}
        </div>

        {/* Features */}
        {!isFree && subscription.features.length > 0 && (
          <div className="billing-features">
            <h4 className="billing-features-title">Active Features</h4>
            <ul className="billing-features-list">
              {subscription.features.map((feature) => (
                <li key={feature} className="billing-feature-item">
                  <CheckCircle size={16} className="billing-feature-icon" />
                  {FEATURE_LABELS[feature] || feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Usage */}
        {!isFree && (
          <div className="billing-usage">
            <h4 className="billing-usage-title">Usage</h4>
            <div className="billing-usage-grid">
              <div className="billing-usage-item">
                <FolderOpen size={16} />
                <span>Workspaces: {subscription.workspaceSlots} slots</span>
              </div>
              <div className="billing-usage-item">
                <Users size={16} />
                <span>Members: {subscription.memberSlots} slots</span>
              </div>
            </div>
            {subscription.currentPeriodEnd && (
              <p className="billing-renewal">
                Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Free Plan Features */}
      {isFree && (
        <div className="billing-free-info">
          <h3>What you get with Free</h3>
          <ul>
            <li>Unlimited contacts</li>
            <li>Basic contact management</li>
            <li>Personal workspace only</li>
            <li>Community support</li>
          </ul>

          <h3 style={{ marginTop: '1.5rem' }}>Upgrade for</h3>
          <ul>
            <li>Shared workspaces with teams</li>
            <li>Google Calendar sync</li>
            <li>Import/Export (CSV, vCard)</li>
            <li>Duplicate detection & merging</li>
            <li>Backup & restore</li>
            <li>Braindump with AI entity detection</li>
          </ul>
        </div>
      )}
    </div>
  );
}
