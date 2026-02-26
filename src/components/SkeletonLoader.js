/**
 * Skeleton loading components that show the structure of content while loading.
 * Uses CSS shimmer animation defined in index.css.
 */

export function SkeletonText({ width, height = 14, className = '' }) {
  return <div className={`skeleton ${className}`} style={{ width: width || '100%', height }} />;
}

export function SkeletonAvatar({ size = 48 }) {
  return (
    <div
      className="skeleton"
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

export function SkeletonCard({ rows = 3, hasAvatar = false }) {
  return (
    <div className="skeleton-card">
      {hasAvatar && (
        <div className="skeleton-card-row">
          <SkeletonAvatar size={40} />
          <div className="card-col">
            <SkeletonText width="50%" height={16} />
            <div className="skeleton-spacer-sm" />
            <SkeletonText width="30%" height={12} />
          </div>
        </div>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ marginBottom: i < rows - 1 ? 'var(--spacing-sm)' : 0 }}>
          <SkeletonText width={i === rows - 1 ? '60%' : i === 0 ? '90%' : '75%'} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatGrid({ count = 3 }) {
  return (
    <div className="skeleton-stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat">
          <SkeletonText width="55%" height={12} />
          <div className="skeleton-spacer-md" />
          <SkeletonText width="35%" height={28} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonContactList({ count = 5 }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} rows={2} hasAvatar />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard-wrap">
      {/* Hero area */}
      <div className="skeleton-hero-row">
        <SkeletonAvatar size={80} />
        <div className="card-col">
          <SkeletonText width="45%" height={28} />
          <div className="skeleton-spacer-lg" />
          <SkeletonText width="25%" height={14} />
        </div>
      </div>

      {/* Stats */}
      <SkeletonStatGrid count={3} />

      {/* Sections */}
      <div className="skeleton-sections">
        <SkeletonText width="20%" height={20} />
        <div className="skeleton-spacer-2xl" />
        <SkeletonCard rows={3} />
        <div className="skeleton-spacer-xl" />
        <SkeletonCard rows={2} />
      </div>
    </div>
  );
}

export function ContactListSkeleton() {
  return (
    <div>
      <div className="skeleton-header-section">
        <SkeletonText width="25%" height={28} />
        <div className="skeleton-spacer-xl" />
        <SkeletonText width="100%" height={40} />
      </div>
      <SkeletonContactList count={6} />
    </div>
  );
}

export function ListPageSkeleton({ count = 5 }) {
  return (
    <div>
      <div className="skeleton-header-section">
        <SkeletonText width="30%" height={28} />
        <div className="skeleton-spacer-xl" />
        <SkeletonText width="100%" height={40} />
      </div>
      <div className="skeleton-list">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} rows={2} />
        ))}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div>
      <div className="skeleton-profile-header">
        <SkeletonAvatar size={64} />
        <div className="card-col">
          <SkeletonText width="35%" height={24} />
          <div className="skeleton-spacer-md" />
          <SkeletonText width="20%" height={14} />
        </div>
      </div>
      <SkeletonStatGrid count={3} />
      <div className="skeleton-profile-card">
        <SkeletonCard rows={4} />
      </div>
    </div>
  );
}
