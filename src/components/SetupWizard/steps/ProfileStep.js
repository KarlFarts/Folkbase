import React, { useState, useEffect, useRef } from 'react';
import { UserCircle } from 'lucide-react';
import AvatarPicker from '../../AvatarPicker';

// Same color generation as Avatar.js — used to lock in an initial color
const AVATAR_COLORS = [
  '#dc2626',
  '#c2703e',
  '#d97706',
  '#059669',
  '#a85c30',
  '#7c6853',
  '#d4875a',
  '#8f4e28',
  '#4b5563',
  '#e0d5c8',
];

function generateColor(name) {
  if (!name) return '#6b7280';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Profile step - Display name and avatar customization
 * Auto-saves all fields to wizardData so Back preserves your choices
 */
const ProfileStep = ({ wizardData, onUpdate, onNext, onBack }) => {
  const [displayName, setDisplayName] = useState(wizardData.displayName || '');
  const [avatarColor, setAvatarColor] = useState(() => {
    // Lock in a color on mount so it doesn't change as you type
    return (
      wizardData.avatarColor ||
      generateColor(wizardData.displayName || wizardData.user?.displayName || 'User')
    );
  });
  const [avatarIcon, setAvatarIcon] = useState(wizardData.avatarIcon || null);
  const initialRender = useRef(true);

  // Auto-save to wizardData whenever fields change (so Back preserves choices)
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    onUpdate({
      displayName: displayName.trim() || wizardData.user?.displayName || 'User',
      avatarColor,
      avatarIcon,
    });
  }, [displayName, avatarColor, avatarIcon]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContinue = () => {
    onUpdate({
      displayName: displayName.trim() || wizardData.user?.displayName || 'User',
      avatarColor,
      avatarIcon,
    });
    onNext();
  };

  return (
    <div className="wizard-step">
      <div className="wizard-step-header">
        <div className="wizard-step-icon">
          <UserCircle size={64} />
        </div>
        <h2 className="wizard-step-title">Set Up Your Profile</h2>
        <p className="wizard-step-description">Customize how you appear in Folkbase.</p>
      </div>

      <div className="wizard-step-body">
        <div className="wizard-form-group">
          <label htmlFor="display-name" className="wizard-form-label">
            Display Name
          </label>
          <input
            id="display-name"
            type="text"
            className="wizard-form-input"
            placeholder="Enter your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <p className="wizard-form-hint">This is how your name will appear throughout the app.</p>
        </div>

        <div className="wizard-form-group wizard-form-group-spaced">
          <label className="wizard-form-label">Choose Your Avatar</label>
          <AvatarPicker
            name={displayName || wizardData.user?.displayName || 'User'}
            currentColor={avatarColor}
            currentIcon={avatarIcon}
            onColorChange={setAvatarColor}
            onIconChange={setAvatarIcon}
          />
        </div>

        <div className="wizard-step-actions">
          <button type="button" onClick={onBack} className="btn btn-secondary">
            Back
          </button>
          <button type="button" onClick={handleContinue} className="btn btn-primary btn-lg">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileStep;
