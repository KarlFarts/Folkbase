import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { usePermissions } from '../hooks/usePermissions';
import { readSheetData, addTouchpoint, updateTouchpoint, deleteTouchpoint, SHEETS } from '../utils/devModeWrapper';
import ContactSelector from '../components/ContactSelector';
import { ListPageSkeleton } from '../components/SkeletonLoader';

function TouchpointsList({ onNavigate }) {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const { canWrite } = usePermissions();
  const [touchpoints, setTouchpoints] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [_filter, _setFilter] = useState('all'); // 'all', 'recent', 'by-contact'

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTouchpoint, setEditingTouchpoint] = useState(null);
  const [deletingTouchpoint, setDeletingTouchpoint] = useState(null);
  const [touchpointFormData, setTouchpointFormData] = useState({
    'Contact ID': '',
    Date: new Date().toISOString().split('T')[0],
    Type: '',
    Notes: '',
    'Follow-up Needed': 'No',
    'Follow-up Date': '',
    Outcome: '',
    'Duration (min)': '',
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const loadData = useCallback(async () => {
    if (!sheetId || !accessToken) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setNeedsReauth(false);

      const [touchpointsResult, contactsResult] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.TOUCHPOINTS, refreshAccessToken),
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS, refreshAccessToken),
      ]);

      setTouchpoints(touchpointsResult.data || []);
      setContacts(contactsResult.data || []);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setNeedsReauth(true);
        setError('Your session has expired. Please sign in again to continue.');
      } else {
        setError('Failed to load touchpoints. Make sure you have access to the Google Sheet.');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, sheetId, refreshAccessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReauth = async () => {
    try {
      setLoading(true);
      await refreshAccessToken();
    } catch {
      setError('Failed to re-authenticate. Please try again.');
      setLoading(false);
    }
  };

  const getContactName = (contactId) => {
    const contact = contacts.find((c) => c['Contact ID'] === contactId);
    if (!contact) return 'Unknown Contact';
    return (
      `${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim() || 'Unknown Contact'
    );
  };

  const handleAddTouchpoint = async () => {
    // Validation - Contact ID is now optional
    if (!touchpointFormData.Date) {
      setError('Please select a date');
      return;
    }

    if (!touchpointFormData.Notes || !touchpointFormData.Notes.trim()) {
      setError('Please enter some notes');
      return;
    }

    if (touchpointFormData['Follow-up Needed'] === 'Yes' && !touchpointFormData['Follow-up Date']) {
      setError('Please select a follow-up date');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await addTouchpoint(accessToken, sheetId, touchpointFormData, user.email, refreshAccessToken);

      // Reset form
      setTouchpointFormData({
        'Contact ID': '',
        Date: new Date().toISOString().split('T')[0],
        Type: 'Call',
        Notes: '',
        'Follow-up Needed': 'No',
        'Follow-up Date': '',
        Outcome: '',
        'Duration (min)': '',
      });

      // Close modal and refresh data
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setNeedsReauth(true);
        setError('Your session has expired. Please sign in again to continue.');
      } else {
        setError('Failed to add touchpoint. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setError('');
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setError('');
    // Reset form
    setTouchpointFormData({
      'Contact ID': '',
      Date: new Date().toISOString().split('T')[0],
      Type: 'Call',
      Notes: '',
      'Follow-up Needed': 'No',
      'Follow-up Date': '',
      Outcome: '',
      'Duration (min)': '',
    });
  };

  const handleOpenEditModal = (touchpoint) => {
    setEditingTouchpoint(touchpoint);
    setTouchpointFormData({
      'Contact ID': touchpoint['Contact ID'],
      Date: touchpoint.Date,
      Type: touchpoint.Type,
      Notes: touchpoint.Notes || '',
      'Follow-up Needed': touchpoint['Follow-up Needed'] || 'No',
      'Follow-up Date': touchpoint['Follow-up Date'] || '',
      Outcome: touchpoint.Outcome || '',
      'Duration (min)': touchpoint['Duration (min)'] || '',
    });
    setShowEditModal(true);
    setError('');
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTouchpoint(null);
    setError('');
  };

  const handleEditTouchpoint = async () => {
    if (!editingTouchpoint) return;

    // Validation
    if (!touchpointFormData.Date) {
      setError('Please select a date');
      return;
    }

    if (!touchpointFormData.Type) {
      setError('Please select a type');
      return;
    }

    if (touchpointFormData['Follow-up Needed'] === 'Yes' && !touchpointFormData['Follow-up Date']) {
      setError('Please select a follow-up date');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await updateTouchpoint(
        accessToken,
        sheetId,
        editingTouchpoint['Touchpoint ID'],
        editingTouchpoint,
        touchpointFormData,
        user.email
      );

      setShowEditModal(false);
      setEditingTouchpoint(null);
      await loadData();
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setNeedsReauth(true);
        setError('Your session has expired. Please sign in again to continue.');
      } else {
        setError('Failed to update touchpoint. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteConfirm = (touchpoint) => {
    setDeletingTouchpoint(touchpoint);
    setShowDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletingTouchpoint(null);
  };

  const handleDeleteTouchpoint = async () => {
    if (!deletingTouchpoint) return;

    try {
      setSaving(true);

      await deleteTouchpoint(accessToken, sheetId, deletingTouchpoint['Touchpoint ID']);

      setShowDeleteConfirm(false);
      setDeletingTouchpoint(null);
      await loadData();
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        setNeedsReauth(true);
        setError('Your session has expired. Please sign in again to continue.');
      } else {
        setError('Failed to delete touchpoint. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const sortedTouchpoints = [...touchpoints].sort((a, b) => {
    const dateA = new Date(a['Date'] || '');
    const dateB = new Date(b['Date'] || '');
    return dateB - dateA;
  });

  // Apply filters
  const filteredTouchpoints = useMemo(() => {
    let result = [...sortedTouchpoints];

    // Search filter (notes, contact name, type, outcome)
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          (t.Notes || '').toLowerCase().includes(searchLower) ||
          getContactName(t['Contact ID']).toLowerCase().includes(searchLower) ||
          (t.Type || '').toLowerCase().includes(searchLower) ||
          (t.Outcome || '').toLowerCase().includes(searchLower)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((t) => t.Type === typeFilter);
    }

    // Outcome filter
    if (outcomeFilter !== 'all') {
      result = result.filter((t) => t.Outcome === outcomeFilter);
    }

    // Date range filter
    if (dateRange.start) {
      result = result.filter((t) => new Date(t.Date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      result = result.filter((t) => new Date(t.Date) <= new Date(dateRange.end));
    }

    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedTouchpoints, searchQuery, typeFilter, outcomeFilter, dateRange]);

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setOutcomeFilter('all');
    setDateRange({ start: '', end: '' });
  };

  // Follow-up touchpoints
  const followUpTouchpoints = useMemo(() => {
    return touchpoints
      .filter((t) => t['Follow-up Needed'] === 'Yes')
      .sort((a, b) => {
        const dateA = new Date(a['Follow-up Date'] || a.Date);
        const dateB = new Date(b['Follow-up Date'] || b.Date);
        return dateA - dateB; // Soonest first
      });
  }, [touchpoints]);

  const getFollowUpUrgency = (followUpDate) => {
    if (!followUpDate) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(followUpDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    if (diffDays <= 3) return 'soon';
    return 'future';
  };

  const getUrgencyBadgeClass = (urgency) => {
    switch (urgency) {
      case 'overdue':
        return 'badge-priority-high';
      case 'today':
        return 'badge-priority-medium';
      case 'soon':
        return 'badge-status-active';
      default:
        return 'badge';
    }
  };

  const getUrgencyText = (urgency, followUpDate) => {
    if (!followUpDate) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(followUpDate);
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    switch (urgency) {
      case 'overdue': {
        const daysOverdue = Math.abs(diffDays);
        return `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}`;
      }
      case 'today':
        return 'Due Today';
      case 'soon':
        return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return <ListPageSkeleton count={6} />;
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
        <h3 className="empty-state-title">Error Loading Touchpoints</h3>
        <p>{error}</p>
        {needsReauth ? (
          <button className="btn btn-primary mt-md" onClick={handleReauth}>
            Sign In Again
          </button>
        ) : (
          <button className="btn btn-primary mt-md" onClick={loadData}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1>Touchpoints</h1>
          <p className="text-muted">History of all contact interactions</p>
        </div>
        {canWrite('touchpoints') && (
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            Add Touchpoint
          </button>
        )}
      </div>

      {/* Filter Bar */}
      {touchpoints.length > 0 && (
        <div className="card tl-filter-card">
          <div className="card-body">
            <div className="tl-filter-row">
              <div className="tl-filter-search">
                <label className="form-label tl-filter-label">
                  Search
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search notes, contacts, type, outcome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="tl-filter-col">
                <label className="form-label tl-filter-label">
                  Type
                </label>
                <select
                  className="form-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="Call">Call</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Text">Text</option>
                  <option value="Event">Event</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="tl-filter-col">
                <label className="form-label tl-filter-label">
                  Outcome
                </label>
                <select
                  className="form-select"
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value)}
                >
                  <option value="all">All Outcomes</option>
                  <option value="Successful">Successful</option>
                  <option value="No Answer">No Answer</option>
                  <option value="Left Message">Left Message</option>
                  <option value="Email Bounced">Email Bounced</option>
                  <option value="Wrong Number">Wrong Number</option>
                  <option value="Will Follow Up">Will Follow Up</option>
                  <option value="Not Interested">Not Interested</option>
                </select>
              </div>
              <div className="tl-filter-col">
                <label className="form-label tl-filter-label">
                  Start Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="tl-filter-col">
                <label className="form-label tl-filter-label">
                  End Date
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
              <div className="tl-filter-clear">
                <button
                  className="btn btn-secondary"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
            <p className="text-muted tl-filter-count">
              Showing {filteredTouchpoints.length} of {touchpoints.length} touchpoints
            </p>
          </div>
        </div>
      )}

      {/* Follow-Up Section */}
      {followUpTouchpoints.length > 0 && (
        <div className="card tl-section-card">
          <div className="card-header tl-section-header">
            <h3 className="tl-section-title">Needs Follow-Up</h3>
            <span className="badge badge-priority-high">{followUpTouchpoints.length}</span>
          </div>
          <div className="card-body">
            <div className="tl-item-list">
              {followUpTouchpoints.map((touchpoint) => {
                const urgency = getFollowUpUrgency(touchpoint['Follow-up Date']);
                const urgencyText = getUrgencyText(urgency, touchpoint['Follow-up Date']);

                return (
                  <div
                    key={touchpoint['Touchpoint ID']}
                    className="tl-item hoverable"
                    onClick={() => onNavigate('contact-profile', touchpoint['Contact ID'])}
                  >
                    <div className="tl-item-row">
                      <div className="tl-item-body">
                        <div className="tl-item-chips">
                          <span className="badge">{touchpoint.Type}</span>
                          <h4 className="tl-item-name">
                            {getContactName(touchpoint['Contact ID'])}
                          </h4>
                          {urgencyText && (
                            <span className={`badge ${getUrgencyBadgeClass(urgency)}`}>
                              {urgencyText}
                            </span>
                          )}
                        </div>
                        {touchpoint.Notes && (
                          <p className="tl-item-quote">
                            "{touchpoint.Notes}"
                          </p>
                        )}
                        <p className="text-muted tl-item-meta">
                          Follow-up due: {formatDate(touchpoint['Follow-up Date'])}
                          {touchpoint.Outcome && ` • Outcome: ${touchpoint.Outcome}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Touchpoints List */}
      {touchpoints.length === 0 ? (
        <div className="empty-state">
          <svg
            className="empty-state-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <h3 className="empty-state-title">No Touchpoints Yet</h3>
          <p>Log your first interaction with a contact to get started</p>
          {canWrite('touchpoints') && (
            <button className="btn btn-primary mt-md" onClick={handleOpenAddModal}>
              Add Touchpoint
            </button>
          )}
        </div>
      ) : filteredTouchpoints.length === 0 ? (
        <div className="empty-state">
          <svg
            className="empty-state-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <h3 className="empty-state-title">No Matching Touchpoints</h3>
          <p>Try adjusting your filters to see more results</p>
          <button className="btn btn-primary mt-md" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header tl-section-header">
            <h3 className="tl-section-title">All Touchpoints</h3>
            <span className="badge">{filteredTouchpoints.length}</span>
          </div>
          <div className="card-body">
            <div className="tl-item-list">
              {filteredTouchpoints.map((touchpoint) => (
                <div
                  key={touchpoint['Touchpoint ID']}
                  className="tl-item hoverable"
                  onClick={() => onNavigate('contact-profile', touchpoint['Contact ID'])}
                >
                  <div className="tl-item-top">
                    <div className="tl-item-body">
                      <h4 className="tl-item-name">
                        {getContactName(touchpoint['Contact ID'])}
                      </h4>
                      <div className="tl-item-sub">
                        {touchpoint['Type'] && (
                          <span className="badge badge-status-active tl-type-badge">
                            {touchpoint['Type']}
                          </span>
                        )}
                        {formatDate(touchpoint['Date'])}
                        {touchpoint['Outcome'] && ` • ${touchpoint['Outcome']}`}
                      </div>
                    </div>
                    <div className="tl-item-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(touchpoint);
                        }}
                        title="Edit touchpoint"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteConfirm(touchpoint);
                        }}
                        title="Delete touchpoint"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {touchpoint['Notes'] && (
                    <p className="tl-item-notes">
                      {touchpoint['Notes']}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Touchpoint Modal */}
      {showAddModal && (
        <AddTouchpointModal
          touchpointData={touchpointFormData}
          setTouchpointData={setTouchpointFormData}
          contacts={contacts}
          onClose={handleCloseAddModal}
          onSave={handleAddTouchpoint}
          saving={saving}
        />
      )}

      {/* Edit Touchpoint Modal */}
      {showEditModal && editingTouchpoint && (
        <EditTouchpointModal
          touchpointData={touchpointFormData}
          setTouchpointData={setTouchpointFormData}
          contactName={getContactName(editingTouchpoint['Contact ID'])}
          onClose={handleCloseEditModal}
          onSave={handleEditTouchpoint}
          saving={saving}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingTouchpoint && (
        <DeleteConfirmModal
          touchpoint={deletingTouchpoint}
          contactName={getContactName(deletingTouchpoint['Contact ID'])}
          onClose={handleCloseDeleteConfirm}
          onConfirm={handleDeleteTouchpoint}
          deleting={saving}
        />
      )}
    </div>
  );
}

function AddTouchpointModal({
  touchpointData,
  setTouchpointData,
  contacts,
  onClose,
  onSave,
  saving,
}) {
  return (
    <div className="tl-modal-overlay">
      <div className="card tl-modal-card">
        <div className="card-header">
          <h3>Add Touchpoint</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Contact</label>
            <ContactSelector
              contacts={contacts}
              value={touchpointData['Contact ID']}
              onChange={(contactId) =>
                setTouchpointData({ ...touchpointData, 'Contact ID': contactId })
              }
              placeholder="Search contacts... (optional)"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-input"
              value={touchpointData.Date}
              onChange={(e) => setTouchpointData({ ...touchpointData, Date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-select"
              value={touchpointData.Type}
              onChange={(e) => setTouchpointData({ ...touchpointData, Type: e.target.value })}
            >
              <option value="">Select type...</option>
              <option value="Call">Call</option>
              <option value="Text">Text</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Event">Event</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes *</label>
            <textarea
              className="form-textarea"
              value={touchpointData.Notes}
              onChange={(e) => setTouchpointData({ ...touchpointData, Notes: e.target.value })}
              placeholder="What happened?"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Outcome</label>
            <select
              className="form-select"
              value={touchpointData.Outcome}
              onChange={(e) => setTouchpointData({ ...touchpointData, Outcome: e.target.value })}
            >
              <option value="">Select outcome...</option>
              <option value="Successful">Successful</option>
              <option value="No Answer">No Answer</option>
              <option value="Left Message">Left Message</option>
              <option value="Email Bounced">Email Bounced</option>
              <option value="Wrong Number">Wrong Number</option>
              <option value="Will Follow Up">Will Follow Up</option>
              <option value="Not Interested">Not Interested</option>
            </select>
          </div>

          <div className="tl-form-row">
            <div className="form-group">
              <label className="form-label">Follow-up Needed</label>
              <select
                className="form-select"
                value={touchpointData['Follow-up Needed']}
                onChange={(e) =>
                  setTouchpointData({ ...touchpointData, 'Follow-up Needed': e.target.value })
                }
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Duration (min)</label>
              <input
                type="number"
                className="form-input"
                value={touchpointData['Duration (min)']}
                onChange={(e) =>
                  setTouchpointData({ ...touchpointData, 'Duration (min)': e.target.value })
                }
                placeholder="Minutes"
              />
            </div>
          </div>

          {touchpointData['Follow-up Needed'] === 'Yes' && (
            <div className="form-group">
              <label className="form-label">Follow-up Date *</label>
              <input
                type="date"
                className="form-input"
                value={touchpointData['Follow-up Date']}
                onChange={(e) =>
                  setTouchpointData({ ...touchpointData, 'Follow-up Date': e.target.value })
                }
              />
            </div>
          )}
        </div>
        <div className="card-footer tl-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Add Touchpoint'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTouchpointModal({
  touchpointData,
  setTouchpointData,
  contactName,
  onClose,
  onSave,
  saving,
}) {
  return (
    <div className="tl-modal-overlay">
      <div className="card tl-modal-card">
        <div className="card-header">
          <h3>Edit Touchpoint</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Contact</label>
            <input
              type="text"
              className="form-input tl-disabled-input"
              value={contactName}
              disabled
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <input
              type="date"
              className="form-input"
              value={touchpointData.Date}
              onChange={(e) => setTouchpointData({ ...touchpointData, Date: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type *</label>
            <select
              className="form-select"
              value={touchpointData.Type}
              onChange={(e) => setTouchpointData({ ...touchpointData, Type: e.target.value })}
            >
              <option value="Call">Call</option>
              <option value="Text">Text</option>
              <option value="Email">Email</option>
              <option value="Meeting">Meeting</option>
              <option value="Event">Event</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notes *</label>
            <textarea
              className="form-textarea"
              value={touchpointData.Notes}
              onChange={(e) => setTouchpointData({ ...touchpointData, Notes: e.target.value })}
              placeholder="What happened?"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Outcome</label>
            <select
              className="form-select"
              value={touchpointData.Outcome}
              onChange={(e) => setTouchpointData({ ...touchpointData, Outcome: e.target.value })}
            >
              <option value="">Select outcome...</option>
              <option value="Successful">Successful</option>
              <option value="No Answer">No Answer</option>
              <option value="Left Message">Left Message</option>
              <option value="Email Bounced">Email Bounced</option>
              <option value="Wrong Number">Wrong Number</option>
              <option value="Will Follow Up">Will Follow Up</option>
              <option value="Not Interested">Not Interested</option>
            </select>
          </div>

          <div className="tl-form-row">
            <div className="form-group">
              <label className="form-label">Follow-up Needed</label>
              <select
                className="form-select"
                value={touchpointData['Follow-up Needed']}
                onChange={(e) =>
                  setTouchpointData({ ...touchpointData, 'Follow-up Needed': e.target.value })
                }
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Duration (min)</label>
              <input
                type="number"
                className="form-input"
                value={touchpointData['Duration (min)']}
                onChange={(e) =>
                  setTouchpointData({ ...touchpointData, 'Duration (min)': e.target.value })
                }
                placeholder="Minutes"
              />
            </div>
          </div>

          {touchpointData['Follow-up Needed'] === 'Yes' && (
            <div className="form-group">
              <label className="form-label">Follow-up Date *</label>
              <input
                type="date"
                className="form-input"
                value={touchpointData['Follow-up Date']}
                onChange={(e) =>
                  setTouchpointData({ ...touchpointData, 'Follow-up Date': e.target.value })
                }
              />
            </div>
          )}
        </div>
        <div className="card-footer tl-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ touchpoint, contactName, onClose, onConfirm, deleting }) {
  return (
    <div className="tl-modal-overlay">
      <div className="card tl-modal-card tl-modal-card--sm">
        <div className="card-header">
          <h3>Delete Touchpoint</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="card-body">
          <p className="tl-delete-msg">
            Are you sure you want to delete this touchpoint with <strong>{contactName}</strong>?
          </p>
          <div className="tl-delete-preview">
            <div className="tl-delete-row">
              <strong>Type:</strong> {touchpoint.Type}
            </div>
            <div className="tl-delete-row">
              <strong>Date:</strong> {new Date(touchpoint.Date).toLocaleDateString()}
            </div>
            {touchpoint.Notes && (
              <div>
                <strong>Notes:</strong> {touchpoint.Notes}
              </div>
            )}
          </div>
          <p className="tl-delete-warning">
            This action cannot be undone.
          </p>
        </div>
        <div className="card-footer tl-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TouchpointsList;
