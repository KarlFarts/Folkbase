import React from 'react';
import { Check } from 'lucide-react';
import IconMap from '../IconMap';
import EntitySuggestionCard from './EntitySuggestionCard';
import './EntitySuggestionsPanel.css';

/**
 * EntitySuggestionsPanel Component
 * Displays all detected entities grouped by type with batch actions
 */
function EntitySuggestionsPanel({
  detectedEntities,
  linkedEntities,
  isDetecting,
  onLinkEntity,
  onIgnoreEntity,
  onDisambiguate,
  onAcceptAllHighConfidence,
}) {
  if (!detectedEntities) return null;

  const { contacts, locations, events, tasks, summary } = detectedEntities;
  const hasEntities = summary.total > 0;
  const hasHighConfidence = summary.highConfidence > 0;

  // Check if entity is already linked
  const isEntityLinked = (entity, type) => {
    switch (type) {
      case 'contact':
        return linkedEntities.contacts.some((c) => c.contactId === entity.contactId);
      case 'location':
        return linkedEntities.locations.some((l) => l.text === entity.text);
      case 'event':
        return linkedEntities.events.some((e) => e.eventId === entity.eventId);
      case 'task':
        return linkedEntities.tasks.some((t) => t.text === entity.text);
      default:
        return false;
    }
  };

  return (
    <div className="entity-suggestions-panel">
      <div className="suggestions-header">
        <h3>Detected Entities</h3>
        {isDetecting && <span className="detecting-indicator">Analyzing...</span>}
      </div>

      {!hasEntities ? (
        <div className="empty-state">
          <p>No entities detected yet. Keep typing!</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="suggestions-summary">
            <div className="summary-stat">
              <span className="stat-value">{summary.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{summary.byType.contacts}</span>
              <span className="stat-label">
                <IconMap name="User" size={14} /> Contacts
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{summary.byType.locations}</span>
              <span className="stat-label">
                <IconMap name="MapPin" size={14} /> Places
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{summary.byType.events}</span>
              <span className="stat-label">
                <IconMap name="Calendar" size={14} /> Events
              </span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{summary.byType.tasks}</span>
              <span className="stat-label">
                <Check size={14} /> Tasks
              </span>
            </div>
          </div>

          {/* Batch Actions */}
          {hasHighConfidence && (
            <div className="batch-actions">
              <button className="btn btn-primary btn-sm" onClick={onAcceptAllHighConfidence}>
                Accept All High-Confidence ({summary.highConfidence})
              </button>
            </div>
          )}

          {/* Entity Groups */}
          <div className="suggestions-list">
            {contacts.length > 0 && (
              <div className="entity-group">
                <h4>
                  <IconMap name="User" size={16} /> Contacts ({contacts.length})
                </h4>
                {contacts.map((contact, idx) => (
                  <EntitySuggestionCard
                    key={`contact-${idx}`}
                    entity={contact}
                    type="contact"
                    isLinked={isEntityLinked(contact, 'contact')}
                    onLink={onLinkEntity}
                    onIgnore={onIgnoreEntity}
                    onDisambiguate={onDisambiguate}
                  />
                ))}
              </div>
            )}

            {locations.length > 0 && (
              <div className="entity-group">
                <h4>
                  <IconMap name="MapPin" size={16} /> Locations ({locations.length})
                </h4>
                {locations.map((location, idx) => (
                  <EntitySuggestionCard
                    key={`location-${idx}`}
                    entity={location}
                    type="location"
                    isLinked={isEntityLinked(location, 'location')}
                    onLink={onLinkEntity}
                    onIgnore={onIgnoreEntity}
                    onDisambiguate={onDisambiguate}
                  />
                ))}
              </div>
            )}

            {events.length > 0 && (
              <div className="entity-group">
                <h4>
                  <IconMap name="Calendar" size={16} /> Events ({events.length})
                </h4>
                {events.map((event, idx) => (
                  <EntitySuggestionCard
                    key={`event-${idx}`}
                    entity={event}
                    type="event"
                    isLinked={isEntityLinked(event, 'event')}
                    onLink={onLinkEntity}
                    onIgnore={onIgnoreEntity}
                    onDisambiguate={onDisambiguate}
                  />
                ))}
              </div>
            )}

            {tasks.length > 0 && (
              <div className="entity-group">
                <h4>
                  <Check size={16} /> Tasks ({tasks.length})
                </h4>
                {tasks.map((task, idx) => (
                  <EntitySuggestionCard
                    key={`task-${idx}`}
                    entity={task}
                    type="task"
                    isLinked={isEntityLinked(task, 'task')}
                    onLink={onLinkEntity}
                    onIgnore={onIgnoreEntity}
                    onDisambiguate={onDisambiguate}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default EntitySuggestionsPanel;
