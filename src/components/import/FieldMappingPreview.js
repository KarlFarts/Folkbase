import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useActiveSheetId } from '../../utils/sheetResolver';
import { listTemplates, loadTemplate, saveTemplate } from '../../services/importConfigService';

// Folkbase expected fields
const TOUCHPOINT_FIELDS = [
  'Name',
  'First Name',
  'Last Name',
  'Phone',
  'Email',
  'Organization',
  'Role',
  'Bio',
  'Tags',
  'Priority',
  'Status',
  'District',
];

// Common aliases for auto-mapping
const FIELD_ALIASES = {
  Name: ['Name', 'Full Name', 'FullName', 'Contact Name', 'Display Name'],
  'First Name': ['First Name', 'FirstName', 'First', 'Given Name', 'Forename'],
  'Last Name': ['Last Name', 'LastName', 'Last', 'Surname', 'Family Name'],
  Phone: ['Phone', 'Phone Number', 'Mobile', 'Cell', 'Telephone', 'Phone 1', 'Primary Phone'],
  Email: ['Email', 'Email Address', 'E-mail', 'E-Mail', 'Primary Email', 'Email 1'],
  Organization: ['Organization', 'Company', 'Org', 'Employer', 'Work'],
  Role: ['Role', 'Title', 'Job Title', 'Position', 'Job'],
  Bio: ['Bio', 'Notes', 'Description', 'Comments', 'About'],
  Tags: ['Tags', 'Categories', 'Groups', 'Labels'],
  Priority: ['Priority', 'Importance'],
  Status: ['Status'],
  District: ['District', 'Area', 'Region', 'Zone'],
};

