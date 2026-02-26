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
        <h3 className="ra-heading">Recent Activity</h3>
        <div className="ra-empty">No recent activity</div>
      </div>
    );
  }

  return (
    <div className="sidebar-section">
      <h3 className="ra-heading">Recent Activity</h3>

      <div className="activity-list">
        {activities.map((activity, index) => (
          <div key={index} className="activity-item">
            <div className="ra-activity-desc">{activity.description}</div>
            <div className="ra-activity-date">{formatRelativeDate(activity.date)}</div>
          </div>
        ))}
      </div>

      <div className="ra-view-all-row">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('touchpoints');
          }}
          className="ra-view-all-link"
        >
          View All Activity
        </a>
      </div>
    </div>
  );
}

export default RecentActivity;
