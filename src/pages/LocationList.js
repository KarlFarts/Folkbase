import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { readSheetData, readSheetMetadata } from '../utils/devModeWrapper';
import LocationCard from '../components/LocationCard';
import { SHEET_NAMES } from '../config/constants';
import { searchLocations, filterLocations, sortLocations } from '../services/locationService';
import {
  generateCSV,
  downloadFile,
  generateFilename,
  getAllFields,
} from '../services/exportService';
import { ListPageSkeleton } from '../components/SkeletonLoader';

function LocationList({ onNavigate }) {
  const { accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [locations, setLocations] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // View mode
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sheetId]);

  const loadLocations = async (isManualRefresh = false) => {
    if (!accessToken || !sheetId) {
      setError('Access token or Sheet ID is missing.');
      setLoading(false);
      return;
    }

    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      const [dataResult, metaResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATIONS),
        readSheetMetadata(accessToken, sheetId, SHEET_NAMES.LOCATIONS),
      ]);

      setLocations(dataResult.data);
      setMetadata(metaResult);

      if (isManualRefresh) {
        notify.success('Locations refreshed successfully');
      }
    } catch {
      // Error handled
      setError('Failed to load locations.');
      notify.error('Failed to load locations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    await loadLocations(true);
  };

  // Get dropdown options from metadata
  const typeOptions = metadata?.validationRules?.['Type'] || [
    'Office',
    'Store',
    'Restaurant',
    'Venue',
    'Public Space',
    'Warehouse',
    'Factory',
    'School',
    'Hospital',
    'Park',
    'Other',
  ];
  const statusOptions = metadata?.validationRules?.['Status'] || [
    'Active',
    'Inactive',
    'Temporarily Closed',
  ];
  const priorityOptions = metadata?.validationRules?.['Priority'] || [
    'Urgent',
    'High',
    'Medium',
    'Low',
    'No Urgency',
  ];

  // Filter and sort locations
  const filteredLocations = useMemo(() => {
    let result = [...locations];

    // Search filter
    if (searchQuery) {
      result = searchLocations(result, searchQuery);
    }

    // Apply filters
    const filters = {};
    if (typeFilter) filters.type = typeFilter;
    if (statusFilter) filters.status = statusFilter;
    if (priorityFilter) filters.priority = priorityFilter;

    if (Object.keys(filters).length > 0) {
      result = filterLocations(result, filters);
    }

    // Sort
    result = sortLocations(result, sortBy === 'name' ? 'Name' : sortBy, 'asc');

    return result;
  }, [locations, searchQuery, typeFilter, statusFilter, priorityFilter, sortBy]);

  // Quick export handler
  const handleQuickExport = () => {
    try {
      const allFields = getAllFields(filteredLocations);
      const csv = generateCSV(filteredLocations, allFields);
      const filename = generateFilename('touchpoint-locations', 'csv');
      downloadFile(csv, filename, 'text/csv');
      notify.success('Locations exported successfully');
    } catch {
      // Error handled
      notify.error('Failed to export locations');
    }
  };

  if (loading) {
    return <ListPageSkeleton count={5} />;
  }

  if (error) {
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
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h3 className="empty-state-title">Error</h3>
        <p>{error}</p>
        <button className="btn btn-primary mt-md" onClick={loadLocations}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="contact-list-header">
        <div>
          <h1>Locations</h1>
          <p className="text-muted">
            {filteredLocations.length} of {locations.length} locations
          </p>
        </div>
        <div className="cl-header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleQuickExport}
            disabled={filteredLocations.length === 0}
            title="Export filtered locations to CSV"
          >
            Export
          </button>
          <button
            className={`btn btn-ghost btn-icon-compact${refreshing ? ' spinning' : ''}`}
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Refresh from Google Sheets"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          <div className="cl-view-toggle">
            <button
              className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewMode('table')}
              title="Table view"
            >
              ≡
            </button>
          </div>

          <button className="btn btn-primary" onClick={() => onNavigate('add-location')}>
            + Add Location
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="cl-filters-row">
        <div className="search-container">
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
            placeholder="Search by name, address, type, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select cl-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {typeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select
          className="form-select cl-filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          {priorityOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select
          className="form-select cl-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          {statusOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select
          className="form-select cl-filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="Type">Sort by Type</option>
          <option value="Priority">Sort by Priority</option>
          <option value="Date Added">Sort by Date Added</option>
        </select>
      </div>

      {/* Location Grid */}
      {filteredLocations.length === 0 ? (
        <div className="empty-state">
          <svg
            className="empty-state-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h3 className="empty-state-title">
            {locations.length === 0 ? 'No locations yet' : 'No matching locations'}
          </h3>
          <p>
            {locations.length === 0
              ? 'Add your first location to get started'
              : 'Try adjusting your search or filters'}
          </p>
          <div className="empty-state-actions">
            {locations.length === 0 && (
              <button className="btn btn-primary" onClick={() => onNavigate('add-location')}>
                + Add Location
              </button>
            )}
            {locations.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('');
                  setStatusFilter('');
                  setPriorityFilter('');
                  setSortBy('name');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="contact-grid-wrapper">
          <div className="contact-grid">
            {filteredLocations.map((location) => (
              <div
                key={location['Location ID']}
                onClick={() => onNavigate('location-profile', location['Location ID'])}
                className="cl-grid-item"
              >
                <LocationCard location={location} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationList;
