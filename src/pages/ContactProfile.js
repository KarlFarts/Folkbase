import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  readSheetData,
  readSheetMetadata,
  getContactTouchpoints,
  updateContact,
  addTouchpoint,
  updateTouchpoint,
  deleteTouchpoint,
  copyContactToWorkspace,
  logActivity,
  getContactActivities,
  getContactNotes,
  addNote,
  linkNoteToContact,
  getContactEmployment,
  SHEETS,
  ACTIVITY_TYPES,
} from '../utils/devModeWrapper';
import ConfirmDialog from '../components/ConfirmDialog';
import CopyContactModal from '../components/CopyContactModal';
import ContactWorkspaceBadges from '../components/ContactWorkspaceBadges';
import SyncConflictResolver from '../components/SyncConflictResolver';
import ListManager from '../components/ListManager';
import WindowTemplate from '../components/WindowTemplate';
import { TAB_CONFIG } from '../utils/fieldDefinitions';

// Imported components
import ProfileHeader from '../components/contact/ProfileHeader';
import ProfileTabs from '../components/contact/ProfileTabs';
import {
  LogTouchpointModal,
  EditTouchpointModal,
  TouchpointDetailModal,
} from '../components/contact/TouchpointModal';
import { TouchpointHistoryCard, NotesCard } from '../components/contact/ContactActivities';
import { useContactProfile } from '../hooks/useContactProfile';
import RelationshipManager from '../components/RelationshipManager';
import { ProfileSkeleton } from '../components/SkeletonLoader';
import EventCard from '../components/events/EventCard';
import SocialsManager from '../components/contact/SocialsManager';
import EducationManager from '../components/contact/EducationManager';
import EmploymentManager from '../components/contact/EmploymentManager';
import DistrictsManager from '../components/contact/DistrictsManager';

const CONTENT_TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'touchpoints', label: 'Touchpoints' },
  { value: 'notes', label: 'Notes' },
  { value: 'events', label: 'Events' },
  { value: 'organizations', label: 'Organizations' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'lists', label: 'Lists' },
  { value: 'socials', label: 'Socials' },
  { value: 'education', label: 'Education' },
  { value: 'employment', label: 'Employment' },
  { value: 'districts', label: 'Districts' },
];

