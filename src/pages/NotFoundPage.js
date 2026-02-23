function NotFoundPage({ onNavigate }) {
  return (
    <div className="empty-state">
      <svg
        className="empty-state-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </svg>
      <h3 className="empty-state-title">Page Not Found</h3>
      <p>The page you are looking for does not exist.</p>
      <button className="btn btn-primary mt-md" onClick={() => onNavigate('dashboard')}>
        Go to Dashboard
      </button>
    </div>
  );
}

export default NotFoundPage;
