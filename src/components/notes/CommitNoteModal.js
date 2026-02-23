import { error as logError } from '../../utils/logger';
import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import LinkEntitiesModal from './LinkEntitiesModal';
import WindowTemplate from '../WindowTemplate';

/**
 * CommitNoteModal Component
 *
 * A 3-step wizard modal for committing notes (marking as Processed with proper categorization).
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Object} props.note - The note being committed
 * @param {Function} props.onCommit - Callback with { noteUpdates: {...}, entityLinks: {...} }
 * @param {Object} props.preselectedEntities - Optional pre-selected entities from braindump
 */
export default function CommitNoteModal({
  isOpen,
  onClose,
  note,
  onCommit,
  preselectedEntities = {},
}) {
  // Step tracking (1, 2, or 3)
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Note content and metadata
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('');
  const [tags, setTags] = useState('');

  // Step 2: Entity links
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [selectedEventIds, setSelectedEventIds] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [showLinkEntitiesModal, setShowLinkEntitiesModal] = useState(false);

  // Step 3: Visibility
  const [visibility, setVisibility] = useState('Workspace-Wide');
  const [sharedWith, setSharedWith] = useState('');

  // Loading state
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState('');

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && note) {
      setContent(note.Content || '');
      setNoteType(note['Note Type'] || '');
      setTags(note.Tags || '');
      setVisibility(note.Visibility || 'Workspace-Wide');
      setSharedWith(note['Shared With'] || '');
      setCurrentStep(1);
      setError('');

      // Initialize preselected entities
      if (preselectedEntities) {
        setSelectedContactIds(preselectedEntities.contacts || []);
        setSelectedEventIds(preselectedEntities.events || []);
        setSelectedListIds(preselectedEntities.lists || []);
        setSelectedTaskIds(preselectedEntities.tasks || []);
      }
    }
  }, [isOpen, note, preselectedEntities]);

  // Validation for Step 1
  const validateStep1 = () => {
    if (!content.trim()) {
      setError('Note content cannot be empty');
      return false;
    }
    if (!noteType) {
      setError('Please select a note type');
      return false;
    }
    setError('');
    return true;
  };

  // Validation for Step 3
  const validateStep3 = () => {
    if (visibility === 'Shared' && !sharedWith.trim()) {
      setError('Please enter email addresses for sharing');
      return false;
    }
    setError('');
    return true;
  };

  // Step navigation handlers
  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipEntityLinking = () => {
    setCurrentStep(3);
  };

  // Handle entity link modal save
  const handleEntityLinkSave = (entityLinks) => {
    setSelectedContactIds(entityLinks.contactIds || []);
    setSelectedEventIds(entityLinks.eventIds || []);
    setSelectedListIds(entityLinks.listIds || []);
    setSelectedTaskIds(entityLinks.taskIds || []);
    setShowLinkEntitiesModal(false);
  };

  // Final commit handler
  const handleCommit = async () => {
    if (!validateStep3()) {
      return;
    }

    setIsCommitting(true);
    setError('');

    try {
      const noteUpdates = {
        Content: content,
        'Note Type': noteType,
        Tags: tags,
        Status: 'Processed',
        Visibility: visibility,
        'Shared With': visibility === 'Shared' ? sharedWith : '',
      };

      const entityLinks = {
        contactIds: selectedContactIds,
        eventIds: selectedEventIds,
        listIds: selectedListIds,
        taskIds: selectedTaskIds,
      };

      await onCommit({ noteUpdates, entityLinks });

      // Reset form and close
      resetForm();
      onClose();
    } catch (err) {
      logError('Error committing note:', err);
      setError(err.message || 'Failed to commit note. Please try again.');
    } finally {
      setIsCommitting(false);
    }
  };

  const resetForm = () => {
    setContent('');
    setNoteType('');
    setTags('');
    setVisibility('Workspace-Wide');
    setSharedWith('');
    setSelectedContactIds([]);
    setSelectedEventIds([]);
    setSelectedListIds([]);
    setSelectedTaskIds([]);
    setCurrentStep(1);
    setError('');
  };

  const handleClose = () => {
    if (!isCommitting) {
      resetForm();
      onClose();
    }
  };

  const totalEntitiesSelected =
    selectedContactIds.length +
    selectedEventIds.length +
    selectedListIds.length +
    selectedTaskIds.length;

  const renderFooter = () => {
    if (currentStep === 1) {
      return (
        <>
          <button className="btn btn-secondary" onClick={handleClose} disabled={isCommitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleNext} disabled={isCommitting}>
            Next
          </button>
        </>
      );
    }

    if (currentStep === 2) {
      return (
        <>
          <button className="btn btn-secondary" onClick={handleBack} disabled={isCommitting}>
            Back
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleSkipEntityLinking}
            disabled={isCommitting}
          >
            Skip
          </button>
          <button className="btn btn-primary" onClick={handleNext} disabled={isCommitting}>
            Next
          </button>
        </>
      );
    }

    return (
      <>
        <button className="btn btn-secondary" onClick={handleBack} disabled={isCommitting}>
          Back
        </button>
        <button className="btn btn-primary" onClick={handleCommit} disabled={isCommitting}>
          {isCommitting ? 'Committing...' : 'Commit Note'}
        </button>
      </>
    );
  };

  return (
    <>
      <WindowTemplate
        isOpen={isOpen}
        onClose={handleClose}
        title={`Commit Note - Step ${currentStep}/3`}
        size="lg"
        footer={renderFooter()}
      >
        {/* Progress Indicator */}
        <div
          style={{
            padding: 'var(--spacing-sm) 0',
            marginBottom: 'var(--spacing-md)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
            {[1, 2, 3].map((step) => (
              <React.Fragment key={step}>
                <div
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background:
                      currentStep >= step
                        ? 'var(--color-accent-primary)'
                        : 'var(--color-border)',
                  }}
                />
                {step < 3 && (
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background:
                        currentStep > step
                          ? 'var(--color-accent-primary)'
                          : 'var(--color-border)',
                      color: currentStep > step ? 'white' : 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    {currentStep > step ? <Check size={14} /> : step + 1}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 'var(--spacing-xs)',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                color:
                  currentStep === 1 ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
              }}
            >
              Review Content
            </span>
            <span
              style={{
                fontSize: '13px',
                color:
                  currentStep === 2 ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
              }}
            >
              Link Entities
            </span>
            <span
              style={{
                fontSize: '13px',
                color:
                  currentStep === 3 ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)',
              }}
            >
              Set Visibility
            </span>
          </div>
        </div>

        {note && (
          <div
            style={{
              marginBottom: 'var(--spacing-lg)',
              padding: 'var(--spacing-sm)',
              background: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Note ID: <strong>{note['Note ID']}</strong>
            </p>
          </div>
        )}

        {/* Step 1: Review Content */}
        {currentStep === 1 && (
          <div>
            <div className="form-group">
              <label className="form-label">Note Content</label>
              <textarea
                className="form-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isCommitting}
                rows={6}
                placeholder="Enter note content..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Note Type *</label>
              <select
                className="form-select"
                value={noteType}
                onChange={(e) => setNoteType(e.target.value)}
                disabled={isCommitting}
              >
                <option value="">Select type...</option>
                <option value="Meeting">Meeting</option>
                <option value="Phone Call">Phone Call</option>
                <option value="Email">Email</option>
                <option value="Task">Task</option>
                <option value="General">General</option>
                <option value="Idea">Idea</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={isCommitting}
                placeholder="e.g. important, urgent, follow-up"
              />
            </div>
          </div>
        )}

        {/* Step 2: Link Entities */}
        {currentStep === 2 && (
          <div>
            <div
              style={{
                padding: 'var(--spacing-md)',
                background: 'var(--color-bg-secondary)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
              }}
            >
              <p
                style={{
                  margin: '0 0 var(--spacing-sm) 0',
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Link this note to contacts, events, lists, or tasks for better organization.
              </p>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    Contacts:{' '}
                  </span>
                  <strong>{selectedContactIds.length}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    Events:{' '}
                  </span>
                  <strong>{selectedEventIds.length}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    Lists:{' '}
                  </span>
                  <strong>{selectedListIds.length}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    Tasks:{' '}
                  </span>
                  <strong>{selectedTaskIds.length}</strong>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowLinkEntitiesModal(true)}
              disabled={isCommitting}
              style={{ width: '100%' }}
            >
              {totalEntitiesSelected > 0 ? 'Edit Entity Links' : 'Add Entity Links'}
            </button>

            {totalEntitiesSelected > 0 && (
              <div className="alert alert-success" style={{ marginTop: 'var(--spacing-md)' }}>
                {totalEntitiesSelected} entit{totalEntitiesSelected === 1 ? 'y' : 'ies'} selected
              </div>
            )}
          </div>
        )}

        {/* Step 3: Set Visibility */}
        {currentStep === 3 && (
          <div>
            <div className="form-group">
              <label className="form-label">Visibility</label>

              {['Private', 'Shared', 'Workspace-Wide'].map((option) => (
                <label
                  key={option}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-xs)',
                    cursor: 'pointer',
                    background:
                      visibility === option
                        ? 'var(--color-accent-secondary, #f0f8ff)'
                        : 'var(--color-bg-primary)',
                  }}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={option}
                    checked={visibility === option}
                    onChange={(e) => setVisibility(e.target.value)}
                    disabled={isCommitting}
                  />
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{option}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {option === 'Private' && 'Only you can see this note'}
                      {option === 'Shared' && 'Share with specific people'}
                      {option === 'Workspace-Wide' && 'Everyone in the workspace can see this'}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {visibility === 'Shared' && (
              <div className="form-group">
                <label className="form-label">Shared With (email addresses) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={sharedWith}
                  onChange={(e) => setSharedWith(e.target.value)}
                  disabled={isCommitting}
                  placeholder="e.g. user1@example.com, user2@example.com"
                />
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    marginTop: 'var(--spacing-xs)',
                  }}
                >
                  Separate multiple email addresses with commas
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger" style={{ marginTop: 'var(--spacing-md)' }}>
            {error}
          </div>
        )}
      </WindowTemplate>

      {/* Link Entities Modal */}
      {showLinkEntitiesModal && (
        <LinkEntitiesModal
          isOpen={showLinkEntitiesModal}
          onClose={() => setShowLinkEntitiesModal(false)}
          note={note}
          onSave={handleEntityLinkSave}
          existingLinks={{
            contacts: selectedContactIds,
            events: selectedEventIds,
            lists: selectedListIds,
            tasks: selectedTaskIds,
          }}
        />
      )}
    </>
  );
}
