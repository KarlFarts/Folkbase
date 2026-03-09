import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Folder, Users, MailOpen, User, Shield, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useConfig } from '../contexts/ConfigContext';
import WorkspaceInvitationGenerator from '../components/WorkspaceInvitationGenerator';
import {
  createSubWorkspace,
  createRootWorkspace,
  getWorkspaceById,
} from '../services/workspaceHierarchyServiceSheets';
import {
  readSheetData,
  addContact,
  createWorkspaceSheetWrapped,
  SHEETS,
} from '../utils/devModeWrapper';

const CreateWorkspace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, accessToken } = useAuth();
  const { config } = useConfig();
  const { reloadWorkspaces, switchToWorkspace } = useWorkspace();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    defaultRole: 'editor',
    defaultOverrides: [],
    invitationExpiry: '30',
    importContacts: false,
    selectedContacts: [],
    fieldScope: 'core', // 'core' or 'all'
    listFilter: '', // List ID to filter by, '' = all contacts
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdWorkspace, setCreatedWorkspace] = useState(null);
  const [copiedContactCount, setCopiedContactCount] = useState(0);
  const [copyFailedCount, setCopyFailedCount] = useState(0);
  const [parentWorkspace, setParentWorkspace] = useState(null);
  const [loadingParent, setLoadingParent] = useState(false);
  const [personalContacts, setPersonalContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactLists, setContactLists] = useState([]);
  const [contactListMemberships, setContactListMemberships] = useState([]);

  const steps = [
    { number: 1, title: 'Details', description: 'Name & description' },
    { number: 2, title: 'Contacts', description: 'Copy from personal' },
    { number: 3, title: 'Team', description: 'Permissions & invite' },
  ];

  useEffect(() => {
    const parentId = searchParams.get('parent');
    if (parentId) {
      loadParentWorkspace(parentId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Load contacts and lists when entering Step 2
  useEffect(() => {
    if (currentStep === 2 && config?.personalSheetId && accessToken) {
      loadPersonalContacts();
      const loadLists = async () => {
        try {
          const [listsResult, membershipsResult] = await Promise.all([
            readSheetData(accessToken, config.personalSheetId, SHEETS.LISTS),
            readSheetData(accessToken, config.personalSheetId, SHEETS.CONTACT_LISTS),
          ]);
          setContactLists(listsResult.data || []);
          setContactListMemberships(membershipsResult.data || []);
        } catch (err) {
          console.error('Failed to load lists:', err);
          setError('Couldn\'t load your contact lists — list filtering is unavailable. You can still select contacts manually.');
        }
      };
      loadLists();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, config?.personalSheetId, accessToken]);

  const filteredContacts = useMemo(() => {
    if (!formData.listFilter) return personalContacts;
    const contactIdsInList = new Set(
      contactListMemberships
        .filter((m) => m['List ID'] === formData.listFilter)
        .map((m) => m['Contact ID'])
    );
    return personalContacts.filter((c) => contactIdsInList.has(c['Contact ID']));
  }, [personalContacts, formData.listFilter, contactListMemberships]);

  const loadParentWorkspace = async (parentId) => {
    setLoadingParent(true);
    try {
      const parent = await getWorkspaceById(accessToken, config?.personalSheetId, parentId);
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

  const updateFormData = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    updateFormData(name, value);
  };

  const toggleContactSelection = (contactId) => {
    setFormData((prev) => {
      const selected = prev.selectedContacts.includes(contactId)
        ? prev.selectedContacts.filter((id) => id !== contactId)
        : [...prev.selectedContacts, contactId];
      return { ...prev, selectedContacts: selected };
    });
  };

  const handleToggleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      selectedContacts:
        prev.selectedContacts.length === filteredContacts.length
          ? []
          : filteredContacts.map((c) => c['Contact ID']),
    }));
  };

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

    setLoading(true);
    setError('');

    try {
      // 1. Auto-create a new Google Sheet for this workspace
      const { sheetId: newSheetId } = await createWorkspaceSheetWrapped(
        accessToken,
        formData.name
      );

      const workspaceData = {
        name: formData.name,
        description: formData.description || '',
        owner_email: user.email,
        sheet_id: newSheetId,
        status: 'active',
        default_role: formData.defaultRole,
        default_overrides:
          formData.defaultRole === 'viewer'
            ? formData.defaultOverrides.map((f) => `${f}:write`).join(',')
            : '',
        invitation_expiry_days: parseInt(formData.invitationExpiry),
      };

      let workspaceId;
      let token;

      if (parentWorkspace) {
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

      // 2. Copy contacts (plain copy, no sync links)
      let copiedCount = 0;
      let copyFailedCount = 0;
      if (formData.importContacts && formData.selectedContacts.length > 0) {
        const CORE_FIELDS = [
          'Contact ID',
          'First Name',
          'Last Name',
          'Display Name',
          'Phone Mobile',
          'Email Personal',
          'Date Added',
        ];

        for (const contactId of formData.selectedContacts) {
          try {
            const source = personalContacts.find((c) => c['Contact ID'] === contactId);
            if (!source) continue;

            let contactData;
            if (formData.fieldScope === 'core') {
              contactData = {};
              for (const field of CORE_FIELDS) {
                if (source[field]) contactData[field] = source[field];
              }
            } else {
              contactData = { ...source };
              delete contactData['Private Notes'];
              delete contactData['Personal Tags'];
            }

            contactData['Source Type'] = 'copied_from_personal';
            contactData['Source Contact ID'] = contactId;
            contactData['Date Added'] = new Date().toISOString();

            await addContact(accessToken, newSheetId, contactData, user.email);
            copiedCount++;
          } catch (err) {
            console.error(`Failed to copy contact ${contactId}:`, err);
            copyFailedCount++;
          }
        }
      }

      setCopiedContactCount(copiedCount);
      setCopyFailedCount(copyFailedCount);
      await reloadWorkspaces();
      switchToWorkspace(newWorkspace);
      setCurrentStep(4); // Success screen
    } catch (err) {
      console.error('Workspace creation error:', err);
      setError('Failed to create workspace. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

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
              <h2>Copy Contacts</h2>
              <p className="wizard-step-description">
                Optionally start your workspace with contacts from your personal sheet. Only contact
                info is copied -- notes, touchpoints, and personal data stay private.
              </p>
            </div>

            <div className="wizard-form-section">
              <label className="wizard-checkbox-card">
                <input
                  type="checkbox"
                  checked={formData.importContacts}
                  onChange={(e) => updateFormData('importContacts', e.target.checked)}
                />
                <div className="wizard-checkbox-card-content">
                  <span className="wizard-checkbox-card-icon">
                    <Users size={16} />
                  </span>
                  <div>
                    <strong>Copy contacts from my personal workspace</strong>
                    <p>Selected contacts will be copied as independent records.</p>
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
                    {/* List filter */}
                    <div className="wizard-form-section">
                      <label className="wizard-label">Filter by list</label>
                      <select
                        className="wizard-select"
                        value={formData.listFilter}
                        onChange={(e) => updateFormData('listFilter', e.target.value)}
                      >
                        <option value="">All Contacts ({personalContacts.length})</option>
                        {contactLists.map((list) => (
                          <option key={list['List ID']} value={list['List ID']}>
                            {list['List Name']}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Field scope toggle */}
                    <div className="wizard-form-section">
                      <label className="wizard-label">Fields to copy</label>
                      <div className="wizard-card-options wizard-card-options--row">
                        <div
                          className={`wizard-card-option ${formData.fieldScope === 'core' ? 'selected' : ''}`}
                          onClick={() => updateFormData('fieldScope', 'core')}
                        >
                          <strong>Core Fields Only</strong>
                          <p>Name, Phone, Email</p>
                        </div>
                        <div
                          className={`wizard-card-option ${formData.fieldScope === 'all' ? 'selected' : ''}`}
                          onClick={() => updateFormData('fieldScope', 'all')}
                        >
                          <strong>All Fields</strong>
                          <p>All contact info (excludes private notes)</p>
                        </div>
                      </div>
                    </div>

                    {/* Select/Deselect + count */}
                    <div className="wizard-contact-toolbar">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleToggleSelectAll}
                      >
                        {formData.selectedContacts.length === filteredContacts.length
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                      <span className="wizard-contact-count">
                        {formData.selectedContacts.length} of {filteredContacts.length} contacts
                        selected
                      </span>
                    </div>

                    {/* Contact list */}
                    <div className="wizard-contact-list">
                      {filteredContacts.length === 0 ? (
                        <div className="wizard-empty-state">
                          <span className="wizard-empty-icon">
                            <MailOpen size={16} />
                          </span>
                          <p>No contacts found</p>
                        </div>
                      ) : (
                        filteredContacts.map((contact) => (
                          <label
                            key={contact['Contact ID']}
                            className={`wizard-contact-item ${
                              formData.selectedContacts.includes(contact['Contact ID'])
                                ? 'selected'
                                : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={formData.selectedContacts.includes(contact['Contact ID'])}
                              onChange={() => toggleContactSelection(contact['Contact ID'])}
                            />
                            <div className="wizard-contact-avatar">
                              {(
                                contact['Display Name'] ||
                                contact['First Name'] ||
                                '?'
                              )[0].toUpperCase()}
                            </div>
                            <div className="wizard-contact-info">
                              <span className="wizard-contact-name">
                                {contact['Display Name'] ||
                                  `${contact['First Name'] || ''} ${contact['Last Name'] || ''}`.trim() ||
                                  'Unknown'}
                              </span>
                              <span className="wizard-contact-detail">
                                {contact['Email Personal'] ||
                                  contact['Phone Mobile'] ||
                                  'No contact info'}
                              </span>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {error && <div className="wizard-error">{error}</div>}

            <div className="wizard-actions">
              <button onClick={() => setCurrentStep(1)} className="btn btn-secondary">
                Back
              </button>
              <button onClick={() => setCurrentStep(3)} className="btn btn-primary">
                Continue
              </button>
            </div>
          </div>
        );

      case 3:
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
                    className={`wizard-card-option wizard-card-option-compact ${formData.defaultRole === 'editor' ? 'selected' : ''}`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        defaultRole: 'editor',
                        defaultOverrides: [],
                      }))
                    }
                  >
                    <div className="wizard-card-option-header">
                      <span className="wizard-card-option-icon">
                        <User size={16} />
                      </span>
                    </div>
                    <h4>Editor</h4>
                    <p>Can view and edit all content</p>
                  </div>

                  <div
                    className={`wizard-card-option wizard-card-option-compact ${formData.defaultRole === 'viewer' ? 'selected' : ''}`}
                    onClick={() => updateFormData('defaultRole', 'viewer')}
                  >
                    <div className="wizard-card-option-header">
                      <span className="wizard-card-option-icon">
                        <Shield size={16} />
                      </span>
                    </div>
                    <h4>Viewer</h4>
                    <p>Read-only access (override per feature below)</p>
                  </div>
                </div>

                {formData.defaultRole === 'viewer' && (
                  <div className="wizard-overrides-section">
                    <p className="wizard-overrides-label">Allow viewers to write to:</p>
                    <div className="wizard-overrides-checks">
                      {['contacts', 'touchpoints', 'notes', 'events', 'tasks'].map((feature) => (
                        <label key={feature} className="wizard-override-check">
                          <input
                            type="checkbox"
                            checked={formData.defaultOverrides.includes(feature)}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                defaultOverrides: e.target.checked
                                  ? [...prev.defaultOverrides, feature]
                                  : prev.defaultOverrides.filter((f) => f !== feature),
                              }));
                            }}
                          />
                          {feature.charAt(0).toUpperCase() + feature.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
                  <span className="wizard-summary-value">New Google Sheet (auto-created)</span>
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
              <button onClick={() => setCurrentStep(2)} className="btn btn-secondary">
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

      case 4:
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
              {formData.importContacts && copiedContactCount > 0 && (
                <p className="wizard-success-detail">
                  {copiedContactCount} contact{copiedContactCount > 1 ? 's' : ''} copied
                  successfully
                </p>
              )}
              {copyFailedCount > 0 && (
                <p className="wizard-success-detail" style={{ color: 'var(--color-warning)' }}>
                  {copyFailedCount} contact{copyFailedCount !== 1 ? 's' : ''} couldn&apos;t be
                  copied — you can add them manually from the workspace.
                </p>
              )}
            </div>

            <div className="wizard-invitation-section">
              <h3>Invite Team Members</h3>
              <p>Share this link with people you want to join your workspace:</p>
              {createdWorkspace && (
                <WorkspaceInvitationGenerator
                  workspace={createdWorkspace}
                  token={createdWorkspace.invitation_token}
                  sheetId={config.personalSheetId}
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

        {currentStep < 4 && renderStepProgress()}

        <div className="wizard-content">{renderStep()}</div>
      </div>
    </div>
  );
};

export default CreateWorkspace;
