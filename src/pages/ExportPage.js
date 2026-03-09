import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { readSheetData, readSheetMetadata, SHEETS } from '../utils/devModeWrapper';
import ExportFilters from '../components/export/ExportFilters';
import FieldSelector from '../components/export/FieldSelector';
import {
  generateCSV,
  generateVCard,
  downloadFile,
  generateFilename,
  getAllFields,
  FIELD_PRESETS,
} from '../services/exportService';

function ExportPage({ onNavigate }) {
  const { accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  const [contacts, setContacts] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Export settings
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    tags: '',
  });
  const [format, setFormat] = useState('csv');
  const [selectedFields, setSelectedFields] = useState(FIELD_PRESETS.full);
  const [currentPreset, setCurrentPreset] = useState('full');

  useEffect(() => {
    loadContacts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, sheetId]);

  const loadContacts = async () => {
    if (!accessToken || !sheetId) {
      setError('Access token or Sheet ID is missing.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [dataResult, metaResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
        readSheetMetadata(accessToken, sheetId, SHEETS.CONTACTS),
      ]);

      setContacts(dataResult.data);
      setMetadata(metaResult);
    } catch {
      setError('Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  };

  // Get dropdown options from metadata
  const priorityOptions = metadata?.validationRules?.['Priority'] || [];
  const statusOptions = metadata?.validationRules?.['Status'] || [];

  // Get all available fields
  const availableFields = useMemo(() => {
    return getAllFields(contacts);
  }, [contacts]);

  // Filter contacts based on current filters
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          (c['Name'] || '').toLowerCase().includes(query) ||
          (c['Organization'] || '').toLowerCase().includes(query) ||
          (c['Tags'] || '').toLowerCase().includes(query) ||
          (c['District'] || '').toLowerCase().includes(query) ||
          (c['Phone'] || '').includes(query) ||
          (c['Email'] || '').toLowerCase().includes(query)
      );
    }

    // Priority filter
    if (filters.priority) {
      result = result.filter((c) => c['Priority'] === filters.priority);
    }

    // Status filter
    if (filters.status) {
      result = result.filter((c) => c['Status'] === filters.status);
    }

    // Tags filter
    if (filters.tags) {
      const tagQuery = filters.tags.toLowerCase();
      result = result.filter((c) => (c['Tags'] || '').toLowerCase().includes(tagQuery));
    }

    return result;
  }, [contacts, filters]);

  const handleExport = () => {
    if (filteredContacts.length === 0) {
      notify.warning('No contacts to export with current filters.');
      return;
    }

    try {
      if (format === 'csv') {
        const csv = generateCSV(filteredContacts, selectedFields);
        const filename = generateFilename('touchpoint-contacts', 'csv');
        downloadFile(csv, filename, 'text/csv');
      } else if (format === 'vcard') {
        const vcard = generateVCard(filteredContacts);
        const filename = generateFilename('touchpoint-contacts', 'vcf');
        downloadFile(vcard, filename, 'text/vcard');
      }
    } catch {
      notify.error('Failed to export contacts. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading contacts...</p>
      </div>
    );
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
        <button className="btn btn-primary mt-md" onClick={loadContacts}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="export-header">
        <button className="btn btn-text export-back-btn" onClick={() => onNavigate('contacts')}>
          ← Back to Contacts
        </button>
        <h1>Export Contacts</h1>
        <p className="text-muted">Export your contacts to use in other systems</p>
      </div>

      {/* Filters Section */}
      <div className="card export-section">
        <div className="form-section">
          <h3>Filters</h3>
          <ExportFilters
            filters={filters}
            onFiltersChange={setFilters}
            priorityOptions={priorityOptions}
            statusOptions={statusOptions}
          />
        </div>
        <div className="export-count-bar">
          <p className="text-muted export-count-text">
            <strong>{filteredContacts.length}</strong> of {contacts.length} contacts match current
            filters
          </p>
        </div>
      </div>

      {/* Format Selection */}
      <div className="card export-section">
        <div className="form-section">
          <h3>Export Format</h3>
          <div className="export-format-list">
            <label className="export-format-option">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={(e) => setFormat(e.target.value)}
                className="export-format-radio"
              />
              <div className="export-format-body">
                <span className="export-format-name">CSV</span>
                <p className="text-muted export-format-desc">
                  Spreadsheet format compatible with Excel, Google Sheets, and databases
                </p>
              </div>
            </label>
            <label className="export-format-option">
              <input
                type="radio"
                name="format"
                value="vcard"
                checked={format === 'vcard'}
                onChange={(e) => setFormat(e.target.value)}
                className="export-format-radio"
              />
              <div className="export-format-body">
                <span className="export-format-name">vCard</span>
                <p className="text-muted export-format-desc">
                  Contact file format for phones, email clients, and Google Contacts
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Field Selection (CSV only) */}
      {format === 'csv' && (
        <div className="card export-section">
          <div className="form-section">
            <h3>Fields to Export</h3>
            <FieldSelector
              availableFields={availableFields}
              selectedFields={selectedFields}
              onFieldsChange={setSelectedFields}
              currentPreset={currentPreset}
              onPresetChange={setCurrentPreset}
            />
          </div>
        </div>
      )}

      {/* vCard info */}
      {format === 'vcard' && (
        <div className="card export-section">
          <div className="form-section">
            <h3>Export Fields</h3>
            <p className="text-muted">
              vCard format will include all applicable contact fields: Name, Phone, Email,
              Organization, Role, and Biography.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="export-actions">
        <button className="btn btn-secondary" onClick={() => onNavigate('contacts')}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={
            filteredContacts.length === 0 || (format === 'csv' && selectedFields.length === 0)
          }
        >
          Download Export
        </button>
      </div>
    </div>
  );
}

export default ExportPage;
