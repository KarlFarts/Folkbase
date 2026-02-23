import React from 'react';

/**
 * Helper function to get CSS class for priority badge
 */
function getPriorityClass(priority) {
  switch (priority) {
    case 'Urgent':
      return 'urgent';
    case 'High':
      return 'high';
    case 'Medium':
      return 'medium';
    case 'Low':
      return 'low';
    default:
      return 'default';
  }
}

/**
 * Helper function to get CSS class for status badge
 */
function getStatusClass(status) {
  switch (status) {
    case 'Active':
      return 'active';
    case 'Inactive':
      return 'inactive';
    case 'Support':
      return 'support';
    case 'Undecided':
      return 'undecided';
    case 'Do Not Contact':
      return 'do-not-contact';
    default:
      return 'neutral';
  }
}

/**
 * Helper function to format date
 */
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * ContactTable Component
 * Displays contacts in a sortable table with essential columns
 */
function ContactTable({
  contacts,
  onContactClick,
  selectMode,
  selectedIds,
  onToggleSelect,
  sortBy,
  sortDirection,
  onSort,
}) {
  return (
    <div className="table-wrapper">
      <table className="contacts-table">
        <thead>
          <tr>
            {selectMode && <th className="checkbox-column"></th>}
            <th className="sortable-header" onClick={() => onSort('name')}>
              Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="sortable-header" onClick={() => onSort('priority')}>
              Priority {sortBy === 'priority' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="sortable-header" onClick={() => onSort('status')}>
              Status {sortBy === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="sortable-header" onClick={() => onSort('lastContact')}>
              Last Contact {sortBy === 'lastContact' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr
              key={contact['Contact ID']}
              className={selectedIds.has(contact['Contact ID']) ? 'selected' : ''}
              onClick={(e) => {
                if (selectMode) {
                  e?.stopPropagation?.();
                  onToggleSelect(contact['Contact ID']);
                } else {
                  onContactClick(contact);
                }
              }}
            >
              {selectMode && (
                <td
                  className="checkbox-cell"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(contact['Contact ID']);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact['Contact ID'])}
                    onChange={() => {}}
                  />
                </td>
              )}
              <td className="contact-name-cell">{contact['Name'] || 'Unnamed'}</td>
              <td>
                {contact['Priority'] && (
                  <span className={`badge badge-${getPriorityClass(contact['Priority'])}`}>
                    {contact['Priority']}
                  </span>
                )}
              </td>
              <td>
                {contact['Status'] && (
                  <span className={`badge badge-${getStatusClass(contact['Status'])}`}>
                    {contact['Status']}
                  </span>
                )}
              </td>
              <td className="date-cell">{formatDate(contact['Last Contact Date'])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ContactTable;
