import { useState, useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import EmptyState from './EmptyState';
import ConfirmDialog from './ConfirmDialog';

/**
 * Sort icon component for table headers
 */
const SortIcon = ({ field, sortField, sortDirection }) => {
  if (sortField !== field) return null;
  return (
    <span className="rl-sort-icon">
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
  const [confirmDeleteRel, setConfirmDeleteRel] = useState(null);

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
      <EmptyState compact icon={GitBranch} title="No relationships yet" />
    );
  }

  return (
    <div className="rl-wrap">
      <table className="rl-table">
        <thead>
          <tr className="rl-thead-row">
            <th className="rl-th rl-th--sortable" onClick={() => handleSort('Contact')}>
              Contact <SortIcon field="Contact" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th className="rl-th rl-th--sortable" onClick={() => handleSort('Relationship Type')}>
              Type <SortIcon field="Relationship Type" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th className="rl-th rl-th--sortable" onClick={() => handleSort('Relationship Subtype')}>
              Relationship <SortIcon field="Relationship Subtype" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th className="rl-th rl-th--sortable" onClick={() => handleSort('Strength')}>
              Strength <SortIcon field="Strength" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th className="rl-th rl-th--sortable" onClick={() => handleSort('Date Established')}>
              Date <SortIcon field="Date Established" sortField={sortField} sortDirection={sortDirection} />
            </th>
            <th className="rl-th">Direction</th>
            <th className="rl-th rl-th--right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedRelationships.map((rel, index) => (
            <tr
              key={`${rel['Relationship ID']}-${index}`}
              className={`rl-row ${index % 2 === 0 ? 'rl-row--even' : 'rl-row--odd'}`}
            >
              <td className="rl-td">
                <div>
                  <button
                    onClick={() => onContactClick && onContactClick(rel.otherContactId)}
                    className="rl-contact-link"
                  >
                    {rel.otherContactName}
                  </button>
                  {rel.otherContactOrganization && (
                    <div className="rl-contact-org">{rel.otherContactOrganization}</div>
                  )}
                </div>
              </td>
              <td className="rl-td">
                <span
                  className="rl-type-badge"
                  style={{ background: getTypeColor(rel['Relationship Type']) }}
                >
                  {rel['Relationship Type']}
                </span>
              </td>
              <td className="rl-td">{rel['Relationship Subtype'] || '-'}</td>
              <td className="rl-td">
                <span
                  className="rl-strength-badge"
                  style={{ background: getStrengthColor(rel['Strength']) }}
                >
                  {rel['Strength'] || '-'}
                </span>
              </td>
              <td className="rl-td rl-td--date">
                {rel['Date Established'] || '-'}
              </td>
              <td className="rl-td rl-td--direction">
                {rel['Is Directional'] === 'FALSE' || rel['Is Directional'] === false
                  ? '↔'
                  : rel.isSource
                  ? '→'
                  : '←'}
              </td>
              <td className="rl-td rl-td--actions">
                <div className="rl-actions">
                  {onEdit && (
                    <button onClick={() => onEdit(rel)} className="rl-btn-edit">
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => setConfirmDeleteRel({ id: rel['Relationship ID'], name: rel.otherContactName })}
                      className="rl-btn-delete"
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
      <ConfirmDialog
        isOpen={confirmDeleteRel !== null}
        onConfirm={() => { onDelete(confirmDeleteRel.id); setConfirmDeleteRel(null); }}
        onCancel={() => setConfirmDeleteRel(null)}
        title="Delete Relationship"
        message={confirmDeleteRel ? `Delete relationship with ${confirmDeleteRel.name}?` : ''}
        confirmLabel="Delete"
        variant="danger"
      />
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
