import React, { useState } from 'react';
import QuickEnrichmentForm from './QuickEnrichmentForm';
import './NewContactCard.css';

function NewContactCard({
  contact,
  onAdd,
  onSkip,
  isAdding,
  existingTags = [],
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [enrichment, setEnrichment] = useState({
    tags: '',
    howWeMet: '',
    priority: 'Medium',
  });

  const handleAdd = () => {
    onAdd(contact, enrichment);
  };

  const handleSkip = () => {
    onSkip(contact);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`new-contact-card ${isAdding ? 'adding' : ''}`}>
      <div className="card-header">
        <div className="contact-info">
          <div className="contact-avatar">
            {contact.Name ? contact.Name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="contact-details">
            <h3 className="contact-name">{contact.Name || 'Unknown'}</h3>
            {contact.Organization && (
              <p className="contact-org">
                {contact.Role ? `${contact.Role} at ` : ''}{contact.Organization}
              </p>
            )}
            <div className="contact-meta">
              {contact.Phone && (
                <span className="meta-item">
                  <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {contact.Phone}
                </span>
              )}
              {contact.Email && (
                <span className="meta-item">
                  <svg className="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  {contact.Email}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="new-badge">NEW</span>
      </div>

      <button
        type="button"
        className="expand-toggle"
        onClick={toggleExpand}
      >
        {isExpanded ? 'Hide details' : 'Add details (optional)'}
        <svg
          className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="enrichment-section">
          <QuickEnrichmentForm
            enrichment={enrichment}
            onChange={setEnrichment}
            existingTags={existingTags}
          />
        </div>
      )}

      <div className="card-actions">
        <button
          type="button"
          className="action-btn skip-btn"
          onClick={handleSkip}
          disabled={isAdding}
        >
          Skip
        </button>
        <button
          type="button"
          className="action-btn add-btn"
          onClick={handleAdd}
          disabled={isAdding}
        >
          {isAdding ? 'Adding...' : 'Add to Folkbase'}
        </button>
      </div>
    </div>
  );
}

export default NewContactCard;
