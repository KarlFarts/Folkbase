import React from 'react';

/**
 * ContactFilters - Search and filter controls for contact list
 */
function ContactFilters({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  statusFilter,
  onStatusChange,
  tagFilter,
  onTagChange,
  sortBy,
  onSortChange,
  priorityOptions,
  statusOptions,
  availableTags,
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--spacing-md)',
        marginBottom: 'var(--spacing-lg)',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
      }}
    >
      {/* Search Input */}
      <div className="search-container" style={{ flex: '1', minWidth: '250px' }}>
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, org, tags, phone, email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Priority Filter */}
      <select
        className="form-select"
        style={{ width: 'auto', minWidth: '150px' }}
        value={priorityFilter}
        onChange={(e) => onPriorityChange(e.target.value)}
      >
        <option value="">All Priorities</option>
        {priorityOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {/* Status Filter */}
      <select
        className="form-select"
        style={{ width: 'auto', minWidth: '150px' }}
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        <option value="">All Statuses</option>
        {statusOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <select
          className="form-select"
          style={{ width: 'auto', minWidth: '150px' }}
          value={tagFilter}
          onChange={(e) => onTagChange(e.target.value)}
        >
          <option value="">All Tags</option>
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      )}

      {/* Sort Options */}
      <select
        className="form-select"
        style={{ width: 'auto', minWidth: '150px' }}
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
      >
        <option value="name">Sort by Name</option>
        <option value="priority">Sort by Priority</option>
        <option value="recent">Sort by Recent</option>
        <option value="organization">Sort by Organization</option>
      </select>
    </div>
  );
}

export default ContactFilters;
