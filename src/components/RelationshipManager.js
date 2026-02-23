import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RelationshipGraph from './RelationshipGraph';
import RelationshipList from './RelationshipList';
import AddRelationshipModal from './AddRelationshipModal';
import {
  getContactRelationships,
  createRelationship,
  deleteRelationship,
  expandBidirectionalRelationships,
} from '../utils/devModeWrapper';
import { readSheetData, SHEETS } from '../utils/devModeWrapper';
import { ENTITY_TYPES, ENTITY_CONFIG } from '../utils/entityTypes';
import { SHEET_NAMES } from '../config/constants';
import {
  getEntityRelationships,
  createEntityRelationship,
  deleteEntityRelationship,
  expandBidirectionalEntityRelationships,
} from '../services/entityRelationshipService';
import { error as logError } from '../utils/logger';
import { useNotification } from '../contexts/NotificationContext';

/**
 * RelationshipManager Component
 *
 * Container component that orchestrates the entire relationship management UI.
 * Manages state, view switching (list/graph), and handles CRUD operations.
 * Supports both legacy contact-only mode and multi-entity mode.
 *
 * @param {Object} props
 * @param {string} props.contactId - (Legacy) ID of the current contact
 * @param {string} props.entityType - Type of the entity (Contact, Organization, Location)
 * @param {string} props.entityId - ID of the current entity
 * @param {string} props.accessToken - Google OAuth access token
 * @param {string} props.sheetId - Google Sheet ID
 * @param {string} props.userEmail - Email of the current user
 * @param {boolean} props.isMultiEntity - True to enable multi-entity mode (default: false)
 */
