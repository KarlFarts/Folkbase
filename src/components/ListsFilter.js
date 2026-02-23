import React, { useState } from 'react';
import { getLocalLists, getLocalContactLists } from '../__tests__/fixtures/seedTestData';
import '../styles/index.css';

/**
 * ListsFilter Component
 * Displays available lists and allows filtering contacts by list
 */
function ListsFilter({ onFilterChange }) {
  const [lists] = useState(() => getLocalLists());
  const [selectedListId, setSelectedListId] = useState(null);

  const handleListSelect = (listId) => {
    const newSelected = selectedListId === listId ? null : listId;
    setSelectedListId(newSelected);
    onFilterChange(newSelected);
  };

  if (lists.length === 0) {
    return null;
  }

  return (
    <div className="lists-filter-section">
      <h4>Lists</h4>
      <div className="lists-filter-list">
        {lists.map((list) => (
          <button
            key={list['List ID']}
            className={`list-filter-item ${selectedListId === list['List ID'] ? 'active' : ''}`}
            onClick={() => handleListSelect(list['List ID'])}
            title={list['Description'] || ''}
          >
            <span className="list-filter-name">{list['List Name']}</span>
            <span className="list-filter-count">{getListContactCount(list['List ID'])}</span>
          </button>
        ))}
      </div>
      {selectedListId && (
        <button className="btn btn-sm btn-ghost" onClick={() => handleListSelect(null)}>
          Clear Filter
        </button>
      )}
    </div>
  );
}

/**
 * Helper function to get count of contacts in a list
 */
function getListContactCount(listId) {
  const contactLists = getLocalContactLists();
  return contactLists.filter((cl) => cl['List ID'] === listId).length;
}

export default ListsFilter;
