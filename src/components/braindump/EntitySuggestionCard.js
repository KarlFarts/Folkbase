import React, { useState } from 'react';
import { Pin, Check } from 'lucide-react';
import IconMap from '../IconMap';
import { getEntityIcon, getConfidenceColorClass } from '../../services/entityDetector';
import './EntitySuggestionCard.css';

/**
 * EntitySuggestionCard Component
 * Displays a single detected entity with actions (Link, Ignore, View)
 * Handles disambiguation when multiple contacts match
 */
function EntitySuggestionCard({
  entity,
  type,
  isLinked,
  onLink,
  onIgnore,
  onDisambiguate,
}) {
  const [showDisambiguation, setShowDisambiguation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if this entity needs disambiguation (multiple contact matches)
  const needsDisambiguation = type === 'contact' && entity.matches && entity.matches.length > 1;

  const handleLink = async () => {
    if (needsDisambiguation && !entity.selectedContactId) {
      setShowDisambiguation(true);
      return;
    }

    setIsProcessing(true);
    try {
      await onLink(entity, type);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisambiguationSelect = async (selectedContact) => {
    setIsProcessing(true);
    try {
      await onDisambiguate(entity, selectedContact);
      setShowDisambiguation(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIgnore = () => {
    onIgnore(entity, type);
  };

  // Format display name based on entity type
  const getDisplayName = () => {
    switch (type) {
      case 'contact':
        return entity.contact?.Name || entity.text;
      case 'location':
        return entity.knownLocation || entity.text;
      case 'event':
        return entity.event?.['Event Name'] || entity.text;
      case 'task':
        return entity.text;
      default:
        return entity.text;
    }
  };

  // Get additional info to display
  const getAdditionalInfo = () => {
    switch (type) {
      case 'contact':
        if (entity.contact) {
          const parts = [];
          if (entity.contact.Email) parts.push(entity.contact.Email);
          if (entity.contact.Organization) parts.push(entity.contact.Organization);
          if (entity.contact['Last Contact Date']) {
            parts.push(`Last contacted: ${entity.contact['Last Contact Date']}`);
          }
          return parts.join(' • ');
        }
        return null;
      case 'event':
        if (entity.event && entity.event['Event Date']) {
          return `Date: ${entity.event['Event Date']}`;
        }
        return null;
      case 'task':
        return entity.deadline ? `Deadline: ${entity.deadline}` : null;
      default:
        return null;
    }
  };

  const icon = getEntityIcon(type);
  const displayName = getDisplayName();
  const additionalInfo = getAdditionalInfo();
  const confidenceClass = getConfidenceColorClass(entity.confidence);

  return (
    <div className={`entity-suggestion-card ${isLinked ? 'linked' : ''} ${confidenceClass}`}>
      <div className="entity-card-header">
        <div className="entity-icon"><IconMap name={icon} size={14} /></div>
        <div className="entity-details">
          <div className="entity-name">
            {displayName}
            {isLinked && <span className="linked-badge"><Check size={12} /> Linked</span>}
          </div>
          {additionalInfo && (
            <div className="entity-info">{additionalInfo}</div>
          )}
        </div>
        <div className="entity-confidence">
          {entity.confidence}%
        </div>
      </div>

      {showDisambiguation && needsDisambiguation ? (
        <div className="disambiguation-panel">
          <div className="disambiguation-header">
            Multiple matches found. Select the correct contact:
          </div>
          <div className="disambiguation-options">
            {entity.matches.map((match, idx) => (
              <button
                key={idx}
                className="disambiguation-option"
                onClick={() => handleDisambiguationSelect(match.contact)}
                disabled={isProcessing}
              >
                <div className="option-name">{match.contact.Name}</div>
                <div className="option-details">
                  {match.contact.Email && <span>{match.contact.Email}</span>}
                  {match.contact.Organization && <span>{match.contact.Organization}</span>}
                  {match.contact['Last Contact Date'] && (
                    <span>Last contacted: {match.contact['Last Contact Date']}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowDisambiguation(false)}
            disabled={isProcessing}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="entity-card-actions">
          {!isLinked ? (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleLink}
                disabled={isProcessing}
              >
                {isProcessing ? 'Linking...' : needsDisambiguation ? 'Choose' : 'Link'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleIgnore}
                disabled={isProcessing}
              >
                Ignore
              </button>
            </>
          ) : (
            <span className="linked-message">This entity will be linked when you save</span>
          )}
        </div>
      )}

      {entity.hasContext && (
        <div className="context-indicator" title="Detected with contextual keywords">
          <Pin size={14} /> Contextual mention
        </div>
      )}
    </div>
  );
}

export default EntitySuggestionCard;