function ContactProfile({ onNavigate }) {
  const { id: contactId } = useParams();
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { mode, userWorkspaces, activeWorkspace } = useWorkspace();
  const { notify } = useNotification();

  const { state, actions } = useContactProfile();

  const [contactEvents, setContactEvents] = React.useState([]);
  const [allContacts, setAllContacts] = React.useState([]);
  const [linkedOrganizations, setLinkedOrganizations] = React.useState([]);
  const [linkedTasks, setLinkedTasks] = React.useState([]);

  const detailsCardRef = useRef(null);

  useEffect(() => {
    if (detailsCardRef.current && !state.loading) {
      const updateHeight = () => {
        const detailsHeight = detailsCardRef.current.offsetHeight;
        actions.setTouchpointHeight(Math.max(300, detailsHeight));
      };
      updateHeight();
      window.addEventListener('resize', updateHeight);
      return () => window.removeEventListener('resize', updateHeight);
    }
  }, [state.activeTab, state.loading, actions]);

  const loadContact = React.useCallback(async () => {
    if (!accessToken || !contactId || !sheetId) {
      actions.setError('Required information is missing (token, contact ID, or Sheet ID).');
      actions.setLoading(false);
      return;
    }

    try {
      actions.setLoading(true);
      actions.setError('');

      const [
        contactsResult,
        touchpointsResult,
        metaResult,
        activitiesResult,
        notesResult,
        eventsResult,
        employmentResult,
        orgsResult,
        tasksResult,
      ] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.CONTACTS),
        getContactTouchpoints(accessToken, sheetId, contactId),
        readSheetMetadata(accessToken, sheetId, SHEETS.CONTACTS),
        getContactActivities(contactId),
        getContactNotes(accessToken, sheetId, contactId, user?.email),
        readSheetData(accessToken, sheetId, SHEETS.EVENTS),
        getContactEmployment(accessToken, sheetId, contactId),
        readSheetData(accessToken, sheetId, SHEETS.ORGANIZATIONS),
        readSheetData(accessToken, sheetId, SHEETS.TASKS),
      ]);

      const foundContact = contactsResult.data.find((c) => c['Contact ID'] === contactId);
      if (!foundContact) {
        actions.setError('Contact not found');
        return;
      }

      const filteredEvents = eventsResult.data.filter((event) => {
        const attendees = event['Attendees'] || '';
        return attendees.split(',').some((id) => id.trim() === contactId);
      });

      const orgIds = employmentResult.map((emp) => emp['Organization ID']).filter(Boolean);
      const linkedOrgs = orgsResult.data.filter((org) => orgIds.includes(org['Organization ID']));

      const filteredTasks = tasksResult.data.filter(
        (task) => task['Contact ID'] === contactId || task['Assigned To'] === contactId
      );

      actions.setContact(foundContact);
      actions.setTouchpoints(
        touchpointsResult.sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''))
      );
      actions.setActivities(activitiesResult);
      actions.setNotes(notesResult || []);
      actions.setMetadata(metaResult);
      setAllContacts(contactsResult.data);
      setContactEvents(
        filteredEvents.sort((a, b) => (b['Event Date'] || '').localeCompare(a['Event Date'] || ''))
      );
      setLinkedOrganizations(linkedOrgs);
      setLinkedTasks(
        filteredTasks.sort((a, b) => (b['Due Date'] || '').localeCompare(a['Due Date'] || ''))
      );
    } catch {
      actions.setError('Failed to load contact.');
    } finally {
      actions.setLoading(false);
    }
  }, [accessToken, contactId, sheetId, actions]);

  useEffect(() => {
    loadContact();
  }, [loadContact]);

  const handleSaveEdit = async () => {
    try {
      actions.setSaving(true);
      await updateContact(
        accessToken,
        sheetId,
        contactId,
        state.contact,
        state.editData,
        user.email
      );
      actions.setContact(state.editData);
      actions.setIsEditing(false);
    } catch {
      notify.error('Failed to save changes');
    } finally {
      actions.setSaving(false);
    }
  };

  const handleLogTouchpoint = async () => {
    try {
      actions.setSaving(true);
      const result = await addTouchpoint(
        accessToken,
        sheetId,
        {
          'Contact ID': contactId,
          'Contact Name': state.contact['Name'],
          ...state.touchpointData,
        },
        user.email
      );

      await logActivity(
        contactId,
        ACTIVITY_TYPES.TOUCHPOINT_LOGGED,
        `${state.touchpointData.Type}: ${state.touchpointData.Notes ? state.touchpointData.Notes.substring(0, 50) + (state.touchpointData.Notes.length > 50 ? '...' : '') : 'No notes'}`,
        {
          relatedId: result?.touchpointId || '',
          relatedType: 'touchpoint',
          touchpointType: state.touchpointData.Type,
          outcome: state.touchpointData.Outcome,
        }
      );

      const [newTouchpoints, newActivities] = await Promise.all([
        getContactTouchpoints(accessToken, sheetId, contactId),
        getContactActivities(contactId),
      ]);
      actions.setTouchpoints(
        newTouchpoints.sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''))
      );
      actions.setActivities(newActivities);

      actions.toggleLogModal(false);
      actions.resetTouchpointData();
      loadContact();
    } catch {
      notify.error('Failed to log touchpoint');
    } finally {
      actions.setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!state.noteFormData.Content.trim()) {
      notify.warning('Please enter note content');
      return;
    }

    try {
      actions.setSaving(true);
      const result = await addNote(accessToken, sheetId, {
        Content: state.noteFormData.Content,
        'Note Type': state.noteFormData['Note Type'],
        Status: state.noteFormData.Status,
      });

      if (result && result.noteId) {
        await linkNoteToContact(accessToken, sheetId, result.noteId, contactId);
      }

      await logActivity(
        contactId,
        ACTIVITY_TYPES.NOTE_ADDED,
        `Note added: ${state.noteFormData.Content.substring(0, 50)}${state.noteFormData.Content.length > 50 ? '...' : ''}`,
        {
          relatedId: result?.noteId || '',
          relatedType: 'note',
          noteType: state.noteFormData['Note Type'],
        }
      );

      const [newNotes, newActivities] = await Promise.all([
        getContactNotes(accessToken, sheetId, contactId, user?.email),
        getContactActivities(contactId),
      ]);
      actions.setNotes(newNotes || []);
      actions.setActivities(newActivities);

      actions.toggleNoteModal(false);
      actions.resetNoteFormData();
      notify.success('Note added successfully!');
    } catch {
      notify.error('Failed to add note');
    } finally {
      actions.setSaving(false);
    }
  };

  const handleOpenEdit = (touchpoint) => {
    actions.setEditingTouchpoint(touchpoint);
    actions.setEditFormData({
      Date: touchpoint.Date || '',
      Type: touchpoint.Type || 'Call',
      Notes: touchpoint.Notes || '',
      'Follow-up Needed': touchpoint['Follow-up Needed'] || 'No',
      'Follow-up Date': touchpoint['Follow-up Date'] || '',
      Outcome: touchpoint.Outcome || '',
      'Duration (min)': touchpoint['Duration (min)'] || '',
    });
    actions.toggleEditModal(true);
    actions.setSelectedTouchpoint(null);
  };

  const handleEditTouchpoint = async () => {
    if (!state.editFormData.Date || !state.editFormData.Type) {
      notify.warning('Date and Type are required');
      return;
    }

    if (state.editFormData['Follow-up Needed'] === 'Yes' && !state.editFormData['Follow-up Date']) {
      notify.warning('Follow-up date is required when follow-up is needed');
      return;
    }

    try {
      actions.setSaving(true);

      await updateTouchpoint(
        accessToken,
        sheetId,
        state.editingTouchpoint['Touchpoint ID'],
        state.editingTouchpoint,
        state.editFormData,
        user.email
      );

      const [newTouchpoints] = await Promise.all([
        getContactTouchpoints(accessToken, sheetId, contactId),
        loadContact(),
      ]);

      actions.setTouchpoints(
        newTouchpoints.sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''))
      );

      await logActivity(
        contactId,
        ACTIVITY_TYPES.CONTACT_UPDATED,
        `Updated touchpoint: ${state.editFormData.Type}`,
        {
          relatedId: state.editingTouchpoint['Touchpoint ID'],
          relatedType: 'touchpoint',
          touchpointType: state.editFormData.Type,
          outcome: state.editFormData.Outcome,
        }
      );

      actions.toggleEditModal(false);
      actions.setEditingTouchpoint(null);
      actions.setEditFormData({
        Date: '',
        Type: 'Call',
        Notes: '',
        'Follow-up Needed': 'No',
        'Follow-up Date': '',
        Outcome: '',
        'Duration (min)': '',
      });
    } catch {
      notify.error('Failed to update touchpoint. Please try again.');
    } finally {
      actions.setSaving(false);
    }
  };

  const [touchpointToDelete, setTouchpointToDelete] = React.useState(null);
  const [showDeleteContactConfirm, setShowDeleteContactConfirm] = React.useState(false);

  const handleDeleteTouchpoint = async () => {
    if (!touchpointToDelete) return;
    try {
      actions.setSaving(true);
      await deleteTouchpoint(accessToken, sheetId, touchpointToDelete['Touchpoint ID']);

      const newTouchpoints = await getContactTouchpoints(accessToken, sheetId, contactId);
      actions.setTouchpoints(
        newTouchpoints.sort((a, b) => (b['Date'] || '').localeCompare(a['Date'] || ''))
      );

      actions.setSelectedTouchpoint(null);
      setTouchpointToDelete(null);
      notify.success('Touchpoint deleted successfully!');
    } catch {
      notify.error('Failed to delete touchpoint. Please try again.');
    } finally {
      actions.setSaving(false);
    }
  };

  const handleDeleteContact = async () => {
    try {
      actions.setSaving(true);
      await updateContact(
        accessToken,
        sheetId,
        contactId,
        state.contact,
        {
          ...state.contact,
          Status: 'Inactive',
          Notes: `[DELETED by ${user.email} on ${new Date().toISOString().split('T')[0]}] ${state.contact.Notes || ''}`,
        },
        user.email
      );
      notify.success('Contact deleted (set to Inactive)');
      onNavigate('contacts');
    } catch {
      notify.error('Failed to delete contact. Please try again.');
    } finally {
      actions.setSaving(false);
      setShowDeleteContactConfirm(false);
    }
  };

  const handleCopyContact = async (workspaceId, linkConfig = null) => {
    try {
      actions.setSaving(true);
      const targetWorkspace = userWorkspaces.find((c) => c.id === workspaceId);
      if (!targetWorkspace || !targetWorkspace.sheet_id) {
        throw new Error('Workspace sheet ID not found');
      }

      const result = await copyContactToWorkspace(
        accessToken,
        sheetId,
        contactId,
        targetWorkspace.sheet_id,
        user.email,
        linkConfig
      );

      if (linkConfig && result && result.contactId && linkConfig.targetWorkspace) {
        linkConfig.targetWorkspace.contactId = result.contactId;
      }

      await logActivity(
        contactId,
        ACTIVITY_TYPES.ADDED_TO_WORKSPACE,
        `Added to workspace: ${targetWorkspace.name}`,
        {
          relatedId: workspaceId,
          relatedType: 'workspace',
          workspaceName: targetWorkspace.name,
        }
      );

      const newActivities = await getContactActivities(contactId);
      actions.setActivities(newActivities);

      notify.success(`Contact "${state.contact.Name}" copied to ${targetWorkspace.name}`);
      actions.toggleCopyModal(false);
    } catch {
      notify.error('Failed to copy contact. Please try again.');
    } finally {
      actions.setSaving(false);
    }
  };

  const getPriorityClass = (priority) => {
    const lower = (priority || '').toLowerCase();
    if (lower === 'urgent') return 'badge-priority-urgent';
    if (lower === 'high') return 'badge-priority-high';
    if (lower === 'medium') return 'badge-priority-medium';
    if (lower === 'low') return 'badge-priority-low';
    return 'badge-priority-none';
  };

  const getStatusClass = (status) => {
    const lower = (status || '').toLowerCase();
    if (lower === 'active') return 'badge-status-active';
    if (lower === 'inactive') return 'badge-status-inactive';
    if (lower === 'do not contact') return 'badge-status-dnc';
    return 'badge-status-inactive';
  };

  if (state.loading) {
    return <ProfileSkeleton />;
  }

  if (state.error || !state.contact) {
    return (
      <div className="empty-state">
        <h3 className="empty-state-title">{state.error || 'Contact not found'}</h3>
        <button className="btn btn-primary mt-md" onClick={() => onNavigate('contacts')}>
          Back to Contacts
        </button>
      </div>
    );
  }

  return (
    <div className="cp-page">
      {/* Back button */}
      <button className="btn btn-ghost btn-sm cp-back-btn" onClick={() => onNavigate('contacts')}>
        ← Back to Contacts
      </button>

      {/* Header card: ProfileHeader + action buttons */}
      <div className="card cp-header-card">
        <div className="cp-header-inner">
          <div className="cp-header-identity">
            <ProfileHeader
              contact={state.contact}
              isEditing={state.isEditing}
              editData={state.editData}
              onChange={actions.setEditData}
              getPriorityClass={getPriorityClass}
              getStatusClass={getStatusClass}
            />
          </div>

          <div className="cp-header-actions">
            <button className="btn btn-primary cp-action-btn" onClick={() => actions.toggleLogModal(true)}>
              Log Touchpoint
            </button>
            <button className="btn btn-secondary cp-action-btn" onClick={() => actions.toggleNoteModal(true)}>
              Write Note
            </button>
            <button className="btn btn-secondary cp-action-btn" onClick={() => actions.toggleCollectionsModal(true)}>
              Lists
            </button>
            <button
              className="btn btn-secondary cp-action-btn"
              onClick={() => {
                if (state.isEditing) {
                  actions.cancelEdit();
                } else {
                  actions.setIsEditing(true);
                }
              }}
            >
              {state.isEditing ? 'Cancel Edit' : 'Edit Contact'}
            </button>
            {state.isEditing && (
              <button
                className="btn btn-primary cp-action-btn"
                onClick={handleSaveEdit}
                disabled={state.saving}
              >
                {state.saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            <button
              className="btn btn-ghost cp-action-btn cp-action-btn--danger"
              onClick={() => setShowDeleteContactConfirm(true)}
            >
              Delete
            </button>
          </div>
        </div>

        <ContactWorkspaceBadges
          workspaceType={mode === 'personal' ? 'personal' : 'workspace'}
          workspaceId={mode === 'personal' ? user.email : activeWorkspace?.id}
          contactId={contactId}
          onWorkspaceChange={loadContact}
          onConflictClick={(linkId) => {
            actions.setSelectedLinkId(linkId);
            actions.toggleConflictModal(true);
          }}
        />
      </div>

      {/* Horizontal tab bar */}
      <div className="cp-tab-bar">
        {CONTENT_TABS.map((tab) => (
          <button
            key={tab.value}
            className={`cp-tab${state.contentView === tab.value ? ' cp-tab--active' : ''}`}
            onClick={() => actions.setContentView(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div ref={detailsCardRef} className="card cp-content-card">
        {state.contentView === 'profile' && (
          <>
            {/* Profile sub-nav (field category sidebar) */}
            <div className="cp-profile-layout">
              <div className="cp-profile-sidebar">
                {TAB_CONFIG.map((tab) => (
                  <button
                    key={tab.id}
                    className={`cp-sidebar-item${state.activeTab === tab.id ? ' cp-sidebar-item--active' : ''}`}
                    onClick={() => actions.setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="cp-profile-content card-body">
                <ProfileTabs
                  activeTab={state.activeTab}
                  contact={state.contact}
                  isEditing={state.isEditing}
                  editData={state.editData}
                  onChange={actions.setEditData}
                />
              </div>
            </div>
          </>
        )}

        {state.contentView === 'touchpoints' && (
          <div className="card-body">
            <TouchpointHistoryCard
              touchpoints={state.touchpoints}
              onLogTouchpoint={() => actions.toggleLogModal(true)}
              onTouchpointClick={actions.setSelectedTouchpoint}
              maxHeight="600px"
            />
          </div>
        )}

        {state.contentView === 'events' && (
          <div className="card-body">
            {contactEvents.length === 0 ? (
              <div className="cp-empty-state">
                <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <h3 className="cp-empty-title">No Events Yet</h3>
                <p>This contact hasn&apos;t been added to any events yet.</p>
              </div>
            ) : (
              <div className="cp-card-grid">
                {contactEvents.map((event) => (
                  <EventCard
                    key={event['Event ID']}
                    event={event}
                    contacts={allContacts}
                    onClick={() => onNavigate('event-details', { id: event['Event ID'] })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {state.contentView === 'organizations' && (
          <div className="card-body">
            {linkedOrganizations.length === 0 ? (
              <div className="cp-empty-state">
                <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 21h18M3 7v1a3 3 0 0 0 3 3h1m0-4v4m0-4h6m-6 4h6m6-4v1a3 3 0 0 1-3 3h-1m0-4v4m0 0H9m12-4h-6M3 10v11m18-11v11M9 21v-8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v8" />
                </svg>
                <h3 className="cp-empty-title">No Organizations</h3>
                <p>This contact has no employment history. Add employment to see linked organizations.</p>
              </div>
            ) : (
              <div className="cp-card-grid">
                {linkedOrganizations.map((org) => (
                  <div
                    key={org['Organization ID']}
                    className="card cp-linked-card"
                    onClick={() => onNavigate('organization-profile', org['Organization ID'])}
                  >
                    <div className="cp-linked-card-inner">
                      <div>
                        <strong>{org['Display Name'] || org.Name}</strong>
                        <div className="cp-linked-card-meta">
                          {org.Type && <span>{org.Type}</span>}
                          {org.Type && org.Industry && <span> · </span>}
                          {org.Industry && <span>{org.Industry}</span>}
                        </div>
                      </div>
                      <span className="badge badge-status-inactive cp-linked-card-id">
                        {org['Organization ID']}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {state.contentView === 'tasks' && (
          <div className="card-body">
            {linkedTasks.length === 0 ? (
              <div className="cp-empty-state">
                <svg className="cp-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M9 11h6M9 15h3" />
                </svg>
                <h3 className="cp-empty-title">No Tasks</h3>
                <p>This contact has no assigned tasks.</p>
              </div>
            ) : (
              <div className="cp-card-grid">
                {linkedTasks.map((task) => (
                  <div
                    key={task['Task ID']}
                    className="card cp-linked-card"
                    onClick={() => onNavigate('task-profile', task['Task ID'])}
                  >
                    <div className="cp-linked-card-inner">
                      <div>
                        <strong>{task.Title}</strong>
                        <div className="cp-linked-card-meta">
                          {task.Status && (
                            <span className="badge badge-status-inactive cp-task-status-badge">
                              {task.Status}
                            </span>
                          )}
                          {task['Due Date'] && <span>Due: {task['Due Date']}</span>}
                        </div>
                      </div>
                      <span className="badge badge-status-inactive cp-linked-card-id">
                        {task['Task ID']}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {state.contentView === 'socials' && (
          <div className="card-body">
            <SocialsManager contactId={contactId} />
          </div>
        )}

        {state.contentView === 'education' && (
          <div className="card-body">
            <EducationManager contactId={contactId} />
          </div>
        )}

        {state.contentView === 'employment' && (
          <div className="card-body">
            <EmploymentManager contactId={contactId} />
          </div>
        )}

        {state.contentView === 'districts' && (
          <div className="card-body">
            <DistrictsManager contactId={contactId} />
          </div>
        )}

        {state.contentView === 'lists' && (
          <div className="card-body">
            <ListManager
              contactId={contactId}
              onClose={() => {}}
              accessToken={accessToken}
              sheetId={sheetId}
              embedded={true}
            />
          </div>
        )}

        {state.contentView === 'notes' && (
          <div className="card-body">
            <NotesCard notes={state.notes} contactId={contactId} onNavigate={onNavigate} />
          </div>
        )}

        {state.contentView === 'relationships' && (
          <div className="card-body">
            <RelationshipManager
              entityType="Contact"
              entityId={contactId}
              accessToken={accessToken}
              sheetId={sheetId}
              userEmail={user?.email}
              isMultiEntity={true}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {state.selectedTouchpoint && (
        <TouchpointDetailModal
          touchpoint={state.selectedTouchpoint}
          onClose={() => actions.setSelectedTouchpoint(null)}
          onEdit={handleOpenEdit}
          onDelete={(tp) => setTouchpointToDelete(tp)}
        />
      )}

      <ConfirmDialog
        isOpen={!!touchpointToDelete}
        onConfirm={handleDeleteTouchpoint}
        onCancel={() => setTouchpointToDelete(null)}
        title="Delete Touchpoint"
        message={`Are you sure you want to delete this ${touchpointToDelete?.Type || ''} touchpoint from ${touchpointToDelete?.Date || ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {state.showLogModal && (
        <LogTouchpointModal
          touchpointData={state.touchpointData}
          setTouchpointData={actions.setTouchpointData}
          onClose={() => actions.toggleLogModal(false)}
          onSave={handleLogTouchpoint}
          saving={state.saving}
        />
      )}

      {state.showEditModal && state.editingTouchpoint && (
        <EditTouchpointModal
          touchpoint={state.editingTouchpoint}
          formData={state.editFormData}
          setFormData={actions.setEditFormData}
          onClose={() => {
            actions.toggleEditModal(false);
            actions.setEditingTouchpoint(null);
          }}
          onSave={handleEditTouchpoint}
          saving={state.saving}
        />
      )}

      <CopyContactModal
        isOpen={state.showCopyModal}
        onClose={() => actions.toggleCopyModal(false)}
        contact={state.contact}
        workspaces={userWorkspaces}
        onCopy={handleCopyContact}
      />

      <SyncConflictResolver
        linkId={state.selectedLinkId}
        sheetId={sheetId}
        isOpen={state.showConflictModal}
        onClose={() => {
          actions.toggleConflictModal(false);
          actions.setSelectedLinkId(null);
        }}
        onResolved={loadContact}
      />

      {state.showCollectionsModal && (
        <WindowTemplate
          isOpen={state.showCollectionsModal}
          onClose={() => actions.toggleCollectionsModal(false)}
          title="Manage Lists"
          size="md"
        >
          <ListManager
            contactId={contactId}
            onClose={() => actions.toggleCollectionsModal(false)}
            accessToken={accessToken}
            sheetId={sheetId}
          />
        </WindowTemplate>
      )}

      <ConfirmDialog
        isOpen={showDeleteContactConfirm}
        onConfirm={handleDeleteContact}
        onCancel={() => setShowDeleteContactConfirm(false)}
        title="Delete Contact"
        message={`Are you sure you want to delete "${state.contact?.Name}"? The contact will be marked as Inactive and can be restored later.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {state.showNoteModal && (
        <WindowTemplate
          isOpen={state.showNoteModal}
          onClose={() => actions.toggleNoteModal(false)}
          title={`Write Note for ${state.contact?.Name}`}
          size="md"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => actions.toggleNoteModal(false)}
                disabled={state.saving}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddNote}
                disabled={state.saving || !state.noteFormData.Content.trim()}
              >
                {state.saving ? 'Saving...' : 'Save Note'}
              </button>
            </>
          }
        >
          <div className="cp-note-form">
            <div>
              <label className="form-label">Note Type</label>
              <select
                className="form-input"
                value={state.noteFormData['Note Type']}
                onChange={(e) =>
                  actions.setNoteFormData({ ...state.noteFormData, 'Note Type': e.target.value })
                }
              >
                <option value="General">General</option>
                <option value="Meeting Note">Meeting Note</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Idea">Idea</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Event Note">Event Note</option>
                <option value="Research">Research</option>
                <option value="Action Item">Action Item</option>
              </select>
            </div>

            <div>
              <label className="form-label">Content</label>
              <textarea
                className="form-input cp-note-textarea"
                value={state.noteFormData.Content}
                onChange={(e) =>
                  actions.setNoteFormData({ ...state.noteFormData, Content: e.target.value })
                }
                placeholder="Enter your note..."
                rows="8"
              />
            </div>

            <div>
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={state.noteFormData.Status}
                onChange={(e) =>
                  actions.setNoteFormData({ ...state.noteFormData, Status: e.target.value })
                }
              >
                <option value="Unprocessed">Unprocessed</option>
                <option value="Processed">Processed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
        </WindowTemplate>
      )}
    </div>
  );
}

export default ContactProfile;
