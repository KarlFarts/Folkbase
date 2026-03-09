import { useState, useEffect, useCallback } from 'react';
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
  readOnly = false,
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
  const loadData = useCallback(async () => {
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
      setError('Failed to load relationships. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="rm-loading">
        <p>Loading relationships...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rm-error">
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
    <div className="rm-container">
      {/* Header with view toggle and add button */}
      <div className="rm-header">
        <h3 className="rm-title">Relationship Network</h3>

        <div className="rm-header-actions">
          {/* View Toggle */}
          <div className="rm-view-toggle">
            <button
              onClick={() => setView('graph')}
              className={`rm-view-btn ${view === 'graph' ? 'rm-view-btn--active' : ''}`}
            >
              Graph View
            </button>
            <button
              onClick={() => setView('list')}
              className={`rm-view-btn rm-view-btn--right ${view === 'list' ? 'rm-view-btn--active' : ''}`}
            >
              List View
            </button>
          </div>

          {/* Add Relationship Button */}
          {!readOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="rm-add-btn"
              style={{ background: entityConfig?.color || 'var(--color-accent-primary, #c2703e)' }}
            >
              + Add Relationship
            </button>
          )}
        </div>
      </div>

      {/* Relationship count */}
      <div className="rm-count">
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
          onDelete={readOnly ? undefined : handleDeleteRelationship}
          isMultiEntity={isMultiEntity}
        />
      )}

      {/* Add Relationship Modal */}
      {!readOnly && showAddModal && (
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
