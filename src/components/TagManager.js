import React, { useState, useMemo } from 'react';
import WindowTemplate from './WindowTemplate';

/**
 * TagManager Component
 * Modal to rename/delete tags globally across all contacts
 */
export default function TagManager({ contacts, onUpdateContacts, onClose }) {
  // Extract all unique tags from contacts
  const allTags = useMemo(() => {
    const tagSet = new Set();
    contacts.forEach((contact) => {
      if (contact.Tags) {
        contact.Tags.split(',').forEach((tag) => {
          tagSet.add(tag.trim());
        });
      }
    });
    return Array.from(tagSet).sort();
  }, [contacts]);

  // Count contacts per tag
  const tagCounts = useMemo(() => {
    const counts = {};
    allTags.forEach((tag) => {
      counts[tag] = contacts.filter(
        (c) =>
          c.Tags &&
          c.Tags.split(',')
            .map((t) => t.trim())
            .includes(tag)
      ).length;
    });
    return counts;
  }, [contacts, allTags]);

  const [selectedTag, setSelectedTag] = useState('');
  const [newTagName, setNewTagName] = useState('');

  const handleRename = () => {
    if (!selectedTag || !newTagName.trim()) return;

    // Update all contacts with old tag to new tag
    const updatedContacts = contacts.map((contact) => {
      if (!contact.Tags) return contact;
      const tags = contact.Tags.split(',').map((t) => t.trim());
      const updatedTags = tags.map((t) => (t === selectedTag ? newTagName.trim() : t));
      return { ...contact, Tags: updatedTags.join(', ') };
    });

    onUpdateContacts(updatedContacts);
    setSelectedTag('');
    setNewTagName('');
  };

  const handleDelete = () => {
    if (!selectedTag) return;
    if (!window.confirm(`Delete tag "${selectedTag}" from all ${tagCounts[selectedTag]} contacts?`))
      return;

    // Remove tag from all contacts
    const updatedContacts = contacts.map((contact) => {
      if (!contact.Tags) return contact;
      const tags = contact.Tags.split(',').map((t) => t.trim());
      const filteredTags = tags.filter((t) => t !== selectedTag);
      return { ...contact, Tags: filteredTags.length > 0 ? filteredTags.join(', ') : '' };
    });

    onUpdateContacts(updatedContacts);
    setSelectedTag('');
    setNewTagName('');
  };

  return (
    <WindowTemplate
      isOpen={true}
      onClose={onClose}
      title="Manage Tags"
      size="md"
      footer={
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      {/* Tag List */}
      <div
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          marginBottom: 'var(--spacing-lg)',
          border: '1px solid var(--border-color-default)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {allTags.length === 0 ? (
          <div style={{ padding: 'var(--spacing-md)', color: 'var(--color-text-muted)' }}>
            No tags available
          </div>
        ) : (
          allTags.map((tag) => (
            <div
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                cursor: 'pointer',
                backgroundColor:
                  selectedTag === tag ? 'var(--color-accent-secondary)' : 'transparent',
                borderBottom: '1px solid var(--border-color-default)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                <strong>{tag}</strong>
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9em' }}>
                ({tagCounts[tag]} contacts)
              </span>
            </div>
          ))
        )}
      </div>

      {/* Rename Section */}
      {selectedTag && (
        <div
          style={{
            marginBottom: 'var(--spacing-lg)',
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>Rename &quot;{selectedTag}&quot;</h3>
          <input
            type="text"
            className="form-input"
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            style={{ width: '100%', marginBottom: 'var(--spacing-sm)' }}
            onKeyPress={(e) => e.key === 'Enter' && handleRename()}
          />
          <button className="btn btn-primary" onClick={handleRename} disabled={!newTagName.trim()}>
            Rename Tag
          </button>
        </div>
      )}

      {/* Delete Section */}
      {selectedTag && (
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <button className="btn btn-danger" onClick={handleDelete} style={{ width: '100%' }}>
            Delete &quot;{selectedTag}&quot; from all contacts
          </button>
        </div>
      )}
    </WindowTemplate>
  );
}
