import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNotification } from '../contexts/NotificationContext';
import { usePermissions } from '../hooks/usePermissions';
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
  getMomentsForContact,
  addMoment,
  updateMoment,
  deleteMoment,
  SHEETS,
  ACTIVITY_TYPES,
} from '../utils/devModeWrapper';
import ConfirmDialog from '../components/ConfirmDialog';
import CopyContactModal from '../components/CopyContactModal';
import ContactWorkspaceBadges from '../components/ContactWorkspaceBadges';
import SyncConflictResolver from '../components/SyncConflictResolver';
import ListManager from '../components/ListManager';
import WindowTemplate from '../components/WindowTemplate';
import { FIELD_GROUPS, getFieldsByGroup } from '../utils/fieldDefinitions';

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
import ContactMethodsManager from '../components/contact/ContactMethodsManager';
import ContactAttributesManager from '../components/contact/ContactAttributesManager';
import CollapsibleSection from '../components/contact/CollapsibleSection';
import MomentsTab from '../components/contact/MomentsTab';
import MomentModal from '../components/contact/MomentModal';

const CONTENT_TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'touchpoints', label: 'Touchpoints' },
  { value: 'notes', label: 'Notes' },
  { value: 'events', label: 'Events' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'moments', label: 'Moments' },
];

const EMPTY_MOMENT = {
  Title: '',
  Type: 'Vacation',
  'Start Date': '',
  'End Date': '',
  Location: '',
  Notes: '',
  'Contact IDs': '',
};