function FieldMappingPreview({
  sourceColumns,
  sampleData,
  onMappingConfirmed,
  onBack,
  contactCount,
  fileType = 'CSV', // Add fileType prop
}) {
  const { accessToken, user } = useAuth();

  const sheetId = useActiveSheetId();
  const { notify } = useNotification();

  // Template state
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [sourceSystem, setSourceSystem] = useState('');

  // Auto-map columns based on aliases
  const initialMapping = useMemo(() => {
    const mapping = {};

    sourceColumns.forEach((col) => {
      const colLower = col.toLowerCase();

      // Check each Folkbase field's aliases
      for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        if (aliases.some((alias) => alias.toLowerCase() === colLower)) {
          mapping[col] = field;
          break;
        }
      }

      // If no match found, skip this column
      if (!mapping[col]) {
        mapping[col] = '';
      }
    });

    return mapping;
  }, [sourceColumns]);

  const [fieldMapping, setFieldMapping] = useState(initialMapping);

  // Load available templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!accessToken || !sheetId) return;

      setLoadingTemplates(true);
      try {
        const templates = await listTemplates(accessToken, sheetId);
        // Filter by file type
        const filtered = templates.filter((t) => t.fileType === fileType);
        setAvailableTemplates(filtered);
      } catch {
        // Silently fail - templates are optional
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [accessToken, sheetId, fileType]);

  const handleTemplateSelect = async (templateName) => {
    if (!templateName) {
      setSelectedTemplate('');
      return;
    }

    setSelectedTemplate(templateName);

    try {
      const template = await loadTemplate(accessToken, sheetId, templateName);

      // Apply template mappings
      setFieldMapping((prev) => {
        const updated = { ...prev };

        // Map template mappings to current source columns
        Object.keys(updated).forEach((sourceCol) => {
          // Check if template has a mapping for this source column
          if (template.fieldMappings[sourceCol]) {
            updated[sourceCol] = template.fieldMappings[sourceCol];
          }
        });

        return updated;
      });
    } catch (error) {
      notify.error('Failed to load template. Check your connection and try again.');
    }
  };

  const handleMappingChange = (sourceColumn, targetField) => {
    setFieldMapping((prev) => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const mappedCount = Object.values(fieldMapping).filter((v) => v).length;
  const skippedCount = Object.values(fieldMapping).filter((v) => !v).length;

  // Get available fields for a dropdown (exclude already-mapped fields except current)
  const getAvailableFields = (currentSource) => {
    const usedFields = Object.entries(fieldMapping)
      .filter(([source, target]) => source !== currentSource && target)
      .map(([, target]) => target);

    return TOUCHPOINT_FIELDS.filter((f) => !usedFields.includes(f));
  };

  const handleConfirm = async () => {
    // Filter out empty mappings
    const finalMapping = Object.fromEntries(
      Object.entries(fieldMapping).filter(([, target]) => target)
    );

    // Save template if requested
    if (saveAsTemplate && templateName.trim()) {
      try {
        await saveTemplate(accessToken, sheetId, {
          templateName: templateName.trim(),
          sourceSystem: sourceSystem.trim() || 'Unknown',
          fileType,
          fieldMappings: finalMapping,
          createdBy: user?.email || 'unknown',
          createdDate: new Date().toISOString().split('T')[0],
          lastUsed: new Date().toISOString().split('T')[0],
          useCount: 1,
        });
      } catch (error) {
        // Don't block import if template save fails
        notify.warning('Template save failed. Your import will continue without saving the template.');
      }
    }

    onMappingConfirmed(finalMapping, templateName.trim() || null);
  };

  return (
    <div className="field-mapping-preview">
      <div className="mapping-header">
        <h3>Field Mapping Preview</h3>
        <p className="mapping-subtitle">
          Map your file's columns to Folkbase fields. Found {contactCount.toLocaleString()}{' '}
          contacts.
        </p>
      </div>

      {/* Template selection */}
      {availableTemplates.length > 0 && (
        <div className="template-selection">
          <label htmlFor="template-select" className="template-label">
            Load Template:
          </label>
          <select
            id="template-select"
            className="form-select"
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            disabled={loadingTemplates}
          >
            <option value="">Select a template...</option>
            {availableTemplates.map((template) => (
              <option key={template.templateName} value={template.templateName}>
                {template.templateName} ({template.sourceSystem})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mapping-table-container">
        <table className="mapping-table">
          <thead>
            <tr>
              <th>Your Column</th>
              <th></th>
              <th>Folkbase Field</th>
              <th>Sample Value</th>
            </tr>
          </thead>
          <tbody>
            {sourceColumns.map((col) => (
              <tr key={col} className={fieldMapping[col] ? 'mapped' : 'unmapped'}>
                <td className="source-column">{col}</td>
                <td className="arrow-cell">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="20"
                    height="20"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </td>
                <td>
                  <select
                    className="form-select mapping-select"
                    value={fieldMapping[col] || ''}
                    onChange={(e) => handleMappingChange(col, e.target.value)}
                  >
                    <option value="">Skip this column</option>
                    {getAvailableFields(col).map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                    {/* Also show currently selected field if it's already used */}
                    {fieldMapping[col] && !getAvailableFields(col).includes(fieldMapping[col]) && (
                      <option value={fieldMapping[col]}>{fieldMapping[col]}</option>
                    )}
                  </select>
                </td>
                <td className="sample-value">
                  {sampleData[0]?.[col] || <span className="empty-value">(empty)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mapping-summary">
        <span className="summary-item summary-mapped">{mappedCount} columns mapped</span>
        <span className="summary-item summary-skipped">{skippedCount} skipped</span>
      </div>

      <div className="mapping-preview-section">
        <h4>Preview (first 5 rows)</h4>
        <div className="preview-table-container">
          <table className="preview-table">
            <thead>
              <tr>
                {TOUCHPOINT_FIELDS.filter((f) => Object.values(fieldMapping).includes(f)).map(
                  (field) => (
                    <th key={field}>{field}</th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {sampleData.slice(0, 5).map((row, idx) => (
                <tr key={idx}>
                  {TOUCHPOINT_FIELDS.filter((f) => Object.values(fieldMapping).includes(f)).map(
                    (field) => {
                      const sourceCol = Object.entries(fieldMapping).find(
                        ([, target]) => target === field
                      )?.[0];
                      return <td key={field}>{sourceCol ? row[sourceCol] || '' : ''}</td>;
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="template-save-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={saveAsTemplate}
            onChange={(e) => setSaveAsTemplate(e.target.checked)}
          />
          <span>Save this mapping as a template</span>
        </label>

        {saveAsTemplate && (
          <div className="template-save-inputs">
            <div className="form-group">
              <label htmlFor="template-name">Template Name:</label>
              <input
                id="template-name"
                type="text"
                className="form-control"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., NationBuilder Export"
              />
            </div>
            <div className="form-group">
              <label htmlFor="source-system">Source System (optional):</label>
              <input
                id="source-system"
                type="text"
                className="form-control"
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                placeholder="e.g., NationBuilder"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mapping-actions">
        <button className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button className="btn btn-primary" onClick={handleConfirm} disabled={mappedCount === 0}>
          Continue to Import
        </button>
      </div>
    </div>
  );
}

export default FieldMappingPreview;
