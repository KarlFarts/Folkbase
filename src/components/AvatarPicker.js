import React, { useState } from 'react';
import Avatar from './Avatar';
import IconMap from './IconMap';

const AVATAR_COLORS = [
  { value: '#c2703e', label: 'Terracotta' },
  { value: '#a85c30', label: 'Burnt Sienna' },
  { value: '#7c6853', label: 'Warm Brown' },
  { value: '#d4875a', label: 'Warm Clay' },
  { value: '#dc2626', label: 'Red' },
  { value: '#d97706', label: 'Amber' },
  { value: '#e0d5c8', label: 'Taupe' },
  { value: '#8f4e28', label: 'Deep Terracotta' },
  { value: '#059669', label: 'Green' },
  { value: '#4b5563', label: 'Cool Gray' },
  { value: '#111827', label: 'Dark' },
  { value: '#6b7280', label: 'Gray' },
];

const AVATAR_ICONS = [
  { name: 'User', label: 'Person' },
  { name: 'Users', label: 'Group' },
  { name: 'Building2', label: 'Organization' },
  { name: 'Megaphone', label: 'Outreach' },
  { name: 'Vote', label: 'Community' },
  { name: 'Landmark', label: 'Institution' },
  { name: 'Star', label: 'VIP' },
  { name: 'Heart', label: 'Supporter' },
  { name: 'Flag', label: 'Project' },
  { name: 'Shield', label: 'Leadership' },
  { name: 'Briefcase', label: 'Professional' },
  { name: 'Award', label: 'Award' },
  { name: 'Target', label: 'Target' },
  { name: 'Handshake', label: 'Partner' },
];

function AvatarPicker({ name, currentColor, currentIcon, onColorChange, onIconChange }) {
  const [activeTab, setActiveTab] = useState('color');

  return (
    <div className="avatar-picker">
      {/* Live preview */}
      <div className="avatar-picker-preview">
        <Avatar name={name} size="lg" customColor={currentColor} customIcon={currentIcon} />
      </div>

      {/* Tabs */}
      <div className="avatar-picker-tabs">
        <button
          type="button"
          className={`avatar-picker-tab ${activeTab === 'color' ? 'active' : ''}`}
          onClick={() => setActiveTab('color')}
        >
          Color
        </button>
        <button
          type="button"
          className={`avatar-picker-tab ${activeTab === 'icon' ? 'active' : ''}`}
          onClick={() => setActiveTab('icon')}
        >
          Icon
        </button>
      </div>

      {/* Color grid */}
      {activeTab === 'color' && (
        <div className="avatar-picker-content">
          <div className="avatar-picker-grid">
            <button
              type="button"
              className={`avatar-color-swatch avatar-swatch-auto ${!currentColor ? 'selected' : ''}`}
              onClick={() => onColorChange(null)}
              title="Auto (default)"
              aria-label="Use auto-generated color"
            >
              Auto
            </button>
            {AVATAR_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                className={`avatar-color-swatch ${currentColor === color.value ? 'selected' : ''}`}
                style={{ backgroundColor: color.value }}
                onClick={() => onColorChange(color.value)}
                title={color.label}
                aria-label={`Select ${color.label} color`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Icon grid */}
      {activeTab === 'icon' && (
        <div className="avatar-picker-content">
          <div className="avatar-picker-grid">
            <button
              type="button"
              className={`avatar-icon-button avatar-swatch-auto ${!currentIcon ? 'selected' : ''}`}
              onClick={() => onIconChange(null)}
              title="Initials (default)"
              aria-label="Use initials"
            >
              AB
            </button>
            {AVATAR_ICONS.map((icon) => (
              <button
                key={icon.name}
                type="button"
                className={`avatar-icon-button ${currentIcon === icon.name ? 'selected' : ''}`}
                onClick={() => onIconChange(icon.name)}
                title={icon.label}
                aria-label={`Select ${icon.label} icon`}
              >
                <IconMap name={icon.name} size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AvatarPicker;
