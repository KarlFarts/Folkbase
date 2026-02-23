import React, { useState, useMemo } from 'react';

/**
 * Sort icon component for table headers
 */
const SortIcon = ({ field, sortField, sortDirection }) => {
  if (sortField !== field) return null;
  return (
    <span style={{ marginLeft: '4px', fontSize: '12px' }}>
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  );
};

/**
 * RelationshipList Component
 *
 * Table view displaying all relationships for a contact.
 * Shows contact name, type, subtype, strength, date, and actions.
 *
 * @param {Object} props
 * @param {string} props.sourceContactId - ID of the primary contact
 * @param {Array} props.relationships - Array of relationship objects
 * @param {Array} props.contacts - Array of all contacts (for name lookup)
 * @param {Function} props.onEdit - Callback when edit button is clicked
 * @param {Function} props.onDelete - Callback when delete button is clicked
 * @param {Function} props.onContactClick - Callback when contact name is clicked
 */
export default function RelationshipList({
  sourceContactId,
  relationships,
  contacts,
  onEdit,
  onDelete,
  onContactClick,
}) {
  const [sortField, setSortField] = useState('Relationship Type');
  const [sortDirection, setSortDirection] = useState('asc');

  // Create contact lookup map
  const contactMap = useMemo(() => {
    return new Map(contacts.map((c) => [c['Contact ID'], c]));
  }, [contacts]);

  // Get the other contact in each relationship
  const enrichedRelationships = useMemo(() => {
    return relationships.map((rel) => {
      const isSource = rel['Source Contact ID'] === sourceContactId;
      const otherContactId = isSource
        ? rel['Target Contact ID']
        : rel['Source Contact ID'];
      const otherContact = contactMap.get(otherContactId);

      return {
        ...rel,
        isSource,
        otherContactId,
        otherContactName: otherContact?.Name || otherContactId,
        otherContactOrganization: otherContact?.Organization || '',
      };
    });
  }, [relationships, sourceContactId, contactMap]);

  // Sort relationships
  const sortedRelationships = useMemo(() => {
    const sorted = [...enrichedRelationships];

    sorted.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      // Special handling for contact names
      if (sortField === 'Contact') {
        aVal = a.otherContactName;
        bVal = b.otherContactName;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [enrichedRelationships, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (!relationships || relationships.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          border: '1px solid var(--border-color-default)',
          borderRadius: '8px',
          background: 'var(--color-background-secondary, #f7f3ef)',
        }}
      >
        <p style={{ fontSize: '16px', marginBottom: '8px' }}>No relationships yet</p>
        <p style={{ fontSize: '14px' }}>Click "Add Relationship" to get started</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid var(--border-color-default)',
        }}
      >
        <thead>
          <tr style={{ background: 'var(--color-background-secondary, #f7f3ef)' }}>
            <th
              onClick={() => handleSort('Contact')}
              style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: '600',
                borderBottom: '2px solid var(--border-color-default)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Contact <SortIcon field="Contact" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th
              onClick={() => handleSort('Relationship Type')}
              style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: '600',
                borderBottom: '2px solid var(--border-color-default)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Type <SortIcon field="Relationship Type" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th
              onClick={() => handleSort('Relationship Subtype')}
              style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: '600',
                borderBottom: '2px solid var(--border-color-default)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Relationship <SortIcon field="Relationship Subtype" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th
              onClick={() => handleSort('Strength')}
              style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: '600',
                borderBottom: '2px solid var(--border-color-default)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Strength <SortIcon field="Strength" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th
              onClick={() => handleSort('Date Established')}
              style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: '600',
                borderBottom: '2px solid var(--border-color-default)',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Date <SortIcon field="Date Established" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th
              style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: '600',
                borderBottom: '2px solid var(--border-color-default)',
              }}
            >
              Direction
            </th>
            <th
              style={{
                padding: '12px',
                textAlign: 'right',
                fontWeight: '600',
                borderBottom: '2px solid var(--border-color-default)',
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRelationships.map((rel, index) => (
            <tr
              key={`${rel['Relationship ID']}-${index}`}
              style={{
                borderBottom: '1px solid var(--border-color-default)',
                background: index % 2 === 0 ? 'white' : 'var(--color-background-secondary, #f7f3ef)',
              }}
            >
              <td style={{ padding: '12px' }}>
                <div>
                  <button
                    onClick={() => onContactClick && onContactClick(rel.otherContactId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-accent-primary, #c2703e)',
                      cursor: 'pointer',
                      fontWeight: '500',
                      textDecoration: 'underline',
                      padding: 0,
                      fontSize: 'inherit',
                    }}
                  >
                    {rel.otherContactName}
                  </button>
                  {rel.otherContactOrganization && (
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {rel.otherContactOrganization}
                    </div>
                  )}
                </div>
              </td>
              <td style={{ padding: '12px' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: getTypeColor(rel['Relationship Type']),
                    color: 'white',
                  }}
                >
                  {rel['Relationship Type']}
                </span>
              </td>
              <td style={{ padding: '12px' }}>{rel['Relationship Subtype'] || '-'}</td>
              <td style={{ padding: '12px' }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    background: getStrengthColor(rel['Strength']),
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {rel['Strength'] || '-'}
                </span>
              </td>
              <td style={{ padding: '12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                {rel['Date Established'] || '-'}
              </td>
              <td style={{ padding: '12px', fontSize: '14px' }}>
                {rel['Is Directional'] === 'FALSE' || rel['Is Directional'] === false
                  ? '↔'
                  : rel.isSource
                  ? '→'
                  : '←'}
              </td>
              <td style={{ padding: '12px', textAlign: 'right' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(rel)}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid var(--border-color-default)',
                        borderRadius: '4px',
                        background: 'var(--color-bg-primary)',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete relationship with ${rel.otherContactName}?`)) {
                          onDelete(rel['Relationship ID']);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        border: '1px solid var(--color-danger)',
                        borderRadius: '4px',
                        background: 'var(--color-bg-primary)',
                        color: 'var(--color-danger)',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Get background color for relationship type badge
 */
function getTypeColor(type) {
  const colors = {
    Familial: '#dc2626', // Danger red
    Professional: '#c2703e', // Terracotta
    Social: '#059669', // Success green
    Custom: '#7c6853', // Warm brown
  };
  return colors[type] || '#6b7280';
}

/**
 * Get background color for strength badge
 */
function getStrengthColor(strength) {
  const colors = {
    Strong: 'rgba(5, 150, 105, 0.15)', // Light green
    Good: 'rgba(194, 112, 62, 0.15)', // Light terracotta
    Developing: 'rgba(217, 119, 6, 0.15)', // Light amber
    New: '#f7f3ef', // Warm light gray
    Weak: 'rgba(220, 38, 38, 0.15)', // Light red
  };
  return colors[strength] || '#f7f3ef';
}
