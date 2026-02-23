import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, List, CheckSquare, X } from 'lucide-react';
import './LinkedEntitiesDisplay.css';

const LinkedEntitiesDisplay = ({
  note,
  onUnlink,
  onLinkMore,
  canEdit = false,
  showActions = true,
}) => {
  const navigate = useNavigate();

  // Entity configuration
  const entityConfig = {
    contacts: {
      label: 'Contacts',
      icon: <User size={14} />,
      color: 'var(--color-accent-primary)',
      navigate: (id) => `/contacts/${id}`,
      getKey: (contact) => contact['Contact ID'] || contact._id || contact.id,
      getName: (contact) =>
        contact['Display Name'] || contact.Name || contact.name || 'Unknown Contact',
    },
    events: {
      label: 'Events',
      icon: <Calendar size={14} />,
      color: 'var(--color-success)',
      navigate: (id) => `/events/${id}`,
      getKey: (event) => event['Event ID'] || event._id || event.id,
      getName: (event) =>
        event['Event Name'] || event.title || event.name || 'Unknown Event',
    },
    lists: {
      label: 'Lists',
      icon: <List size={14} />,
      color: 'var(--color-info)',
      navigate: (id) => `/lists?highlight=${id}`,
      getKey: (list) => list['List ID'] || list._id || list.id,
      getName: (list) => list['List Name'] || list.name || list.title || 'Unknown List',
    },
    tasks: {
      label: 'Tasks',
      icon: <CheckSquare size={14} />,
      color: 'var(--color-warning)',
      navigate: (id) => `/tasks?highlight=${id}`,
      getKey: (task) => task['Task ID'] || task._id || task.id,
      getName: (task) => task['Task Name'] || task.title || task.name || 'Unknown Task',
    },
  };

  // Get entities from note
  const getEntities = (type) => {
    const fieldMap = {
      contacts: 'linkedContacts',
      events: 'linkedEvents',
      lists: 'linkedLists',
      tasks: 'linkedTasks',
    };
    return note?.[fieldMap[type]] || [];
  };

  // Check if any entities exist
  const hasAnyEntities = () => {
    return Object.keys(entityConfig).some((type) => getEntities(type).length > 0);
  };

  // Handle entity chip click
  const handleEntityClick = (type, entity) => {
    const config = entityConfig[type];
    const entityId = config.getKey(entity);
    navigate(config.navigate(entityId));
  };

  // Handle unlink click
  const handleUnlinkClick = (e, type, entity) => {
    e.stopPropagation();
    const config = entityConfig[type];
    const entityId = config.getKey(entity);
    if (onUnlink) {
      onUnlink(type, entityId);
    }
  };

  // Handle link more click
  const handleLinkMoreClick = (type) => {
    if (onLinkMore) {
      onLinkMore(type);
    }
  };

  // Render entity chip
  const renderEntityChip = (type, entity) => {
    const config = entityConfig[type];
    const entityId = config.getKey(entity);
    const entityName = config.getName(entity);

    return (
      <div
        key={entityId}
        className="entity-chip"
        style={{ backgroundColor: `${config.color}15`, borderColor: config.color }}
        onClick={() => handleEntityClick(type, entity)}
      >
        <span className="entity-icon">{config.icon}</span>
        <span className="entity-name">{entityName}</span>
        {canEdit && showActions && (
          <button
            className="unlink-button"
            onClick={(e) => handleUnlinkClick(e, type, entity)}
            aria-label={`Unlink ${entityName}`}
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  // Render entity section
  const renderEntitySection = (type) => {
    const entities = getEntities(type);
    if (entities.length === 0) return null;

    const config = entityConfig[type];

    return (
      <div key={type} className="entity-section">
        <div className="entity-section-header">
          <h4 style={{ color: config.color }}>
            {config.label} ({entities.length})
          </h4>
        </div>
        <div className="entity-chips-container">
          {entities.map((entity) => renderEntityChip(type, entity))}
          {showActions && (
            <button
              className="link-more-button"
              style={{ borderColor: config.color, color: config.color }}
              onClick={() => handleLinkMoreClick(type)}
            >
              + Link More
            </button>
          )}
        </div>
      </div>
    );
  };

  // Empty state
  if (!note || !hasAnyEntities()) {
    return (
      <div className="linked-entities-display">
        <div className="empty-state">
          <p>No entities linked to this note</p>
          {showActions && onLinkMore && (
            <button className="link-more-button primary" onClick={() => handleLinkMoreClick()}>
              + Link Entities
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="linked-entities-display">
      {Object.keys(entityConfig).map((type) => renderEntitySection(type))}
    </div>
  );
};

export default LinkedEntitiesDisplay;
