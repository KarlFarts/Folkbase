import React, { memo } from 'react';
import IconMap from './IconMap';

const Avatar = memo(function Avatar({ name, size = 'md', customColor, customIcon }) {
  // Extract initials from name
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    return fullName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate a consistent color based on the name
  const getAvatarColor = (fullName) => {
    if (!fullName) return '#6b7280';

    const colors = [
      '#dc2626', // danger red
      '#c2703e', // terracotta
      '#d97706', // warm amber
      '#059669', // success green
      '#a85c30', // burnt sienna
      '#7c6853', // warm brown
      '#d4875a', // warm clay
      '#8f4e28', // deep terracotta
      '#4b5563', // cool gray
      '#e0d5c8', // warm taupe
    ];

    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  const initials = getInitials(name);
  const backgroundColor = customColor || getAvatarColor(name);
  const iconSize = size === 'sm' ? 16 : size === 'xl' ? 32 : size === 'lg' ? 24 : 20;

  return (
    <div className={`avatar avatar--${size}`} style={{ backgroundColor }} title={name}>
      {customIcon ? <IconMap name={customIcon} size={iconSize} /> : initials}
    </div>
  );
});

export default Avatar;
