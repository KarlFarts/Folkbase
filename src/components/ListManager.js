import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  addList,
  updateList,
  deleteList,
  addContactToList,
  removeContactFromList,
  getContactLists,
  readSheetData,
  SHEETS,
} from '../utils/devModeWrapper';
import ConfirmDialog from './ConfirmDialog';
import '../styles/index.css';

/**
 * ListManager Component
 * Manages display and selection of lists for a contact
 * Supports adding/removing contacts from lists
 * Works in both dev mode (localStorage) and production (Google Sheets)
 */
function ListManager({ contactId, onClose, accessToken, sheetId, embedded }) {
  const [lists, setLists] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [originalListIds, setOriginalListIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for creating new lists
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  // State for editing lists
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingListDesc, setEditingListDesc] = useState('');

  // State for delete confirmation
  const [listToDelete, setListToDelete] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all lists and contact's current lists
      const [allListsResult, contactLists] = await Promise.all([
        readSheetData(accessToken, sheetId, SHEETS.LISTS),
        getContactLists(accessToken, sheetId, contactId),
      ]);

      const allLists = allListsResult.data || allListsResult;
      setLists(Array.isArray(allLists) ? allLists : []);

      const contactListIds = contactLists.map((l) => l['List ID']);
      setSelectedListIds(contactListIds);
      setOriginalListIds(contactListIds);
      setError(null);
    } catch (err) {
      setError('Failed to load lists: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId, accessToken, sheetId]);

  const handleToggleList = (listId) => {
    const newSelected = selectedListIds.includes(listId)
      ? selectedListIds.filter((id) => id !== listId)
      : [...selectedListIds, listId];

    setSelectedListIds(newSelected);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    try {
      setError(null);
      const result = await addList(accessToken, sheetId, {
        'List Name': newListName.trim(),
        Description: newListDesc.trim(),
      });

      setLists((prev) => [...prev, result]);
      setNewListName('');
      setNewListDesc('');
    } catch (err) {
      setError('Failed to create list: ' + err.message);
    }
  };

  const handleStartEdit = (list) => {
    setEditingListId(list['List ID']);
    setEditingListName(list['List Name']);
    setEditingListDesc(list['Description'] || '');
  };

  const handleSaveRename = async () => {
    if (!editingListName.trim()) return;

    try {
      setError(null);
      await updateList(accessToken, sheetId, editingListId, {
        'List Name': editingListName.trim(),
        Description: editingListDesc.trim(),
      });

      setLists((prev) =>
        prev.map((l) =>
          l['List ID'] === editingListId
            ? { ...l, 'List Name': editingListName.trim(), Description: editingListDesc.trim() }
            : l
        )
      );
      setEditingListId(null);
      setEditingListName('');
      setEditingListDesc('');
    } catch (err) {
      setError('Failed to update list: ' + err.message);
    }
  };

  const handleDeleteList = async () => {
    if (!listToDelete) return;

    try {
      setError(null);
      await deleteList(accessToken, sheetId, listToDelete);

      setLists((prev) => prev.filter((l) => l['List ID'] !== listToDelete));
      setSelectedListIds((prev) => prev.filter((id) => id !== listToDelete));
      setOriginalListIds((prev) => prev.filter((id) => id !== listToDelete));
      setListToDelete(null);
    } catch (err) {
      setError('Failed to delete list: ' + err.message);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Compute diffs: which lists were added, which removed
      const added = selectedListIds.filter((id) => !originalListIds.includes(id));
      const removed = originalListIds.filter((id) => !selectedListIds.includes(id));

      // Add new mappings
      for (const listId of added) {
        await addContactToList(accessToken, sheetId, contactId, listId);
      }

      // Remove old mappings
      for (const listId of removed) {
        await removeContactFromList(accessToken, sheetId, contactId, listId);
      }

      setOriginalListIds(selectedListIds);

      if (onClose) {
        onClose();
      }
    } catch (err) {
      setError('Failed to save lists: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="list-manager loading">Loading lists...</div>;
  }

  return (
    <div className="list-manager">
      <div className="list-manager-header">
        <h3>Manage Lists</h3>
        {!embedded && (
          <button className="btn-close" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Create New List Section */}
      <div className="lm-create-section">
        <h4 className="lm-section-heading">Create New List</h4>
        <input
          type="text"
          placeholder="List name (e.g., Board Members)"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          className="lm-input"
          onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={newListDesc}
          onChange={(e) => setNewListDesc(e.target.value)}
          className="lm-input"
          onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
        />
        <button
          onClick={handleCreateList}
          disabled={!newListName.trim()}
          className="lm-create-btn"
        >
          Create List
        </button>
      </div>

      {/* Edit List Section */}
      {editingListId && (
        <div className="lm-edit-section">
          <h4 className="lm-section-heading">Edit List</h4>
          <input
            type="text"
            placeholder="List name"
            value={editingListName}
            onChange={(e) => setEditingListName(e.target.value)}
            className="lm-input"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={editingListDesc}
            onChange={(e) => setEditingListDesc(e.target.value)}
            className="lm-input"
          />
          <div className="lm-edit-actions">
            <button
              onClick={handleSaveRename}
              disabled={!editingListName.trim()}
              className="lm-edit-save-btn"
            >
              Save
            </button>
            <button onClick={() => setEditingListId(null)} className="lm-edit-cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List of Lists */}
      <div className="list-lists">
        {lists.length === 0 ? (
          <p className="text-muted">No lists available</p>
        ) : (
          lists.map((list) => (
            <div key={list['List ID']} className="lm-list-item">
              <div className="lm-list-item-top">
                <label className="lm-list-label">
                  <input
                    type="checkbox"
                    checked={selectedListIds.includes(list['List ID'])}
                    onChange={() => handleToggleList(list['List ID'])}
                  />
                  <div className="lm-list-label-content">
                    <div className="lm-list-name">{list['List Name']}</div>
                    {list['Description'] && (
                      <div className="lm-list-desc">{list['Description']}</div>
                    )}
                  </div>
                </label>
              </div>
              <div className="lm-list-actions">
                <button onClick={() => handleStartEdit(list)} className="lm-rename-btn">
                  Rename
                </button>
                <button
                  onClick={() => setListToDelete(list['List ID'])}
                  className="lm-delete-btn"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="list-manager-footer">
        {!embedded && (
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        )}
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          Save Lists
        </button>
      </div>

      <ConfirmDialog
        isOpen={!!listToDelete}
        onConfirm={handleDeleteList}
        onCancel={() => setListToDelete(null)}
        title="Delete List"
        message="Delete this list? Contacts will not be deleted."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

export default ListManager;
