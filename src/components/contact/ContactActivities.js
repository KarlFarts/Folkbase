import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import EmptyState from '../EmptyState';
import { TimelineContainer } from '../TimelineItem';
import NotesDisplaySection from '../notes/NotesDisplaySection';

const TOUCHPOINT_TYPES = ['Call', 'Text', 'Email', 'Meeting', 'Event', 'Other'];

/**
 * TouchpointHistoryCard - Displays touchpoint history in timeline format
 */
export function TouchpointHistoryCard({
  touchpoints,
  onLogTouchpoint,
  onTouchpointClick,
  maxHeight,
  canLog = true,
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
  };

  const filtered = useMemo(() => {
    return touchpoints.filter((tp) => {
      if (typeFilter && tp['Type'] !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (tp['Notes'] || '').toLowerCase().includes(q) ||
          (tp['Outcome'] || '').toLowerCase().includes(q) ||
          (tp['Type'] || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [touchpoints, search, typeFilter]);

  return (
    <div className="card ca-card-flex">
      <div className="card-header">
        <h3>Touchpoint History</h3>
        <span className="badge ca-count-badge">{touchpoints.length}</span>
      </div>

      {touchpoints.length > 0 && (
        <div className="ca-filters">
          <div className="ca-search-wrap">
            <Search size={13} className="ca-search-icon" />
            <input
              type="text"
              className="form-input ca-search-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select ca-type-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {TOUCHPOINT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className="card-body"
        style={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: maxHeight || '400px',
          paddingRight: 'var(--spacing-md)',
        }}
      >
        {touchpoints.length === 0 ? (
          <div className="ca-empty-state">
            <p className="text-muted ca-empty-text">No touchpoints logged yet</p>
            {canLog && (
              <button className="btn btn-primary btn-sm" onClick={onLogTouchpoint}>
                Log First Touchpoint
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            title="No matching touchpoints"
            description="Try adjusting your search or type filter."
            secondaryAction="Clear Filters"
            onSecondaryAction={clearFilters}
          />
        ) : (
          <TimelineContainer
            touchpoints={filtered}
            isClickable={!!onTouchpointClick}
            onItemClick={onTouchpointClick}
          />
        )}
      </div>
    </div>
  );
}

/**
 * NotesCard - Displays linked notes for a contact
 * Now uses NotesDisplaySection for consistent display across the app
 */
export function NotesCard({ notes, contactId, onAddNote, onNavigate, canEdit = true }) {
  const handleAddNote = onAddNote || (() => onNavigate('notes'));

  return (
    <div className="card">
      <div className="card-body ca-notes-body">
        <NotesDisplaySection
          notes={notes || []}
          entityType="contact"
          entityId={contactId}
          onAddNote={handleAddNote}
          canEdit={canEdit}
          showAddButton={canEdit}
          showLinkedEntities={true}
        />
      </div>
    </div>
  );
}
