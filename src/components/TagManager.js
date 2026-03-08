import { useState, useMemo } from 'react';
import WindowTemplate from './WindowTemplate';
import ConfirmDialog from './ConfirmDialog';

/**
 * TagManager Component
 * Modal to rename/delete tags globally across all contacts
 */
export default function TagManager({ contacts, onUpdateContacts, onClose, readOnly = false }) {
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
  const [confirmDeleteTag, setConfirmDeleteTag] = useState(null);

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
    setConfirmDeleteTag(selectedTag);
  };

  const handleConfirmDelete = () => {
    const tag = confirmDeleteTag;
    setConfirmDeleteTag(null);
    const updatedContacts = contacts.map((contact) => {
      if (!contact.Tags) return contact;
      const tags = contact.Tags.split(',').map((t) => t.trim());
      const filteredTags = tags.filter((t) => t !== tag);
      return { ...contact, Tags: filteredTags.length > 0 ? filteredTags.join(', ') : '' };
    });
    onUpdateContacts(updatedContacts);
    setSelectedTag('');
    setNewTagName('');
  };

  return (
    <>
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
      <div className="tm-tag-list">
        {allTags.length === 0 ? (
          <div className="tm-tag-empty">No tags available</div>
        ) : (
          allTags.map((tag) => (
            <div
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`tm-tag-row${selectedTag === tag ? ' tm-tag-row--selected' : ''}`}
            >
              <span>
                <strong>{tag}</strong>
              </span>
              <span className="tm-tag-count">({tagCounts[tag]} contacts)</span>
            </div>
          ))
        )}
      </div>

      {/* Rename Section */}
      {!readOnly && selectedTag && (
        <div className="tm-rename-section">
          <h3 className="tm-rename-heading">Rename &quot;{selectedTag}&quot;</h3>
          <input
            type="text"
            className="form-input tm-rename-input"
            placeholder="New tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleRename()}
          />
          <button className="btn btn-primary" onClick={handleRename} disabled={!newTagName.trim()}>
            Rename Tag
          </button>
        </div>
      )}

      {/* Delete Section */}
      {!readOnly && selectedTag && (
        <div className="tm-delete-section">
          <button className="btn btn-danger tm-delete-btn" onClick={handleDelete}>
            Delete &quot;{selectedTag}&quot; from all contacts
          </button>
        </div>
      )}
    </WindowTemplate>
    <ConfirmDialog
      isOpen={confirmDeleteTag !== null}
      onConfirm={handleConfirmDelete}
      onCancel={() => setConfirmDeleteTag(null)}
      title="Delete Tag"
      message={confirmDeleteTag ? `Delete tag "${confirmDeleteTag}" from all ${tagCounts[confirmDeleteTag]} contacts?` : ''}
      confirmLabel="Delete"
      variant="danger"
    />
    </>
  );
}
