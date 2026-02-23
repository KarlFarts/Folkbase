import React from 'react';
import { TimelineContainer } from '../TimelineItem';
import NotesDisplaySection from '../notes/NotesDisplaySection';

/**
 * TouchpointHistoryCard - Displays touchpoint history in timeline format
 */
export function TouchpointHistoryCard({
  touchpoints,
  onLogTouchpoint,
  onTouchpointClick,
  maxHeight,
}) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div className="card-header">
        <h3>Touchpoint History</h3>
        <span className="badge" style={{ background: 'var(--color-bg-elevated)' }}>
          {touchpoints.length}
        </span>
      </div>
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
          <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            <p
              className="text-muted"
              style={{ fontStyle: 'italic', marginBottom: 'var(--spacing-md)' }}
            >
              No touchpoints logged yet
            </p>
            <button className="btn btn-primary btn-sm" onClick={onLogTouchpoint}>
              Log First Touchpoint
            </button>
          </div>
        ) : (
          <TimelineContainer
            touchpoints={touchpoints}
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
export function NotesCard({ notes, contactId, onNavigate }) {
  const handleAddNote = () => {
    // Navigate to notes page where user can create a note and link it
    onNavigate('notes');
  };

  return (
    <div className="card">
      <div className="card-body" style={{ padding: 0 }}>
        <NotesDisplaySection
          notes={notes || []}
          entityType="contact"
          entityId={contactId}
          onAddNote={handleAddNote}
          canEdit={true}
          showAddButton={true}
          showLinkedEntities={true}
        />
      </div>
    </div>
  );
}
