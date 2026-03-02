import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useNotification } from '../contexts/NotificationContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  readSheetData,
  readSheetMetadata,
  SHEETS,
  batchUpdateContacts,
  updateContact,
  copyContactToWorkspace,
} from '../utils/devModeWrapper';
import ContactCard from '../components/ContactCard';
import { ContactListSkeleton } from '../components/SkeletonLoader';
import ContactTable from '../components/ContactTable';
import BulkActionsToolbar from '../components/BulkActionsToolbar';
import BatchEditModal from '../components/BatchEditModal';
import ListsFilter from '../components/ListsFilter';
import TagManager from '../components/TagManager';
import WindowTemplate from '../components/WindowTemplate';
import {
  generateCSV,
  downloadFile,
  generateFilename,
  getAllFields,
} from '../services/exportService';
import { createAutoRefreshService } from '../services/autoRefreshService';

const FIELD_OPTIONS = [
  'Name',
  'Phone',
  'Email',
  'Address',
  'City',
  'State',
  'Zip',
  'Notes',
  'Tags',
  'Status',
  'Priority',
  'Source',
];

// Bulk Copy Modal Component
function BulkCopyModal({
  isOpen,
  selectedCount,
  workspaces,
  currentWorkspace,
  onCopy,
  onClose,
  isLoading,
  sheetId,
}) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [syncStrategy, setSyncStrategy] = useState('core_fields_only');
  const [createLink, setCreateLink] = useState(true);
  const [customFields, setCustomFields] = useState([]);
  const [error, setError] = useState('');

  const handleFieldToggle = (field) => {
    if (customFields.includes(field)) {
      setCustomFields(customFields.filter((f) => f !== field));
    } else {
      setCustomFields([...customFields, field]);
    }
  };

  const handleCopy = async () => {
    if (!selectedWorkspaceId) {
      setError('Please select a workspace');
      return;
    }

    if (syncStrategy === 'custom' && customFields.length === 0) {
      setError('Please select at least one field to sync');
      return;
    }

    const targetWorkspace = workspaces.find((c) => c.id === selectedWorkspaceId);
    let linkConfig = null;

    if (createLink) {
      linkConfig = {
        createLink: true,
        syncStrategy,
        customFields: syncStrategy === 'custom' ? customFields : [],
        sourceWorkspace: {
          type: currentWorkspace.type,
          id: currentWorkspace.id,
          sheetId: sheetId,
          contactId: null, // Will be set per contact
        },
        targetWorkspace: {
          type: 'workspace',
          id: selectedWorkspaceId,
          sheetId: targetWorkspace.sheet_id,
          contactId: null, // Will be set after copy
        },
      };
    }

    await onCopy(selectedWorkspaceId, linkConfig);
  };

  if (!isOpen) return null;

  return (
    <WindowTemplate
      isOpen={isOpen}
      onClose={onClose}
      title={`Copy ${selectedCount} Contact${selectedCount !== 1 ? 's' : ''} to Workspace`}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={!selectedWorkspaceId || isLoading}
          >
            {isLoading
              ? 'Copying...'
              : `Copy ${selectedCount} Contact${selectedCount !== 1 ? 's' : ''}`}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label htmlFor="workspace-select" className="form-label">
          Select Target Workspace
        </label>
        <select
          id="workspace-select"
          className="form-control"
          value={selectedWorkspaceId}
          onChange={(e) => {
            setSelectedWorkspaceId(e.target.value);
            setError('');
          }}
          disabled={isLoading}
        >
          <option value="">-- Choose a workspace --</option>
          {workspaces.map((ws) => (
            <option key={ws.id} value={ws.id}>
              {ws.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            checked={createLink}
            onChange={(e) => setCreateLink(e.target.checked)}
            disabled={isLoading}
          />
          <span className="bulk-copy-checkbox-label">
            Create sync links (changes will sync between workspaces)
          </span>
        </label>
      </div>

      {createLink && (
        <>
          <div className="form-group">
            <label className="form-label">Sync Strategy</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="core_fields_only"
                  checked={syncStrategy === 'core_fields_only'}
                  onChange={(e) => setSyncStrategy(e.target.value)}
                  disabled={isLoading}
                />
                <div>
                  <strong>Core Fields Only</strong>
                  <p className="text-sm">Sync Name, Phone, and Email only</p>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="all_fields"
                  checked={syncStrategy === 'all_fields'}
                  onChange={(e) => setSyncStrategy(e.target.value)}
                  disabled={isLoading}
                />
                <div>
                  <strong>All Fields</strong>
                  <p className="text-sm">Sync all contact information</p>
                </div>
              </label>

              <label className="radio-option">
                <input
                  type="radio"
                  name="syncStrategy"
                  value="custom"
                  checked={syncStrategy === 'custom'}
                  onChange={(e) => setSyncStrategy(e.target.value)}
                  disabled={isLoading}
                />
                <div>
                  <strong>Custom Fields</strong>
                  <p className="text-sm">Choose specific fields to sync</p>
                </div>
              </label>
            </div>
          </div>

          {syncStrategy === 'custom' && (
            <div className="form-group">
              <label className="form-label">Select Fields to Sync</label>
              <div className="bulk-copy-field-grid">
                {FIELD_OPTIONS.map((field) => (
                  <label key={field} className="bulk-copy-field-option">
                    <input
                      type="checkbox"
                      checked={customFields.includes(field)}
                      onChange={() => handleFieldToggle(field)}
                      disabled={isLoading}
                    />
                    <span className="text-sm">{field}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="copy-info-box">
        <p className="text-sm">
          {createLink ? (
            <>
              <strong>Sync Links:</strong> Changes to synced fields will update in both workspaces.
              Conflicts will require manual resolution.
            </>
          ) : (
            <>
              <strong>One-time Copy:</strong> {selectedCount} contact
              {selectedCount !== 1 ? 's will' : ' will'} be copied to the workspace sheet. The
              original contacts will remain unchanged.
            </>
          )}
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
    </WindowTemplate>
  );
}

function ContactList({ onNavigate }) {
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { notify } = useNotification();
  const { userWorkspaces, mode, activeWorkspace } = useWorkspace();
  const { canWrite } = usePermissions();
  const [contacts, setContacts] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updateNotification, setUpdateNotification] = useState(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
  const [bulkActionProgress, setBulkActionProgress] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [batchEditModalOpen, setBatchEditModalOpen] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showBulkCopyModal, setShowBulkCopyModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [collectionFilter, setCollectionFilter] = useState(null);
  const [contactListMappings, setContactListMappings] = useState([]);
  const [sortBy, setSortBy] = useState('name');

  // View mode and sorting
  const [viewMode, setViewMode] = useState('grid');
  const [sortConfig, setSortConfig] = useState({ field: 'name', direction: 'asc' });

  // Auto-refresh service reference
  const autoRefreshServiceRef = useRef(null);

  useEffect(() => {
    loadContacts();
  }, [accessToken, sheetId]);

  const loadContacts = async (isManualRefresh = false) => {
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

      const [dataResult, metaResult, listMappingsResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
        readSheetMetadata(accessToken, sheetId, SHEETS.CONTACTS),
        readSheetData(accessToken, sheetId, SHEETS.CONTACT_LISTS),
      ]);

      setContacts(dataResult.data);
      setMetadata(metaResult);
      setContactListMappings(listMappingsResult.data || []);

      if (isManualRefresh) {
        // Show brief success notification
        setUpdateNotification('Contacts refreshed successfully');
        setTimeout(() => setUpdateNotification(null), 3000);
      }
    } catch {
      setError('Failed to load contacts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Setup auto-refresh service
  useEffect(() => {
    if (!accessToken || !sheetId) return;

    // Create fetch function for auto-refresh
    const fetchData = async () => {
      const { data } = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
      return data;
    };

    // Callback when data changes
    const onDataChanged = async (newData) => {
      setContacts(newData);
      setUpdateNotification('Contacts updated from Google Sheets');
      setTimeout(() => setUpdateNotification(null), 5000);
    };

    // Create and start service
    const service = createAutoRefreshService(fetchData, onDataChanged, {
      intervalMs: 60000, // 60 seconds
      onError: () => {
        // Silently fail - don't disrupt user experience
      },
    });

    autoRefreshServiceRef.current = service;
    service.start();

    // Cleanup on unmount
    return () => {
      if (autoRefreshServiceRef.current) {
        autoRefreshServiceRef.current.stop();
      }
    };
  }, [accessToken, sheetId]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    await loadContacts(true);

    // Reset checksum so auto-refresh doesn't think data changed
    if (autoRefreshServiceRef.current) {
      autoRefreshServiceRef.current.resetChecksum();
    }
  }, [accessToken, sheetId]);

  // Sort handler for table column clicks
  const handleSort = useCallback((field) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Get dropdown options from metadata
  const priorityOptions = metadata?.validationRules?.['Priority'] || [];
  const statusOptions = metadata?.validationRules?.['Status'] || [];

  // Extract unique tags from all contacts
  const availableTags = useMemo(() => {
    const tagSet = new Set();
    contacts.forEach((c) => {
      if (c['Tags']) {
        c['Tags'].split(',').forEach((tag) => tagSet.add(tag.trim()));
      }
    });
    return Array.from(tagSet).sort();
  }, [contacts]);

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
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
    if (priorityFilter) {
      result = result.filter((c) => c['Priority'] === priorityFilter);
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((c) => c['Status'] === statusFilter);
    }

    // Tag filter
    if (tagFilter) {
      result = result.filter((c) => {
        const tags = (c['Tags'] || '').split(',').map((t) => t.trim());
        return tags.includes(tagFilter);
      });
    }

    // Collection filter
    if (collectionFilter) {
      const contactIdsInCollection = contactListMappings
        .filter((cc) => cc['List ID'] === collectionFilter)
        .map((cc) => cc['Contact ID']);
      result = result.filter((c) => contactIdsInCollection.includes(c['Contact ID']));
    }

    // Sort
    const sortField = viewMode === 'table' ? sortConfig.field : sortBy;
    const sortDir = viewMode === 'table' ? sortConfig.direction : 'asc';

    result.sort((a, b) => {
      let comparison = 0;

      if (viewMode === 'table') {
        // Table view sorting
        switch (sortField) {
          case 'name':
            comparison = (a['Name'] || '').localeCompare(b['Name'] || '');
            break;
          case 'priority': {
            const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3, 'No Urgency': 4 };
            comparison = (priorityOrder[a['Priority']] ?? 5) - (priorityOrder[b['Priority']] ?? 5);
            break;
          }
          case 'status':
            comparison = (a['Status'] || '').localeCompare(b['Status'] || '');
            break;
          case 'lastContact': {
            const dateA = a['Last Contact Date'] || '';
            const dateB = b['Last Contact Date'] || '';
            comparison = (dateB || '').localeCompare(dateA || '');
            break;
          }
          default:
            comparison = 0;
        }
      } else {
        // Grid view sorting
        switch (sortField) {
          case 'name':
            comparison = (a['Name'] || '').localeCompare(b['Name'] || '');
            break;
          case 'priority': {
            const priorityOrderGrid = { Urgent: 0, High: 1, Medium: 2, Low: 3, 'No Urgency': 4 };
            comparison =
              (priorityOrderGrid[a['Priority']] ?? 5) - (priorityOrderGrid[b['Priority']] ?? 5);
            break;
          }
          case 'recent': {
            const dateAGrid = a['Last Contact Date'] || a['Date Added'] || '';
            const dateBGrid = b['Last Contact Date'] || b['Date Added'] || '';
            comparison = dateBGrid.localeCompare(dateAGrid);
            break;
          }
          case 'organization':
            comparison = (a['Organization'] || '').localeCompare(b['Organization'] || '');
            break;
          default:
            comparison = 0;
        }
      }

      return sortDir === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [
    contacts,
    searchQuery,
    priorityFilter,
    statusFilter,
    tagFilter,
    collectionFilter,
    contactListMappings,
    sortBy,
    viewMode,
    sortConfig,
  ]);

  // Bulk action handlers
  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(filteredContacts.map((c) => c['Contact ID'])));
  }, [filteredContacts]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleToggleSelect = useCallback((contactId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }, []);

  const handleTagContacts = useCallback(
    async (tag) => {
      if (selectedIds.size === 0) return;

      setBulkActionInProgress(true);
      try {
        const selectedContacts = contacts.filter((c) => selectedIds.has(c['Contact ID']));
        const updatedContacts = selectedContacts.map((c) => ({
          ...c,
          Tags: c['Tags'] ? `${c['Tags']}, ${tag}` : tag,
        }));

        // Update sheet with selected contacts
        for (let i = 0; i < updatedContacts.length; i++) {
          const contact = updatedContacts[i];
          // In a real app, you'd batch these updates
          // For now, we'll update locally
          setContacts((prevContacts) =>
            prevContacts.map((c) => (c['Contact ID'] === contact['Contact ID'] ? contact : c))
          );
          setBulkActionProgress(((i + 1) / updatedContacts.length) * 100);
        }

        setUpdateNotification(
          `Tagged ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}`
        );
        setSelectedIds(new Set());
        setTimeout(() => setUpdateNotification(null), 3000);
      } catch {
        setUpdateNotification('Failed to tag contacts');
      } finally {
        setBulkActionInProgress(false);
        setBulkActionProgress(0);
      }
    },
    [selectedIds, contacts]
  );

  const handleChangeStatus = useCallback(
    async (status) => {
      if (selectedIds.size === 0) return;

      setBulkActionInProgress(true);
      try {
        const selectedContacts = contacts.filter((c) => selectedIds.has(c['Contact ID']));
        const updatedContacts = selectedContacts.map((c) => ({
          ...c,
          Status: status,
        }));

        // Update contacts
        for (let i = 0; i < updatedContacts.length; i++) {
          const contact = updatedContacts[i];
          setContacts((prevContacts) =>
            prevContacts.map((c) => (c['Contact ID'] === contact['Contact ID'] ? contact : c))
          );
          setBulkActionProgress(((i + 1) / updatedContacts.length) * 100);
        }

        setUpdateNotification(
          `Updated status for ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}`
        );
        setSelectedIds(new Set());
        setTimeout(() => setUpdateNotification(null), 3000);
      } catch {
        setUpdateNotification('Failed to update status');
      } finally {
        setBulkActionInProgress(false);
        setBulkActionProgress(0);
      }
    },
    [selectedIds, contacts]
  );

  const handleDeleteContacts = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setBulkActionInProgress(true);
    try {
      const remainingContacts = contacts.filter((c) => !selectedIds.has(c['Contact ID']));
      setContacts(remainingContacts);

      setUpdateNotification(
        `Deleted ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}`
      );
      setSelectedIds(new Set());
      setTimeout(() => setUpdateNotification(null), 3000);
    } catch {
      setUpdateNotification('Failed to delete contacts');
    } finally {
      setBulkActionInProgress(false);
      setBulkActionProgress(0);
    }
  }, [selectedIds, contacts]);

  const handleExportSelected = useCallback(() => {
    if (selectedIds.size === 0) return;

    try {
      const selectedContacts = contacts.filter((c) => selectedIds.has(c['Contact ID']));
      const allFields = getAllFields(selectedContacts);
      const csv = generateCSV(selectedContacts, allFields);
      const filename = generateFilename('touchpoint-contacts-selected', 'csv');
      downloadFile(csv, filename, 'text/csv');

      setUpdateNotification(
        `Exported ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}`
      );
      setTimeout(() => setUpdateNotification(null), 3000);
    } catch {
      setUpdateNotification('Failed to export contacts');
    }
  }, [selectedIds, contacts]);

  const handleBatchEdit = useCallback(
    async (updateData) => {
      if (selectedIds.size === 0) return;

      setBulkActionInProgress(true);
      try {
        const contactIdArray = Array.from(selectedIds);
        await batchUpdateContacts(accessToken, sheetId, contactIdArray, updateData);

        // Update local state
        const updatedContacts = contacts.map((c) => {
          if (selectedIds.has(c['Contact ID'])) {
            return { ...c, ...updateData };
          }
          return c;
        });
        setContacts(updatedContacts);

        setUpdateNotification(
          `Updated ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}`
        );
        setSelectedIds(new Set());
        setBatchEditModalOpen(false);
        setTimeout(() => setUpdateNotification(null), 3000);
      } catch {
        setUpdateNotification('Failed to update contacts');
      } finally {
        setBulkActionInProgress(false);
      }
    },
    [selectedIds, contacts, accessToken, sheetId]
  );

  const handleBulkCopyToWorkspace = useCallback(
    async (workspaceId, linkConfig) => {
      if (selectedIds.size === 0) return;

      setBulkActionInProgress(true);
      try {
        const selectedContacts = contacts.filter((c) => selectedIds.has(c['Contact ID']));
        const targetWorkspace = userWorkspaces.find((c) => c.id === workspaceId);

        if (!targetWorkspace || !targetWorkspace.sheet_id) {
          throw new Error('Workspace sheet ID not found');
        }

        let successCount = 0;
        for (let i = 0; i < selectedContacts.length; i++) {
          const contact = selectedContacts[i];
          try {
            // Build linkConfig for this contact
            const contactLinkConfig = linkConfig
              ? {
                  ...linkConfig,
                  sourceWorkspace: {
                    ...linkConfig.sourceWorkspace,
                    contactId: contact['Contact ID'],
                  },
                }
              : null;

            await copyContactToWorkspace(
              accessToken,
              sheetId,
              contact['Contact ID'],
              targetWorkspace.sheet_id,
              user.email,
              contactLinkConfig
            );
            successCount++;
          } catch {
            // Continue with other contacts
          }
          setBulkActionProgress(((i + 1) / selectedContacts.length) * 100);
        }

        notify.success(
          `Copied ${successCount} of ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''} to ${targetWorkspace.name}`
        );
        setSelectedIds(new Set());
        setShowBulkCopyModal(false);
      } catch {
        notify.error('Failed to copy contacts');
      } finally {
        setBulkActionInProgress(false);
        setBulkActionProgress(0);
      }
    },
    [selectedIds, contacts, userWorkspaces, accessToken, sheetId, user]
  );

  const handleBulkUpdateTags = useCallback(
    async (updatedContacts) => {
      setBulkActionInProgress(true);
      try {
        // Update all contacts in sheets
        for (let i = 0; i < updatedContacts.length; i++) {
          const contact = updatedContacts[i];
          await updateContact(accessToken, sheetId, contact['Contact ID'], contact);
          setBulkActionProgress(((i + 1) / updatedContacts.length) * 100);
        }

        // Update local state
        setContacts((prevContacts) => {
          const updated = [...prevContacts];
          updatedContacts.forEach((updatedContact) => {
            const idx = updated.findIndex((c) => c['Contact ID'] === updatedContact['Contact ID']);
            if (idx !== -1) {
              updated[idx] = updatedContact;
            }
          });
          return updated;
        });

        setUpdateNotification('Tags updated successfully');
        setShowTagManager(false);
        setTimeout(() => setUpdateNotification(null), 3000);
      } catch {
        setUpdateNotification('Failed to update tags');
      } finally {
        setBulkActionInProgress(false);
        setBulkActionProgress(0);
      }
    },
    [accessToken, sheetId]
  );

  // Quick export handler
  const handleQuickExport = () => {
    try {
      const allFields = getAllFields(filteredContacts);
      const csv = generateCSV(filteredContacts, allFields);
      const filename = generateFilename('touchpoint-contacts', 'csv');
      downloadFile(csv, filename, 'text/csv');
    } catch {
      notify.error('Failed to export contacts. Please try again.');
    }
  };

  if (loading) {
    return <ContactListSkeleton />;
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
      {/* Update notification toast */}
      {updateNotification && (
        <div className="cl-toast">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>{updateNotification}</span>
        </div>
      )}

      <div className="contact-list-header">
        <div>
          <h1>Contacts</h1>
          <p className="text-muted">
            {filteredContacts.length} of {contacts.length} contacts
          </p>
        </div>
        <div className="cl-header-actions">
          <button className="btn btn-secondary" onClick={() => onNavigate('import')}>
            Import
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('quick-sync')}
            title="Import contacts from your phone"
          >
            Upload Contacts
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleQuickExport}
            disabled={filteredContacts.length === 0}
            title="Export filtered contacts to CSV"
          >
            Export
          </button>
          <button
            className={`btn btn-ghost btn-icon-compact${refreshing ? ' spinning' : ''}`}
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Refresh from Google Sheets"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="20"
              height="20"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            className={`btn ${selectMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) {
                setSelectedIds(new Set());
              }
            }}
            title={selectMode ? 'Exit selection mode' : 'Select multiple contacts'}
          >
            {selectMode ? (
              <>
                <Check size={14} /> Done Selecting
              </>
            ) : (
              'Select Multiple'
            )}
          </button>

          {/* View toggle buttons */}
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

          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('duplicates')}
            title="Find and link duplicate contacts"
          >
            Find Duplicates
          </button>
          {canWrite('contacts') && (
            <button className="btn btn-primary" onClick={() => onNavigate('add-contact')}>
              + Add Contact
            </button>
          )}
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
            placeholder="Search by name, org, tags, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

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

        {availableTags.length > 0 && (
          <select
            className="form-select cl-filter-select"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          >
            <option value="">All Tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        )}

        <select
          className="form-select cl-filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="priority">Sort by Priority</option>
          <option value="recent">Sort by Recent</option>
          <option value="organization">Sort by Organization</option>
        </select>
      </div>

      {/* Lists Filter */}
      <ListsFilter onFilterChange={setCollectionFilter} />

      {/* Contact Grid */}
      {filteredContacts.length === 0 ? (
        <div className="empty-state">
          <svg
            className="empty-state-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3 className="empty-state-title">
            {contacts.length === 0 ? 'No contacts yet' : 'No matching contacts'}
          </h3>
          <p>
            {contacts.length === 0
              ? 'Add your first contact to get started'
              : 'Try adjusting your search or filters'}
          </p>
          {contacts.length === 0 && canWrite('contacts') && (
            <button className="btn btn-primary mt-md" onClick={() => onNavigate('add-contact')}>
              + Add Contact
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <ContactTable
          contacts={filteredContacts}
          onContactClick={(contact) => onNavigate('contact-profile', contact['Contact ID'])}
          selectMode={selectMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          sortBy={sortConfig.field}
          sortDirection={sortConfig.direction}
          onSort={handleSort}
        />
      ) : (
        <div className="contact-grid-wrapper">
          <div className="contact-grid">
            {filteredContacts.map((contact) => (
              <div
                key={contact['Contact ID']}
                onClick={() => {
                  if (selectMode) {
                    handleToggleSelect(contact['Contact ID']);
                  } else {
                    onNavigate('contact-profile', contact['Contact ID']);
                  }
                }}
                className={`cl-grid-item${selectedIds.has(contact['Contact ID']) ? ' cl-grid-item--selected' : ''}`}
              >
                <ContactCard contact={contact} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Edit Modal */}
      <BatchEditModal
        isOpen={batchEditModalOpen}
        selectedCount={selectedIds.size}
        onApply={handleBatchEdit}
        onCancel={() => setBatchEditModalOpen(false)}
        isLoading={bulkActionInProgress}
      />

      {/* Bulk Copy to Workspace Modal */}
      {showBulkCopyModal && (
        <BulkCopyModal
          isOpen={showBulkCopyModal}
          selectedCount={selectedIds.size}
          workspaces={userWorkspaces}
          currentWorkspace={{
            type: mode === 'workspace' ? 'workspace' : 'personal',
            id: mode === 'workspace' ? activeWorkspace?.id : user.email,
          }}
          onCopy={handleBulkCopyToWorkspace}
          onClose={() => setShowBulkCopyModal(false)}
          isLoading={bulkActionInProgress}
          sheetId={sheetId}
        />
      )}

      {/* Manage Tags Button */}
      <div className="cl-manage-tags">
        <button className="btn btn-primary" onClick={() => setShowTagManager(true)}>
          Manage Tags
        </button>
      </div>

      {/* Bulk actions toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedIds.size}
        totalCount={filteredContacts.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onTagContacts={handleTagContacts}
        onChangeStatus={handleChangeStatus}
        onDeleteContacts={handleDeleteContacts}
        onExportContacts={handleExportSelected}
        onBatchEdit={() => setBatchEditModalOpen(true)}
        onCopyToWorkspace={() => setShowBulkCopyModal(true)}
        isLoading={bulkActionInProgress}
        progress={bulkActionProgress}
      />

      {/* Tag Manager Modal */}
      {showTagManager && (
        <TagManager
          contacts={contacts}
          onUpdateContacts={handleBulkUpdateTags}
          onClose={() => setShowTagManager(false)}
        />
      )}
    </div>
  );
}

export default ContactList;
