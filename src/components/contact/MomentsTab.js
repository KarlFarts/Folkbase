import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_COLORS = {
  Vacation: 'badge-status-active',
  Trip: 'badge-priority-medium',
  'Family Event': 'badge-priority-low',
  Funeral: 'badge-priority-none',
  Celebration: 'badge-priority-high',
  Other: 'badge-status-inactive',
};

function formatDateRange(start, end) {
  if (!start) return null;
  if (!end) return start;
  return `${start} – ${end}`;
}

/**
 * MomentsTab - displays a contact's logged moments
 *
 * Props:
 *   moments         {array}
 *   allContacts     {array}
 *   currentContactId {string}
 *   canWrite        {boolean}
 *   onAdd           {function}
 *   onEdit          {function}  called with moment object
 *   onDelete        {function}  called with momentId
 */
export default function MomentsTab({
  moments,
  allContacts = [],
  canWrite,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const getContactName = (id) => {
    const c = allContacts.find((c) => c['Contact ID'] === id);
    return c ? c['Display Name'] || c['First Name'] || c.Name || id : id;
  };

  if (moments.length === 0) {
    return (
      <div className="card-body">
        <div className="empty-state">
          <p className="empty-state-title">No moments logged yet.</p>
          {canWrite && (
            <button className="btn btn-primary mt-md" onClick={onAdd}>
              Add Moment
            </button>
          )}
        </div>
      </div>
    );
  }

  const sorted = [...moments].sort(
    (a, b) => (b['Start Date'] || '').localeCompare(a['Start Date'] || '')
  );

  return (
    <div className="card-body">
      {canWrite && (
        <div className="moments-header">
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            Add Moment
          </button>
        </div>
      )}

      <div className="moments-list">
        {sorted.map((moment) => {
          const isExpanded = expandedId === moment['Moment ID'];
          const taggedIds = (moment['Contact IDs'] || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          const dateRange = formatDateRange(moment['Start Date'], moment['End Date']);

          return (
            <div key={moment['Moment ID']} className="moment-card">
              <div
                className="moment-card-header"
                onClick={() => setExpandedId(isExpanded ? null : moment['Moment ID'])}
              >
                <div className="moment-card-meta">
                  <span className="moment-title">{moment.Title || '(Untitled)'}</span>
                  {moment.Type && (
                    <span className={`badge ${TYPE_COLORS[moment.Type] || 'badge-status-inactive'}`}>
                      {moment.Type}
                    </span>
                  )}
                  {dateRange && <span className="moment-date">{dateRange}</span>}
                  {moment.Location && (
                    <span className="moment-location">{moment.Location}</span>
                  )}
                </div>
                <span className="moment-expand-icon">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>

              {isExpanded && (
                <div className="moment-card-body">
                  {moment.Notes && <p className="moment-notes">{moment.Notes}</p>}

                  {taggedIds.length > 0 && (
                    <div className="moment-people">
                      <span className="moment-people-label">People:</span>
                      {taggedIds.map((id) => (
                        <span key={id} className="moment-chip moment-chip--readonly">
                          {getContactName(id)}
                        </span>
                      ))}
                    </div>
                  )}

                  {canWrite && (
                    <div className="moment-card-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onEdit(moment)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm moment-delete-btn"
                        onClick={() => onDelete(moment['Moment ID'])}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
