import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { readSheetData, readSheetMetadata } from '../utils/devModeWrapper';
import OrganizationCard from '../components/OrganizationCard';
import { SHEET_NAMES } from '../config/constants';
import {
  searchOrganizations,
  filterOrganizations,
  sortOrganizations,
} from '../services/organizationService';
import {
  generateCSV,
  downloadFile,
  generateFilename,
  getAllFields,
} from '../services/exportService';
import { ListPageSkeleton } from '../components/SkeletonLoader';

function OrganizationList({ onNavigate }) {
  const { accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const [organizations, setOrganizations] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // View mode
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sheetId]);

  const loadOrganizations = async (isManualRefresh = false) => {
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
        readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS),
        readSheetMetadata(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS),
      ]);

      setOrganizations(dataResult.data);
      setMetadata(metaResult);

      if (isManualRefresh) {
        notify.success('Organizations refreshed successfully');
      }
    } catch {
      // Error handled
      setError('Failed to load organizations.');
      notify.error('Failed to load organizations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    await loadOrganizations(true);
  };

  // Get dropdown options from metadata
  const typeOptions = metadata?.validationRules?.['Type'] || [
    'Corporate',
    'Non-Profit',
    'Government',
    'Educational',
    'Small Business',
    'Union',
    'Association',
    'Other',
  ];
  const statusOptions = metadata?.validationRules?.['Status'] || [
    'Active',
    'Inactive',
    'Do Not Contact',
  ];
  const priorityOptions = metadata?.validationRules?.['Priority'] || [
    'Urgent',
    'High',
    'Medium',
    'Low',
    'No Urgency',
  ];

  // Extract unique industries
  const availableIndustries = useMemo(() => {
    const industries = new Set();
    organizations.forEach((org) => {
      const industry = org['Industry'];
      if (industry && industry.trim()) {
        industries.add(industry.trim());
      }
    });
    return Array.from(industries).sort();
  }, [organizations]);

  // Filter and sort organizations
  const filteredOrganizations = useMemo(() => {
    let result = [...organizations];

    // Search filter
    if (searchQuery) {
      result = searchOrganizations(result, searchQuery);
    }

    // Apply filters
    const filters = {};
    if (typeFilter) filters.type = typeFilter;
    if (statusFilter) filters.status = statusFilter;
    if (priorityFilter) filters.priority = priorityFilter;
    if (industryFilter) filters.industry = industryFilter;

    if (Object.keys(filters).length > 0) {
      result = filterOrganizations(result, filters);
    }

    // Sort
    result = sortOrganizations(result, sortBy === 'name' ? 'Name' : sortBy, 'asc');

    return result;
  }, [
    organizations,
    searchQuery,
    typeFilter,
    statusFilter,
    priorityFilter,
    industryFilter,
    sortBy,
  ]);

  // Quick export handler
  const handleQuickExport = () => {
    try {
      const allFields = getAllFields(filteredOrganizations);
      const csv = generateCSV(filteredOrganizations, allFields);
      const filename = generateFilename('touchpoint-organizations', 'csv');
      downloadFile(csv, filename, 'text/csv');
      notify.success('Organizations exported successfully');
    } catch {
      // Error handled
      notify.error('Failed to export organizations');
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
        <button className="btn btn-primary mt-md" onClick={loadOrganizations}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="contact-list-header">
        <div>
          <h1>Organizations</h1>
          <p className="text-muted">
            {filteredOrganizations.length} of {organizations.length} organizations
          </p>
        </div>
        <div className="cl-header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleQuickExport}
            disabled={filteredOrganizations.length === 0}
            title="Export filtered organizations to CSV"
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

          <button className="btn btn-primary" onClick={() => onNavigate('add-organization')}>
            + Add Organization
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
            placeholder="Search by name, industry, website, tags..."
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

        {availableIndustries.length > 0 && (
          <select
            className="form-select cl-filter-select"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            <option value="">All Industries</option>
            {availableIndustries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        )}

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
          <option value="Industry">Sort by Industry</option>
          <option value="Priority">Sort by Priority</option>
          <option value="Date Added">Sort by Date Added</option>
        </select>
      </div>

      {/* Organization Grid */}
      {filteredOrganizations.length === 0 ? (
        <div className="empty-state">
          <svg
            className="empty-state-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <h3 className="empty-state-title">
            {organizations.length === 0 ? 'No organizations yet' : 'No matching organizations'}
          </h3>
          <p>
            {organizations.length === 0
              ? 'Add your first organization to get started'
              : 'Try adjusting your search or filters'}
          </p>
          {organizations.length === 0 && (
            <button
              className="btn btn-primary mt-md"
              onClick={() => onNavigate('add-organization')}
            >
              + Add Organization
            </button>
          )}
        </div>
      ) : (
        <div className="contact-grid-wrapper">
          <div className="contact-grid">
            {filteredOrganizations.map((organization) => (
              <div
                key={organization['Organization ID']}
                onClick={() => onNavigate('organization-profile', organization['Organization ID'])}
                className="cl-grid-item"
              >
                <OrganizationCard organization={organization} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationList;
