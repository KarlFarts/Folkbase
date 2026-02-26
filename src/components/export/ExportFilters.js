function ExportFilters({
  filters,
  onFiltersChange,
  priorityOptions,
  statusOptions
}) {

  const handleFilterChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  return (
    <div className="export-filters">
      <h3 className="ef-heading">Filters</h3>

      <div className="ef-grid">
        {/* Search */}
        <div>
          <label htmlFor="filter-search" className="form-label">
            Search
          </label>
          <input
            id="filter-search"
            type="text"
            className="form-input"
            placeholder="Name, org, tags, phone..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="filter-status" className="form-label">
            Status
          </label>
          <select
            id="filter-status"
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All</option>
            {statusOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="filter-priority" className="form-label">
            Priority
          </label>
          <select
            id="filter-priority"
            className="form-select"
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All</option>
            {priorityOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="filter-tags" className="form-label">
            Tags (contains)
          </label>
          <input
            id="filter-tags"
            type="text"
            className="form-input"
            placeholder="Labor, Volunteer..."
            value={filters.tags}
            onChange={(e) => handleFilterChange('tags', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default ExportFilters;
