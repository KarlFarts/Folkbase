import React from 'react';

function RecentActivity({ activities, onNavigate }) {
  const formatRelativeDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="sidebar-section">
        <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
          Recent Activity
        </h3>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          No recent activity
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-section">
      <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
        Recent Activity
      </h3>

      <div className="activity-list">
        {activities.map((activity, index) => (
          <div key={index} className="activity-item">
            <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: '2px' }}>
              {activity.description}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {formatRelativeDate(activity.date)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'var(--spacing-sm)' }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('touchpoints');
          }}
          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}
        >
          View All Activity
        </a>
      </div>
    </div>
  );
}

export default RecentActivity;