export default function RelationshipManager({
  contactId,
  entityType,
  entityId,
  accessToken,
  sheetId,
  userEmail,
  isMultiEntity = false,
}) {
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Determine actual entity type and ID (support both legacy and new props)
  const actualEntityType = entityType || ENTITY_TYPES.CONTACT;
  const actualEntityId = entityId || contactId;

  const [view, setView] = useState('graph'); // 'list' or 'graph'
  const [relationships, setRelationships] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [allOrganizations, setAllOrganizations] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [currentEntity, setCurrentEntity] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Define loadData with useCallback to prevent infinite loops
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load all contacts (always needed for display)
      const contactsData = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
      const contacts = contactsData.data || contactsData;
      setAllContacts(contacts);

      if (isMultiEntity) {
        // Load organizations and locations for multi-entity mode
        try {
          const orgsData = await readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS);
          setAllOrganizations(orgsData.data || orgsData || []);
        } catch {
          setAllOrganizations([]);
        }

        try {
          const locsData = await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATIONS);
          setAllLocations(locsData.data || locsData || []);
        } catch {
          setAllLocations([]);
        }

        // Find current entity
        let entity = null;
        if (actualEntityType === ENTITY_TYPES.CONTACT) {
          entity = contacts.find((c) => c['Contact ID'] === actualEntityId);
        } else if (actualEntityType === ENTITY_TYPES.ORGANIZATION) {
          const orgs = allOrganizations.length
            ? allOrganizations
            : (await readSheetData(accessToken, sheetId, SHEET_NAMES.ORGANIZATIONS)).data || [];
          entity = orgs.find((o) => o['Organization ID'] === actualEntityId);
        } else if (actualEntityType === ENTITY_TYPES.LOCATION) {
          const locs = allLocations.length
            ? allLocations
            : (await readSheetData(accessToken, sheetId, SHEET_NAMES.LOCATIONS)).data || [];
          entity = locs.find((l) => l['Location ID'] === actualEntityId);
        }
        setCurrentEntity(entity);

        // Load entity relationships
        const rels = await getEntityRelationships(
          accessToken,
          sheetId,
          actualEntityType,
          actualEntityId
        );
        setRelationships(rels);
      } else {
        // Legacy mode: contact-only
        const currentContactData = contacts.find((c) => c['Contact ID'] === actualEntityId);
        setCurrentEntity(currentContactData);

        const rels = await getContactRelationships(accessToken, sheetId, actualEntityId);
        setRelationships(rels);
      }
    } catch (err) {
      console.error('[RelationshipManager] Error loading data:', err);
      logError('Error loading relationship data:', err);
      setError(err.message || 'Failed to load relationships');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, sheetId, actualEntityId, actualEntityType, isMultiEntity]);

  // Load relationships and entities
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddRelationship = async (relationshipData) => {
    try {
      if (isMultiEntity) {
        await createEntityRelationship(
          accessToken,
          sheetId,
          relationshipData['Source Entity Type'],
          relationshipData['Source Entity ID'],
          relationshipData['Target Entity Type'],
          relationshipData['Target Entity ID'],
          relationshipData,
          userEmail
        );
      } else {
        await createRelationship(accessToken, sheetId, relationshipData, userEmail);
      }
      // Reload relationships
      await loadData();
    } catch (err) {
      logError('Error creating relationship:', err);
      throw err;
    }
  };

  const handleDeleteRelationship = async (relationshipId) => {
    try {
      if (isMultiEntity) {
        await deleteEntityRelationship(accessToken, sheetId, relationshipId, userEmail);
      } else {
        await deleteRelationship(accessToken, sheetId, relationshipId, userEmail);
      }
      // Reload relationships
      await loadData();
    } catch (err) {
      logError('Error deleting relationship:', err);
      notify.error('Failed to delete relationship. Please try again.');
    }
  };

  const handleEntityClick = (clickedEntityType, clickedEntityId) => {
    // Navigate to the clicked entity's profile
    if (clickedEntityType === ENTITY_TYPES.CONTACT) {
      navigate(`/contacts/${clickedEntityId}`);
    } else if (clickedEntityType === ENTITY_TYPES.ORGANIZATION) {
      navigate(`/organizations/${clickedEntityId}`);
    } else if (clickedEntityType === ENTITY_TYPES.LOCATION) {
      navigate(`/locations/${clickedEntityId}`);
    }
  };

  const handleContactClick = (clickedContactId) => {
    // Legacy mode: navigate to contact profile
    navigate(`/contacts/${clickedContactId}`);
  };

  const handleNodeClick = (entityTypeOrId, maybeEntityId) => {
    if (isMultiEntity && maybeEntityId) {
      // Multi-entity mode: entityTypeOrId is type, maybeEntityId is ID
      handleEntityClick(entityTypeOrId, maybeEntityId);
    } else {
      // Legacy mode: entityTypeOrId is the contact ID
      handleContactClick(entityTypeOrId);
    }
  };

  const handleEdgeClick = (_relationshipId) => {
    // Could open an edit modal in the future
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading relationships...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          background: 'var(--color-danger-bg)',
          border: '1px solid var(--color-danger)',
          borderRadius: '8px',
          color: 'var(--color-danger)',
        }}
      >
        <strong>Error:</strong> {error}
      </div>
    );
  }

  // Expand bidirectional relationships for graph visualization
  const expandedRelationships = isMultiEntity
    ? expandBidirectionalEntityRelationships(relationships)
    : expandBidirectionalRelationships(relationships);

  // Get entity config for display
  const entityConfig = ENTITY_CONFIG[actualEntityType];
  const entityName = currentEntity?.[entityConfig?.nameField] || actualEntityId;

  // Prepare entities data for multi-entity graph
  const entitiesData = {
    contacts: allContacts,
    organizations: allOrganizations,
    locations: allLocations,
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* Header with view toggle and add button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Relationship Network</h3>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'inline-flex',
              border: '1px solid var(--border-color-default)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setView('graph')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: view === 'graph' ? 'var(--color-accent-primary, #c2703e)' : 'white',
                color: view === 'graph' ? 'white' : '#111827',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              Graph View
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderLeft: '1px solid var(--border-color-default)',
                background: view === 'list' ? 'var(--color-accent-primary, #c2703e)' : 'white',
                color: view === 'list' ? 'white' : '#111827',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              List View
            </button>
          </div>

          {/* Add Relationship Button */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: entityConfig?.color || 'var(--color-accent-primary, #c2703e)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
            }}
          >
            + Add Relationship
          </button>
        </div>
      </div>

      {/* Relationship count */}
      <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
        {relationships.length} {relationships.length === 1 ? 'relationship' : 'relationships'}
      </div>

      {/* Content Area */}
      {view === 'graph' ? (
        <RelationshipGraph
          contactId={!isMultiEntity ? actualEntityId : undefined}
          entityType={isMultiEntity ? actualEntityType : undefined}
          entityId={isMultiEntity ? actualEntityId : undefined}
          relationships={expandedRelationships}
          contacts={allContacts}
          entitiesData={isMultiEntity ? entitiesData : undefined}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          depth={2}
          isMultiEntity={isMultiEntity}
        />
      ) : (
        <RelationshipList
          sourceContactId={!isMultiEntity ? actualEntityId : undefined}
          sourceEntityType={isMultiEntity ? actualEntityType : undefined}
          sourceEntityId={isMultiEntity ? actualEntityId : undefined}
          relationships={relationships}
          contacts={allContacts}
          organizations={allOrganizations}
          locations={allLocations}
          onContactClick={handleContactClick}
          onEntityClick={handleEntityClick}
          onDelete={handleDeleteRelationship}
          isMultiEntity={isMultiEntity}
        />
      )}

      {/* Add Relationship Modal */}
      {showAddModal && (
        <AddRelationshipModal
          sourceContactId={!isMultiEntity ? actualEntityId : undefined}
          sourceContactName={!isMultiEntity ? entityName : undefined}
          sourceEntityType={isMultiEntity ? actualEntityType : undefined}
          sourceEntityId={isMultiEntity ? actualEntityId : undefined}
          sourceEntityName={isMultiEntity ? entityName : undefined}
          contacts={allContacts}
          organizations={allOrganizations}
          locations={allLocations}
          onSave={handleAddRelationship}
          onClose={() => setShowAddModal(false)}
          isMultiEntity={isMultiEntity}
        />
      )}
    </div>
  );
}
