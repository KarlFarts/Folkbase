import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Folder,
  BarChart3,
  Lightbulb,
  FileText,
  Sparkles,
  Paperclip,
  Users,
  MailOpen,
  Link as LinkIcon,
  User,
  Shield,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useConfig } from '../contexts/ConfigContext';
import WorkspaceInvitationGenerator from '../components/WorkspaceInvitationGenerator';
import {
  createSubWorkspace,
  createRootWorkspace,
  getWorkspaceById,
} from '../services/workspaceHierarchyServiceSheets';
import { readSheetData, copyContactToWorkspace, SHEETS } from '../utils/devModeWrapper';

const CreateWorkspace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, accessToken } = useAuth();
  const { config } = useConfig();
  const { reloadWorkspaces, switchToWorkspace } = useWorkspace();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sheetOption: 'new',
    existingSheetId: '',
    defaultRole: 'member',
    invitationExpiry: '30',
    importContacts: false,
    selectedContacts: [],
    syncStrategy: 'core_fields_only',
    customFields: [],
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdWorkspace, setCreatedWorkspace] = useState(null);
  const [parentWorkspace, setParentWorkspace] = useState(null);
  const [loadingParent, setLoadingParent] = useState(false);
  const [personalContacts, setPersonalContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const steps = [
    { number: 1, title: 'Details', description: 'Details' },
    { number: 2, title: 'Data Storage', description: 'Google Sheet' },
    { number: 3, title: 'Contacts', description: 'Copy from personal' },
    { number: 4, title: 'Team', description: 'Invite members' },
  ];

  useEffect(() => {
    const parentId = searchParams.get('parent');
    if (parentId) {
      loadParentWorkspace(parentId);
    }
  }, [searchParams]);

  const loadParentWorkspace = async (parentId) => {
    setLoadingParent(true);
    try {
      const parent = await getWorkspaceById(parentId);
      if (parent) {
        setParentWorkspace(parent);
      } else {
        setError('Parent workspace not found');
      }
    } catch {
      setError('Failed to load parent workspace');
    } finally {
      setLoadingParent(false);
    }
  };

  const loadPersonalContacts = async () => {
    if (!accessToken || !config?.personalSheetId) {
      return;
    }

    setLoadingContacts(true);
    try {
      const { data: contacts } = await readSheetData(
        accessToken,
        config.personalSheetId,
        SHEETS.CONTACTS
      );
      setPersonalContacts(contacts || []);
    } catch {
      setError('Failed to load personal contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleContactToggle = (contactId) => {
    setFormData((prev) => {
      const selected = prev.selectedContacts.includes(contactId)
        ? prev.selectedContacts.filter((id) => id !== contactId)
        : [...prev.selectedContacts, contactId];
      return { ...prev, selectedContacts: selected };
    });
  };

  const handleSelectAllContacts = () => {
    setFormData((prev) => ({
      ...prev,
      selectedContacts:
        prev.selectedContacts.length === personalContacts.length
          ? []
          : personalContacts.map((c) => c['Contact ID']),
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Generate secure invitation token
  const generateInvitationToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const handleCreateWorkspace = async () => {
    if (!formData.name.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (formData.sheetOption === 'existing' && !formData.existingSheetId.trim()) {
      setError('Please provide a Sheet ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const workspaceData = {
        name: formData.name,
        description: formData.description || '',
        owner_email: user.email,
        sheet_id: formData.sheetOption === 'new' ? '' : formData.existingSheetId,
        status: 'active',
        default_role: formData.defaultRole,
        invitation_expiry_days: parseInt(formData.invitationExpiry),
      };

      let workspaceId;
      let token;

      // Check if this is a sub-workspace
      if (parentWorkspace) {
        // Create sub-workspace using hierarchy service
        const result = await createSubWorkspace(
          accessToken,
          parentWorkspace.sheet_id,
          parentWorkspace.id,
          workspaceData,
          user.email
        );
        workspaceId = result.id;
        token = generateInvitationToken();
      } else {
        // Create root workspace using Google Sheets
        const result = await createRootWorkspace(
          accessToken,
          config.personalSheetId,
          workspaceData,
          user.email
        );
        workspaceId = result.id;
        token = generateInvitationToken();
      }

      const newWorkspace = {
        id: workspaceId,
        ...workspaceData,
        parent_workspace_id: parentWorkspace?.id || null,
        invitation_token: token,
      };

      setCreatedWorkspace(newWorkspace);

      // Import contacts if requested
      if (
        formData.importContacts &&
        formData.selectedContacts.length > 0 &&
        workspaceData.sheet_id
      ) {
        const targetSheetId = workspaceData.sheet_id;

        for (const contactId of formData.selectedContacts) {
          try {
            const linkConfig = {
              createLink: true,
              syncStrategy: formData.syncStrategy,
              customFields: formData.customFields,
              sourceWorkspace: {
                type: 'personal',
                id: user.email,
                sheetId: config.personalSheetId,
                contactId: contactId,
              },
              targetWorkspace: {
                type: 'workspace',
                id: workspaceId,
                sheetId: targetSheetId,
                contactId: null, // Will be set after copy
              },
            };

            await copyContactToWorkspace(
              accessToken,
              config.personalSheetId,
              contactId,
              targetSheetId,
              user.email,
              linkConfig
            );
          } catch {
            // Continue with other contacts
          }
        }
      }

      // Reload workspaces and switch to the new one
      await reloadWorkspaces();
      switchToWorkspace(newWorkspace);

      setCurrentStep(5);
    } catch (err) {
      console.error('Workspace creation error:', err);
      setError(err.message || 'Failed to create workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Render the step progress indicator
  const renderStepProgress = () => (
    <div className="wizard-progress">
      {steps.map((step, index) => (
        <div
          key={step.number}
          className={`wizard-progress-step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
        >
          <div className="wizard-progress-indicator">
            <div className="wizard-progress-circle">
              {currentStep > step.number ? (
                <span className="wizard-progress-check">
                  <Check size={16} />
                </span>
              ) : (
                <span>{step.number}</span>
              )}
            </div>
            {index < steps.length - 1 && <div className="wizard-progress-line" />}
          </div>
          <div className="wizard-progress-label">
            <span className="wizard-progress-title">{step.title}</span>
            <span className="wizard-progress-description">{step.description}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="wizard-step-content">
            {loadingParent ? (
              <div className="wizard-loading">
                <div className="loading-spinner"></div>
                <p>Loading parent workspace...</p>
              </div>
            ) : (
              <>
                <div className="wizard-step-header">
                  <h2>{parentWorkspace ? 'Sub-Workspace Details' : 'Workspace Details'}</h2>
                  <p className="wizard-step-description">
                    Give your workspace a name and description to help team members understand its
                    purpose.
                  </p>
                </div>

                {parentWorkspace && (
                  <div className="wizard-info-banner wizard-info-banner-parent">
                    <div className="wizard-info-banner-icon">
                      <Folder size={16} />
                    </div>
                    <div className="wizard-info-banner-content">
                      <strong>Creating sub-workspace under:</strong>
                      <span>{parentWorkspace.name}</span>
                    </div>
                  </div>
                )}

                {/* Important info about workspaces and sheets */}
                <div className="wizard-info-banner wizard-info-banner-highlight">
                  <div className="wizard-info-banner-icon">
                    <BarChart3 size={16} />
                  </div>
                  <div className="wizard-info-banner-content">
                    <strong>How Workspaces Work</strong>
                    <span>
                      Each workspace has its own Google Sheet to store contacts. This makes it easy
                      to move people between workspaces and track who belongs to which effort.
                    </span>
                  </div>
                </div>

                <div className="wizard-form-section">
                  <div className="form-group">
                    <label htmlFor="name" className="wizard-label">
                      Workspace Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="wizard-input"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g., Q1 Outreach Team"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="description" className="wizard-label">
                      Description <span className="optional">(optional)</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      className="wizard-textarea"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Brief description of the workspace goals..."
                      rows="3"
                    />
                  </div>
                </div>

                {error && <div className="wizard-error">{error}</div>}
              </>
            )}

            {!loadingParent && (
              <div className="wizard-actions">
                <button onClick={() => navigate('/workspaces')} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="btn btn-primary"
                  disabled={!formData.name.trim()}
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="wizard-step-content">
            <div className="wizard-step-header">
              <h2>Data Storage</h2>
              <p className="wizard-step-description">
                Each workspace uses a dedicated Google Sheet to store contacts. This keeps your data
                organized and makes collaboration easy.
              </p>
            </div>

            {/* Key concept explanation */}
            <div className="wizard-info-banner wizard-info-banner-highlight">
              <div className="wizard-info-banner-icon">
                <Lightbulb size={16} />
              </div>
              <div className="wizard-info-banner-content">
                <strong>Why Separate Sheets?</strong>
                <span>
                  Having a dedicated sheet per workspace lets you easily move contacts between
                  workspaces, track workspace membership, and share access with team members without
                  exposing your personal contacts.
                </span>
              </div>
            </div>

            <div className="wizard-form-section">
              <label className="wizard-label">Choose your setup</label>
              <div className="wizard-card-options">
                <div
                  className={`wizard-card-option ${formData.sheetOption === 'new' ? 'selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, sheetOption: 'new' }))}
                >
                  <div className="wizard-card-option-header">
                    <span className="wizard-card-option-icon">
                      <Sparkles size={16} />
                    </span>
                    <span className="wizard-card-option-badge">Recommended</span>
                  </div>
                  <h4>Create New Sheet</h4>
                  <p>
                    We'll guide you through creating a new Google Sheet with the correct structure
                    for this workspace.
                  </p>
                  <ul className="wizard-card-option-features">
                    <li>Pre-configured columns for contacts</li>
                    <li>Workspace membership tracking built-in</li>
                    <li>Ready-to-use template</li>
                  </ul>
                </div>

                <div
                  className={`wizard-card-option ${formData.sheetOption === 'existing' ? 'selected' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, sheetOption: 'existing' }))}
                >
                  <div className="wizard-card-option-header">
                    <span className="wizard-card-option-icon">
                      <Paperclip size={16} />
                    </span>
                  </div>
                  <h4>Use Existing Sheet</h4>
                  <p>Connect to a Google Sheet you've already set up with your contacts.</p>
                  <ul className="wizard-card-option-features">
                    <li>Import existing data</li>
                    <li>Keep your current workflow</li>
                    <li>Requires correct format</li>
                  </ul>
                </div>
              </div>
            </div>

            {formData.sheetOption === 'existing' && (
              <div className="wizard-form-section wizard-form-section-nested">
                <div className="form-group">
                  <label htmlFor="existingSheetId" className="wizard-label">
                    Google Sheet ID
                  </label>
                  <input
                    type="text"
                    id="existingSheetId"
                    name="existingSheetId"
                    className="wizard-input"
                    value={formData.existingSheetId}
                    onChange={handleChange}
                    placeholder="Paste your Google Sheet ID here"
                  />
                  <p className="wizard-input-help">
                    Find your Sheet ID in the URL:{' '}
                    <code>
                      docs.google.com/spreadsheets/d/<strong>[SHEET_ID]</strong>/edit
                    </code>
                  </p>
                </div>
              </div>
            )}

            {formData.sheetOption === 'new' && (
              <div className="wizard-info-banner wizard-info-banner-note">
                <div className="wizard-info-banner-icon">
                  <FileText size={16} />
                </div>
                <div className="wizard-info-banner-content">
                  <strong>What happens next</strong>
                  <span>
                    After creating the workspace, you'll get step-by-step instructions to set up your
                    Google Sheet. The sheet will include a "Workspaces" column to track which
                    workspaces each contact belongs to.
                  </span>
                </div>
              </div>
            )}

            {error && <div className="wizard-error">{error}</div>}

            <div className="wizard-actions">
              <button onClick={() => setCurrentStep(1)} className="btn btn-secondary">
                Back
              </button>
              <button
                onClick={() => {
                  loadPersonalContacts();
                  setCurrentStep(3);
                }}
                className="btn btn-primary"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="wizard-step-content">
            <div className="wizard-step-header">
              <h2>Copy Contacts</h2>
              <p className="wizard-step-description">
                Start your workspace with contacts from your personal workspace. You can always add
                more contacts later.
              </p>
            </div>

            <div className="wizard-form-section">
              <label className="wizard-checkbox-card">
                <input
                  type="checkbox"
                  checked={formData.importContacts}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, importContacts: e.target.checked }));
                  }}
                />
                <div className="wizard-checkbox-card-content">
                  <span className="wizard-checkbox-card-icon">
                    <Users size={16} />
                  </span>
                  <div>
                    <strong>Copy contacts from my personal workspace</strong>
                    <p>Transfer selected contacts to this workspace's sheet</p>
                  </div>
                </div>
              </label>
            </div>

            {formData.importContacts && (
              <>
                {loadingContacts ? (
                  <div className="wizard-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading your contacts...</p>
                  </div>
                ) : (
                  <>
                    <div className="wizard-contact-list-header">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleSelectAllContacts}
                      >
                        {formData.selectedContacts.length === personalContacts.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                      <span className="wizard-contact-count">
                        <strong>{formData.selectedContacts.length}</strong> of{' '}
                        {personalContacts.length} contacts selected
                      </span>
                    </div>

                    <div className="wizard-contact-list">
                      {personalContacts.length === 0 ? (
                        <div className="wizard-empty-state">
                          <span className="wizard-empty-icon">
                            <MailOpen size={16} />
                          </span>
                          <p>No contacts in your personal workspace yet</p>
                        </div>
                      ) : (
                        personalContacts.map((contact) => (
                          <label key={contact['Contact ID']} className="wizard-contact-item">
                            <input
                              type="checkbox"
                              checked={formData.selectedContacts.includes(contact['Contact ID'])}
                              onChange={() => handleContactToggle(contact['Contact ID'])}
                            />
                            <div className="wizard-contact-avatar">
                              {(contact.Name || '?')[0].toUpperCase()}
                            </div>
                            <div className="wizard-contact-info">
                              <span className="wizard-contact-name">
                                {contact.Name || 'Unknown'}
                              </span>
                              <span className="wizard-contact-detail">
                                {contact.Email || contact.Phone || 'No contact info'}
                              </span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>

                    {formData.selectedContacts.length > 0 && (
                      <div className="wizard-form-section">
                        <label className="wizard-label">Sync Strategy</label>
                        <div className="wizard-card-options wizard-card-options-small">
                          <div
                            className={`wizard-card-option wizard-card-option-compact ${formData.syncStrategy === 'core_fields_only' ? 'selected' : ''}`}
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, syncStrategy: 'core_fields_only' }))
                            }
                          >
                            <h4>Core Fields Only</h4>
                            <p>Sync Name, Phone, and Email only</p>
                          </div>

                          <div
                            className={`wizard-card-option wizard-card-option-compact ${formData.syncStrategy === 'all_fields' ? 'selected' : ''}`}
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, syncStrategy: 'all_fields' }))
                            }
                          >
                            <h4>All Fields</h4>
                            <p>Sync all contact information</p>
                          </div>
                        </div>

                        <div className="wizard-info-banner wizard-info-banner-note">
                          <div className="wizard-info-banner-icon">
                            <LinkIcon size={16} />
                          </div>
                          <div className="wizard-info-banner-content">
                            <strong>Sync Link</strong>
                            <span>
                              Changes to synced fields will update in both your personal workspace
                              and this workspace.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {error && <div className="wizard-error">{error}</div>}

            <div className="wizard-actions">
              <button onClick={() => setCurrentStep(2)} className="btn btn-secondary">
                Back
              </button>
              <button onClick={() => setCurrentStep(4)} className="btn btn-primary">
                Continue
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="wizard-step-content">
            <div className="wizard-step-header">
              <h2>Team Settings</h2>
              <p className="wizard-step-description">
                Configure how team members can join and collaborate on this workspace.
              </p>
            </div>

            <div className="wizard-form-section">
              <div className="form-group">
                <label htmlFor="defaultRole" className="wizard-label">
                  Default Role for New Members
                </label>
                <div className="wizard-card-options wizard-card-options-small">
                  <div
                    className={`wizard-card-option wizard-card-option-compact ${formData.defaultRole === 'member' ? 'selected' : ''}`}
                    onClick={() => setFormData((prev) => ({ ...prev, defaultRole: 'member' }))}
                  >
                    <div className="wizard-card-option-header">
                      <span className="wizard-card-option-icon">
                        <User size={16} />
                      </span>
                    </div>
                    <h4>Member</h4>
                    <p>Can view and edit contacts</p>
                  </div>

                  <div
                    className={`wizard-card-option wizard-card-option-compact ${formData.defaultRole === 'admin' ? 'selected' : ''}`}
                    onClick={() => setFormData((prev) => ({ ...prev, defaultRole: 'admin' }))}
                  >
                    <div className="wizard-card-option-header">
                      <span className="wizard-card-option-icon">
                        <Shield size={16} />
                      </span>
                    </div>
                    <h4>Admin</h4>
                    <p>Can manage members and settings</p>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="invitationExpiry" className="wizard-label">
                  Invitation Link Expiry
                </label>
                <select
                  id="invitationExpiry"
                  name="invitationExpiry"
                  className="wizard-select"
                  value={formData.invitationExpiry}
                  onChange={handleChange}
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="never">Never expire</option>
                </select>
              </div>
            </div>

            {/* Summary before creation */}
            <div className="wizard-summary">
              <h3>Workspace Summary</h3>
              <div className="wizard-summary-grid">
                <div className="wizard-summary-item">
                  <span className="wizard-summary-label">Name</span>
                  <span className="wizard-summary-value">{formData.name}</span>
                </div>
                <div className="wizard-summary-item">
                  <span className="wizard-summary-label">Data Storage</span>
                  <span className="wizard-summary-value">
                    {formData.sheetOption === 'new' ? 'New Google Sheet' : 'Existing Sheet'}
                  </span>
                </div>
                <div className="wizard-summary-item">
                  <span className="wizard-summary-label">Copy Contacts</span>
                  <span className="wizard-summary-value">
                    {formData.importContacts
                      ? `${formData.selectedContacts.length} contacts`
                      : 'None'}
                  </span>
                </div>
              </div>
            </div>

            {error && <div className="wizard-error">{error}</div>}

            <div className="wizard-actions">
              <button onClick={() => setCurrentStep(3)} className="btn btn-secondary">
                Back
              </button>
              <button
                onClick={handleCreateWorkspace}
                className="btn btn-primary btn-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner-sm"></span>
                    Creating Workspace...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="wizard-step-content wizard-success">
            <div className="wizard-success-header">
              <div className="wizard-success-icon">
                <Check size={16} />
              </div>
              <h2>Workspace Created!</h2>
              <p className="wizard-success-subtitle">
                <strong>{createdWorkspace?.name}</strong> is ready to go
              </p>
              {formData.importContacts && formData.selectedContacts.length > 0 && (
                <p className="wizard-success-detail">
                  {formData.selectedContacts.length} contact
                  {formData.selectedContacts.length > 1 ? 's' : ''} copied successfully
                </p>
              )}
            </div>

            {formData.sheetOption === 'new' && (
              <div className="wizard-next-steps">
                <h3>Set Up Your Google Sheet</h3>
                <p className="wizard-next-steps-intro">
                  Follow these steps to connect your workspace to a Google Sheet:
                </p>
                <ol className="wizard-steps-list">
                  <li>
                    <span className="wizard-step-number">1</span>
                    <div>
                      <strong>Create a new Google Sheet</strong>
                      <p>Go to sheets.google.com and create a new spreadsheet</p>
                    </div>
                  </li>
                  <li>
                    <span className="wizard-step-number">2</span>
                    <div>
                      <strong>Add required tabs</strong>
                      <p>
                        Create sheets named: <code>Contacts</code>, <code>Touchpoints</code>,{' '}
                        <code>Audit_Log</code>
                      </p>
                    </div>
                  </li>
                  <li>
                    <span className="wizard-step-number">3</span>
                    <div>
                      <strong>Add a "Workspaces" column</strong>
                      <p>
                        In the Contacts sheet, add a column to track which workspaces each contact
                        belongs to
                      </p>
                    </div>
                  </li>
                  <li>
                    <span className="wizard-step-number">4</span>
                    <div>
                      <strong>Set sharing permissions</strong>
                      <p>Share with your team or set to "Anyone with the link can edit"</p>
                    </div>
                  </li>
                  <li>
                    <span className="wizard-step-number">5</span>
                    <div>
                      <strong>Connect to workspace</strong>
                      <p>Copy the Sheet ID from the URL and add it in workspace settings</p>
                    </div>
                  </li>
                </ol>
                <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
                  Go to Settings
                </button>
              </div>
            )}

            <div className="wizard-invitation-section">
              <h3>Invite Team Members</h3>
              <p>Share this link with people you want to join your workspace:</p>
              {createdWorkspace && (
                <WorkspaceInvitationGenerator
                  workspace={createdWorkspace}
                  token={createdWorkspace.invitation_token}
                />
              )}
            </div>

            <div className="wizard-actions wizard-actions-success">
              <button onClick={() => navigate('/workspaces')} className="btn btn-primary btn-lg">
                Go to Workspace Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <div className="wizard-container">
        <div className="wizard-header">
          <button onClick={() => navigate('/workspaces')} className="wizard-back-link">
            ← Back to Workspaces
          </button>
          <h1>{parentWorkspace ? 'Create Sub-Workspace' : 'Create New Workspace'}</h1>
        </div>

        {currentStep < 5 && renderStepProgress()}

        <div className="wizard-content">{renderStep()}</div>
      </div>
    </div>
  );
};

export default CreateWorkspace;