function ContactProfile({ onNavigate }) {
  const { id: contactId } = useParams();
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { mode, userWorkspaces, activeWorkspace } = useWorkspace();
  const { notify } = useNotification();
  const { canWrite } = usePermissions();

  const { state, actions } = useContactProfile();

  const [contactEvents, setContactEvents] = React.useState([]);
  const [allContacts, setAllContacts] = React.useState([]);
  const [linkedOrganizations, setLinkedOrganizations] = React.useState([]);
  const [linkedTasks, setLinkedTasks] = React.useState([]);
  const [showNoteExtended, setShowNoteExtended] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');

  const [moments, setMoments] = useState([]);
  const [showMomentModal, setShowMomentModal] = useState(false);
  const [editingMoment, setEditingMoment] = useState(null);
  const [momentData, setMomentData] = useState({ ...EMPTY_MOMENT });
  const [savingMoment, setSavingMoment] = useState(false);
  const [showDeleteMomentConfirm, setShowDeleteMomentConfirm] = useState(false);
  const [momentToDelete, setMomentToDelete] = useState(null);

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
        momentsResult,
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
        getMomentsForContact(accessToken, sheetId, contactId),
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
      setMoments(momentsResult || []);
    } catch (err) {
      console.error('Failed to load contact:', err);
      if (err.response?.status === 401 || err.response?.status === 403 || err.isAuthError) {
        actions.setError('Session expired. Use the reconnect banner to sign in again.');
      } else {
        actions.setError('Failed to load contact.');
      }
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
      // Only send fields the user actually changed
      const changedData = {};
      for (const key of state.dirtyFields) {
        changedData[key] = state.editData[key];
      }
      // If nothing changed, just exit edit mode
      if (Object.keys(changedData).length === 0) {
        actions.setIsEditing(false);
        return;
      }
      await updateContact(
        accessToken,
        sheetId,
        contactId,
        state.contact,
        changedData,
        user.email
      );
      // Merge changes back into contact state
      actions.setContact({ ...state.contact, ...changedData });
      actions.setIsEditing(false);
      actions.clearDirtyFields();
    } catch (err) {
      console.error('Save failed:', err);
      notify.error('Failed to save changes. Please try again.');
    } finally {
      actions.setSaving(false);
    }
  };

  const handleOpenAddMoment = () => {
    setEditingMoment(null);
    setMomentData({ ...EMPTY_MOMENT, 'Contact IDs': contactId });
    setShowMomentModal(true);
  };

  const handleOpenEditMoment = (moment) => {
    setEditingMoment(moment);
    setMomentData({
      Title: moment.Title || '',
      Type: moment.Type || 'Vacation',
      'Start Date': moment['Start Date'] || '',
      'End Date': moment['End Date'] || '',
      Location: moment.Location || '',
      Notes: moment.Notes || '',
      'Contact IDs': moment['Contact IDs'] || '',
    });
    setShowMomentModal(true);
  };

  const handleSaveMoment = async () => {
    if (!momentData.Title?.trim()) {
      notify.warning('Title is required');
      return;
    }
    try {
      setSavingMoment(true);
      if (editingMoment) {
        await updateMoment(accessToken, sheetId, editingMoment['Moment ID'], momentData);
        setMoments((prev) =>
          prev.map((m) =>
            m['Moment ID'] === editingMoment['Moment ID']
              ? { ...m, ...momentData }
              : m
          )
        );
        notify.success('Moment updated!');
      } else {
        const result = await addMoment(accessToken, sheetId, momentData);
        if (result && (result.momentId || result['Moment ID'])) {
          setMoments((prev) => [
            ...prev,
            { ...momentData, 'Moment ID': result['Moment ID'] || result.momentId, 'Created At': result['Created At'] },
          ]);
        }
        notify.success('Moment added!');
      }
      setShowMomentModal(false);
      setEditingMoment(null);
    } catch (err) {
      console.error('Failed to save moment:', err);
      notify.error('Failed to save moment. Please try again.');
    } finally {
      setSavingMoment(false);
    }
  };

  const handleDeleteMoment = (momentId) => {
    setMomentToDelete(momentId);
    setShowDeleteMomentConfirm(true);
  };

  const handleConfirmDeleteMoment = async () => {
    if (!momentToDelete) return;
    try {
      setSavingMoment(true);
      await deleteMoment(accessToken, sheetId, momentToDelete);
      setMoments((prev) => prev.filter((m) => m['Moment ID'] !== momentToDelete));
      notify.success('Moment deleted!');
    } catch (err) {
      console.error('Failed to delete moment:', err);
      notify.error('Failed to delete moment. Please try again.');
    } finally {
      setSavingMoment(false);
      setShowDeleteMomentConfirm(false);
      setMomentToDelete(null);
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

      actions.toggleLogModal(false);
      actions.resetTouchpointData();
      await loadContact();
    } catch (err) {
      console.error('Failed to log touchpoint:', err);
      notify.error('Failed to log touchpoint. Please try again.');
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
      const result = await addNote(
        accessToken,
        sheetId,
        {
          Content: state.noteFormData.Content,
          'Note Type': state.noteFormData['Note Type'],
          Status: state.noteFormData.Status,
          Tags: state.noteFormData.Tags || '',
          Visibility: state.noteFormData.Visibility || 'Private',
        },
        user?.email
      );

      if (result && result.noteId) {
        await linkNoteToContact(accessToken, sheetId, result.noteId, contactId);
      } else {
        console.error('addNote did not return a noteId:', result);
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
      setShowNoteExtended(false);
      notify.success('Note added successfully!');
    } catch (err) {
      console.error('Failed to add note:', err);
      notify.error('Failed to add note. Please try again.');
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
    } catch (err) {
      console.error('Failed to update touchpoint:', err);
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
    } catch (err) {
      console.error('Failed to delete touchpoint:', err);
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
    } catch (err) {
      console.error('Failed to delete contact:', err);
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
    } catch (err) {
      console.error('Failed to copy contact:', err);
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
              onChange={(newEditData, changedKey) => {
                actions.setEditData(newEditData);
                if (changedKey) actions.markFieldDirty(changedKey);
              }}
              getPriorityClass={getPriorityClass}
              getStatusClass={getStatusClass}
            />
          </div>

          <div className="cp-header-actions">
            {canWrite('touchpoints') && (
              <button className="btn btn-primary cp-action-btn" onClick={() => actions.toggleLogModal(true)}>
                Log Touchpoint
              </button>
            )}
            {canWrite('notes') && (
              <button className="btn btn-secondary cp-action-btn" onClick={() => actions.toggleNoteModal(true)}>
                Write Note
              </button>
            )}
            <button className="btn btn-secondary cp-action-btn" onClick={() => actions.toggleCollectionsModal(true)}>
              Lists
            </button>
            {canWrite('contacts') && (
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
            )}
            {state.isEditing && canWrite('contacts') && (
              <button
                className="btn btn-primary cp-action-btn"
                onClick={handleSaveEdit}
                disabled={state.saving}
              >
                {state.saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            {canWrite('contacts') && (
              <button
                className="btn btn-ghost cp-action-btn cp-action-btn--danger"
                onClick={() => setShowDeleteContactConfirm(true)}
              >
                Delete
              </button>
            )}
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
          <div className="cp-profile-collapsible card-body">
            {/* Helper to render a group's fields inside a CollapsibleSection */}
            {[
              { title: 'Contact Info', group: FIELD_GROUPS.CONTACT },
              { title: 'Names', group: FIELD_GROUPS.NAMES },
              { title: 'Professional', group: FIELD_GROUPS.PROFESSIONAL },
              { title: 'Online Presence', group: FIELD_GROUPS.ONLINE },
              { title: 'Mailing', group: FIELD_GROUPS.MAILING },
              { title: 'Relationships', group: FIELD_GROUPS.RELATIONSHIPS },
              { title: 'Assets & Media', group: FIELD_GROUPS.ASSETS },
            ].map(({ title, group }) => {
              // Determine if section has any populated data
              const sectionFields = getFieldsByGroup(group);
              const hasData = sectionFields.some((f) => {
                const val = state.contact[f.key];
                return val !== undefined && val !== null && val !== '';
              });
              return (
                <CollapsibleSection
                  key={group}
                  title={title}
                  defaultOpen={hasData || state.isEditing}
                  isEmpty={!hasData && !state.isEditing}
                >
                  <ProfileTabs
                    group={group}
                    contact={state.contact}
                    isEditing={state.isEditing}
                    editData={state.editData}
                    onChange={(newEditData, changedKey) => {
                      actions.setEditData(newEditData);
                      if (changedKey) actions.markFieldDirty(changedKey);
                    }}
                  />
                </CollapsibleSection>
              );
            })}

            {/* More fields divider — always-collapsed demographic sections */}
            <div className="cs-divider">More fields</div>

            {[
              { title: 'Demographics', group: FIELD_GROUPS.DEMOGRAPHICS },
              { title: 'Contact Preferences', group: FIELD_GROUPS.CONTACT_PREFS },
              { title: 'Community', group: FIELD_GROUPS.COMMUNITY },
              { title: 'Donor', group: FIELD_GROUPS.DONOR },
              { title: 'Privacy', group: FIELD_GROUPS.PRIVACY },
            ].map(({ title, group }) => (
              <CollapsibleSection
                key={group}
                title={title}
                defaultOpen={false}
              >
                <ProfileTabs
                  group={group}
                  contact={state.contact}
                  isEditing={state.isEditing}
                  editData={state.editData}
                  onChange={(newEditData, changedKey) => {
                    actions.setEditData(newEditData);
                    if (changedKey) actions.markFieldDirty(changedKey);
                  }}
                />
              </CollapsibleSection>
            ))}

            {/* Manager sections */}
            <CollapsibleSection title="Organizations" defaultOpen={linkedOrganizations.length > 0}>
              {linkedOrganizations.length === 0 ? (
                <p className="text-muted">No organizations linked via employment.</p>
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
            </CollapsibleSection>

            <CollapsibleSection title="Employment" defaultOpen={false}>
              <EmploymentManager contactId={contactId} readOnly={!canWrite('contacts')} />
            </CollapsibleSection>

            <CollapsibleSection title="Education" defaultOpen={false}>
              <EducationManager contactId={contactId} readOnly={!canWrite('contacts')} />
            </CollapsibleSection>

            <CollapsibleSection title="Social Profiles" defaultOpen={false}>
              <SocialsManager contactId={contactId} readOnly={!canWrite('contacts')} />
            </CollapsibleSection>

            <CollapsibleSection title="Lists" defaultOpen={false}>
              <ListManager
                contactId={contactId}
                onClose={() => {}}
                accessToken={accessToken}
                sheetId={sheetId}
                embedded={true}
                readOnly={!canWrite('contacts')}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Contact Methods" defaultOpen={false}>
              <ContactMethodsManager contactId={contactId} readOnly={!canWrite('contacts')} />
            </CollapsibleSection>

            <CollapsibleSection title="Attributes" defaultOpen={false}>
              <ContactAttributesManager contactId={contactId} readOnly={!canWrite('contacts')} />
            </CollapsibleSection>

            <CollapsibleSection title="Districts" defaultOpen={false}>
              <DistrictsManager contactId={contactId} readOnly={!canWrite('contacts')} />
            </CollapsibleSection>
          </div>
        )}

        {state.contentView === 'touchpoints' && (
          <div className="card-body">
            <TouchpointHistoryCard
              touchpoints={state.touchpoints}
              onLogTouchpoint={() => actions.toggleLogModal(true)}
              onTouchpointClick={actions.setSelectedTouchpoint}
              maxHeight="600px"
              canLog={canWrite('touchpoints')}
            />
          </div>
        )}

        {state.contentView === 'notes' && (
          <div className="card-body">
            {state.notes.length > 0 && (
              <div className="cp-notes-search-wrap">
                <input
                  type="text"
                  className="form-input cp-notes-search-input"
                  placeholder="Search notes..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                />
              </div>
            )}
            <NotesCard
              notes={
                noteSearch
                  ? state.notes.filter((n) =>
                      (n.Content || '').toLowerCase().includes(noteSearch.toLowerCase()) ||
                      (n['Note Type'] || '').toLowerCase().includes(noteSearch.toLowerCase()) ||
                      (n.Tags || '').toLowerCase().includes(noteSearch.toLowerCase())
                    )
                  : state.notes
              }
              contactId={contactId}
              onAddNote={() => actions.toggleNoteModal(true)}
              onNavigate={onNavigate}
              canEdit={canWrite('notes')}
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
                    onClick={() => onNavigate('event-details', event['Event ID'])}
                  />
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

        {state.contentView === 'relationships' && (
          <div className="card-body">
            <RelationshipManager
              entityType="Contact"
              entityId={contactId}
              accessToken={accessToken}
              sheetId={sheetId}
              userEmail={user?.email}
              isMultiEntity={true}
              readOnly={!canWrite('contacts')}
            />
          </div>
        )}

        {state.contentView === 'moments' && (
          <MomentsTab
            moments={moments}
            allContacts={allContacts}
            currentContactId={contactId}
            canWrite={canWrite('contacts')}
            onAdd={handleOpenAddMoment}
            onEdit={handleOpenEditMoment}
            onDelete={handleDeleteMoment}
          />
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

      {showMomentModal && (
        <MomentModal
          isOpen={showMomentModal}
          onClose={() => {
            setShowMomentModal(false);
            setEditingMoment(null);
          }}
          onSave={handleSaveMoment}
          saving={savingMoment}
          momentId={editingMoment?.['Moment ID'] || null}
          momentData={momentData}
          setMomentData={setMomentData}
          allContacts={allContacts}
          currentContactId={contactId}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteMomentConfirm}
        title="Delete Moment"
        message="Are you sure you want to delete this moment? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDeleteMoment}
        onCancel={() => {
          setShowDeleteMomentConfirm(false);
          setMomentToDelete(null);
        }}
      />

      {state.showNoteModal && (
        <WindowTemplate
          isOpen={state.showNoteModal}
          onClose={() => {
            actions.toggleNoteModal(false);
            setShowNoteExtended(false);
          }}
          title={`Write Note for ${state.contact?.Name}`}
          size="lg"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  actions.toggleNoteModal(false);
                  setShowNoteExtended(false);
                }}
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
                rows="12"
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

            <button
              type="button"
              className="cp-note-extended-toggle"
              onClick={() => setShowNoteExtended((prev) => !prev)}
            >
              {showNoteExtended ? '- Hide options' : '+ More options'}
            </button>

            {showNoteExtended && (
              <>
                <div>
                  <label className="form-label">Tags</label>
                  <input
                    type="text"
                    className="form-input"
                    value={state.noteFormData.Tags || ''}
                    onChange={(e) =>
                      actions.setNoteFormData({ ...state.noteFormData, Tags: e.target.value })
                    }
                    placeholder="Comma-separated tags"
                  />
                </div>
                <div>
                  <label className="form-label">Visibility</label>
                  <select
                    className="form-input"
                    value={state.noteFormData.Visibility || 'Private'}
                    onChange={(e) =>
                      actions.setNoteFormData({
                        ...state.noteFormData,
                        Visibility: e.target.value,
                      })
                    }
                  >
                    <option value="Private">Private</option>
                    <option value="Workspace">Workspace</option>
                    <option value="Public">Public</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </WindowTemplate>
      )}
    </div>
  );
}

export default ContactProfile;
