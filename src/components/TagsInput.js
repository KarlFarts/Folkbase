import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * TagsInput - Pill/chip tag input.
 * Value is a comma-separated string (matches existing data format).
 * Press Enter or comma to add a tag; click X on a chip to remove.
 */
function TagsInput({ value, onChange, placeholder = 'Add tag...', suggestionsKey = null }) {
  const [inputVal, setInputVal] = useState('');

  const tags = value
    ? value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Build suggestions from localStorage contacts if available
  const suggestions = (() => {
    if (!suggestionsKey) return [];
    try {
      const contacts = JSON.parse(localStorage.getItem(suggestionsKey) || '[]');
      const tagSet = new Set();
      contacts.forEach((c) => {
        if (c.Tags) c.Tags.split(',').forEach((t) => tagSet.add(t.trim()));
      });
      return Array.from(tagSet)
        .filter((t) => t && !tags.includes(t))
        .sort();
    } catch {
      return [];
    }
  })();

  const addTag = (raw) => {
    const trimmed = raw.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed].join(', '));
    }
    setInputVal('');
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index).join(', '));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputVal.trim()) addTag(inputVal);
  };

  const listId = `tags-suggestions-${Math.random().toString(36).slice(2)}`;

  return (
    <div className="tags-input-wrap">
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} className="tags-input-chip">
          {tag}
          <button
            type="button"
            className="tags-input-chip-remove"
            onClick={() => removeTag(i)}
            aria-label={`Remove ${tag}`}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="tags-input-field"
        value={inputVal}
        placeholder={tags.length === 0 ? placeholder : 'Add tag...'}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        list={suggestions.length > 0 ? listId : undefined}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </div>
  );
}

export default TagsInput;
