import React from 'react';
import './QuickEnrichmentForm.css';

const PRIORITY_OPTIONS = [
  { value: 'Urgent', label: 'Urgent' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
  { value: 'No Urgency', label: 'No Urgency' },
];

const HOW_WE_MET_SUGGESTIONS = [
  'Networking event',
  'Conference',
  'Referral',
  'Cold outreach',
  'Social media',
  'Friend of a friend',
  'Work',
  'Community event',
];

function QuickEnrichmentForm({ enrichment, onChange, existingTags = [] }) {
  const handleTagsChange = (e) => {
    onChange({ ...enrichment, tags: e.target.value });
  };

  const handleHowWeMetChange = (e) => {
    onChange({ ...enrichment, howWeMet: e.target.value });
  };

  const handlePriorityChange = (e) => {
    onChange({ ...enrichment, priority: e.target.value });
  };

  const handleSuggestionClick = (suggestion) => {
    onChange({ ...enrichment, howWeMet: suggestion });
  };

  // Get unique tags from existing contacts for autocomplete hints
  const tagSuggestions = [...new Set(existingTags)].slice(0, 8);

  return (
    <div className="quick-enrichment-form">
      <div className="enrichment-field">
        <label htmlFor="howWeMet">How did you meet?</label>
        <input
          type="text"
          id="howWeMet"
          value={enrichment.howWeMet || ''}
          onChange={handleHowWeMetChange}
          placeholder="e.g., Networking event, Conference..."
        />
        <div className="suggestions">
          {HOW_WE_MET_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={`suggestion-chip ${enrichment.howWeMet === suggestion ? 'active' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="enrichment-field">
        <label htmlFor="tags">Tags</label>
        <input
          type="text"
          id="tags"
          value={enrichment.tags || ''}
          onChange={handleTagsChange}
          placeholder="e.g., Volunteer, Donor, VIP (comma-separated)"
        />
        {tagSuggestions.length > 0 && (
          <div className="tag-hints">
            <span className="hint-label">Recent tags:</span>
            {tagSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                className="tag-hint"
                onClick={() => {
                  const currentTags = enrichment.tags ? enrichment.tags.split(',').map(t => t.trim()) : [];
                  if (!currentTags.includes(tag)) {
                    const newTags = [...currentTags, tag].filter(Boolean).join(', ');
                    onChange({ ...enrichment, tags: newTags });
                  }
                }}
              >
                +{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="enrichment-field">
        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          value={enrichment.priority || 'Medium'}
          onChange={handlePriorityChange}
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default QuickEnrichmentForm;
