import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import ImportSourceSelector from '../components/import/ImportSourceSelector';
import FieldMappingPreview from '../components/import/FieldMappingPreview';
import DataCorrectionTable from '../components/import/DataCorrectionTable';
import BatchActionsToolbar from '../components/import/BatchActionsToolbar';
import DuplicateReviewPanel from '../components/import/DuplicateReviewPanel';
import ProgressTracker from '../components/import/ProgressTracker';
import { parseFile } from '../utils/importParsers';
import { executeImport } from '../services/importExecutor';
import { processValidation } from '../services/contactValidation';
import { formatPhone } from '../services/importValidator';
import { detectDuplicates, applyDuplicateResolutions } from '../services/duplicateDetector';
import { readSheetData } from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';
import { usePermissions } from '../hooks/usePermissions';

// Import steps
const STEPS = {
  UPLOAD: 'upload',
  MAPPING: 'mapping',
  VALIDATION: 'validation',
  DUPLICATES: 'duplicates',
  IMPORTING: 'importing',
  COMPLETE: 'complete',
};

function ImportPage({ onNavigate }) {
  const { user, accessToken } = useAuth();
  const sheetId = useActiveSheetId();
  const { canWrite } = usePermissions();

  const [currentStep, setCurrentStep] = useState(STEPS.UPLOAD);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  // Parsed data
  const [parsedData, setParsedData] = useState(null);
  const [fieldMapping, setFieldMapping] = useState(null);
  const [appliedTemplateName, setAppliedTemplateName] = useState(null);
  const [validationData, setValidationData] = useState(null); // { validatedContacts, contactsWithIssues }
  const [duplicates, setDuplicates] = useState(null); // Array of duplicate matches
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [importResults, setImportResults] = useState(null);

  // Cancellation token
  const cancelTokenRef = useRef({ isCancelled: false });

  const handleFileAccepted = useCallback(async (file) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await parseFile(file, setProgress);

      if (result.contacts.length === 0) {
        setError('No contacts found in the file. Please check the file format.');
        setIsProcessing(false);
        return;
      }

      // Add filename to metadata
      result.metadata.filename = file.name;

      setParsedData(result);
      setCurrentStep(STEPS.MAPPING);
    } catch (err) {
      setError('Failed to parse file. Make sure it is a valid CSV or Excel file and try again.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, []);

  const handleMappingConfirmed = useCallback(
    async (mapping, appliedTemplateName = null) => {
      setError(null);
      setFieldMapping(mapping); // Store for later use
      setAppliedTemplateName(appliedTemplateName); // Store template name

      // Run validation on all contacts
      const validationOptions = {
        requiredFields: ['Name'],
        dropdownFields: {},
      };

      const validation = processValidation(parsedData.contacts, validationOptions);
      setValidationData(validation);

      // If there are issues, show validation screen
      if (validation.contactsWithIssues.length > 0) {
        setCurrentStep(STEPS.VALIDATION);
      } else {
        // No issues, proceed to duplicate detection
        handleValidationConfirmed(mapping, validation.validatedContacts);
      }
    },
    [parsedData]
  );

  const handleValidationConfirmed = useCallback(
    async (fieldMapping, validatedContacts) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Fetch existing contacts for duplicate detection
        const { data: existingContacts } = await readSheetData(
          accessToken,
          sheetId,
          SHEET_NAMES.CONTACTS
        );

        // Run duplicate detection
        const foundDuplicates = await detectDuplicates(
          validatedContacts,
          existingContacts,
          setProgress
        );

        // If duplicates found, show review screen
        if (foundDuplicates.length > 0) {
          setDuplicates(foundDuplicates);
          setCurrentStep(STEPS.DUPLICATES);
        } else {
          // No duplicates, proceed directly to import
          handleDuplicatesResolved([]);
        }
      } catch (err) {
        setError('Duplicate detection failed. Check your connection and try again.');
        setCurrentStep(STEPS.VALIDATION);
      } finally {
        setIsProcessing(false);
        setProgress(null);
      }
    },
    [accessToken, sheetId]
  );

  const handleDuplicatesResolved = useCallback(
    async (resolvedDuplicates) => {
      setCurrentStep(STEPS.IMPORTING);
      setError(null);

      // Reset cancellation token
      cancelTokenRef.current = { isCancelled: false };

      try {
        // Apply duplicate resolution logic
        const resolution = applyDuplicateResolutions(
          resolvedDuplicates,
          validationData.validatedContacts
        );

        // Execute import with both new contacts and merges
        const results = await executeImport({
          accessToken,
          sheetId: sheetId,
          contacts: resolution.toImport,
          merges: resolution.toMerge,
          fieldMapping: {
            ...fieldMapping,
            _filename: parsedData.metadata.filename,
            _templateUsed: appliedTemplateName,
            _duplicatesSkipped: resolution.skipped.length,
            _invalidExcluded: validationData.contactsWithIssues.length,
          },
          userEmail: user?.email || 'unknown',
          onProgress: setProgress,
          cancelToken: cancelTokenRef.current,
        });

        // Add skipped count to results
        results.skipped = resolution.skipped.length;

        // Check if import was cancelled
        if (results.cancelled) {
          setError('Import was cancelled');
          setCurrentStep(STEPS.DUPLICATES);
        } else {
          setImportResults(results);
          setCurrentStep(STEPS.COMPLETE);
        }
      } catch (err) {
        setError('Import failed. Check your connection and try again.');
        setCurrentStep(STEPS.DUPLICATES);
      } finally {
        setProgress(null);
      }
    },
    [accessToken, sheetId, user?.email, fieldMapping, validationData]
  );

  const handleCancelImport = useCallback(() => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.isCancelled = true;
    }
  }, []);

  const handleBackToUpload = useCallback(() => {
    setParsedData(null);
    setError(null);
    setCurrentStep(STEPS.UPLOAD);
  }, []);

  const handleStartOver = useCallback(() => {
    setParsedData(null);
    setFieldMapping(null);
    setValidationData(null);
    setDuplicates(null);
    setSelectedRows(new Set());
    setImportResults(null);
    setError(null);
    setProgress(null);
    setCurrentStep(STEPS.UPLOAD);
  }, []);

  // Data correction handlers
  const handleRowUpdate = useCallback(
    (rowIndex, field, newValue) => {
      if (!validationData) return;

      const updatedIssues = [...validationData.contactsWithIssues];
      const issueIndex = updatedIssues.findIndex((item) => item.rowIndex === rowIndex);

      if (issueIndex !== -1) {
        updatedIssues[issueIndex].contact = {
          ...updatedIssues[issueIndex].contact,
          [field]: newValue,
        };
        setValidationData({
          ...validationData,
          contactsWithIssues: updatedIssues,
        });
      }
    },
    [validationData]
  );

  const handleRowSelect = useCallback((rowIndex, isSelected) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(rowIndex);
      } else {
        newSet.delete(rowIndex);
      }
      return newSet;
    });
  }, []);

  const handleFormatPhones = useCallback(() => {
    if (!validationData || selectedRows.size === 0) return;

    const updatedIssues = validationData.contactsWithIssues.map((item) => {
      if (selectedRows.has(item.rowIndex) && item.contact.Phone) {
        const formatted = formatPhone(item.contact.Phone);
        if (formatted.isValid && formatted.value) {
          return {
            ...item,
            contact: { ...item.contact, Phone: formatted.value },
          };
        }
      }
      return item;
    });

    setValidationData({
      ...validationData,
      contactsWithIssues: updatedIssues,
    });
  }, [validationData, selectedRows]);

  const handleExcludeSelected = useCallback(() => {
    if (!validationData || selectedRows.size === 0) return;

    const updatedIssues = validationData.contactsWithIssues.filter(
      (item) => !selectedRows.has(item.rowIndex)
    );

    setValidationData({
      ...validationData,
      contactsWithIssues: updatedIssues,
    });
    setSelectedRows(new Set());
  }, [validationData, selectedRows]);

  const handleProceedWithImport = useCallback(() => {
    if (!validationData || !fieldMapping) return;

    handleValidationConfirmed(fieldMapping, validationData.validatedContacts);
  }, [validationData, fieldMapping, handleValidationConfirmed]);

  if (!canWrite('contacts')) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '480px', margin: '4rem auto' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Permission Required</h2>
            <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
              You don&apos;t have permission to do this. Ask the workspace owner for access.
            </p>
            <button className="btn btn-primary" onClick={() => onNavigate('contacts')}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case STEPS.UPLOAD:
        return (
          <div className="import-upload-section">
            <ImportSourceSelector onFileAccepted={handleFileAccepted} isProcessing={isProcessing} />

            {isProcessing && progress && (
              <div className="import-progress-container">
                <ProgressTracker progress={progress} />
              </div>
            )}

            {error && (
              <div className="import-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
        );

      case STEPS.MAPPING:
        return (
          <FieldMappingPreview
            sourceColumns={parsedData.sourceColumns}
            sampleData={parsedData.contacts}
            contactCount={parsedData.metadata.totalRows}
            fileType={parsedData.metadata.fileType || 'CSV'}
            onMappingConfirmed={handleMappingConfirmed}
            onBack={handleBackToUpload}
          />
        );

      case STEPS.VALIDATION:
        return (
          <div className="import-validation-section">
            <div className="validation-header">
              <h2>Data Quality Issues Found</h2>
              <p>
                {validationData?.contactsWithIssues.length || 0} row(s) have issues that need your
                attention. Review and correct them below before importing.
              </p>
            </div>

            <BatchActionsToolbar
              selectedCount={selectedRows.size}
              onFormatPhones={handleFormatPhones}
              onExcludeSelected={handleExcludeSelected}
            />

            <DataCorrectionTable
              issues={validationData?.contactsWithIssues || []}
              onUpdate={handleRowUpdate}
              onRowSelect={handleRowSelect}
            />

            <div className="validation-actions">
              <button className="btn btn-secondary" onClick={() => setCurrentStep(STEPS.MAPPING)}>
                Back to Mapping
              </button>
              <button
                className="btn btn-primary"
                onClick={handleProceedWithImport}
                disabled={validationData?.contactsWithIssues.length > 0}
              >
                Check for Duplicates (
                {validationData?.validatedContacts.length -
                  (validationData?.contactsWithIssues.length || 0)}{' '}
                contacts)
              </button>
            </div>

            {isProcessing && progress && (
              <div className="import-progress-container">
                <ProgressTracker progress={progress} />
              </div>
            )}
          </div>
        );

      case STEPS.DUPLICATES:
        return (
          <div className="import-duplicates-section">
            <DuplicateReviewPanel
              duplicates={duplicates || []}
              onDuplicatesResolved={handleDuplicatesResolved}
            />

            <div className="duplicates-back-button">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentStep(STEPS.VALIDATION)}
              >
                Back to Validation
              </button>
            </div>
          </div>
        );

      case STEPS.IMPORTING:
        return (
          <div className="import-progress-section">
            <div className="import-progress-card">
              <h3>Importing Contacts</h3>
              <p>Please wait while your contacts are being imported...</p>
              {progress && <ProgressTracker progress={progress} />}
              {progress?.canCancel && (
                <div className="import-cancel-row">
                  <button
                    className="btn btn-secondary"
                    onClick={handleCancelImport}
                    disabled={cancelTokenRef.current?.isCancelled}
                  >
                    {cancelTokenRef.current?.isCancelled ? 'Cancelling...' : 'Cancel Import'}
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case STEPS.COMPLETE:
        return (
          <div className="import-complete-section">
            <div className="import-success-card">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h2>Import Complete!</h2>
              <p>
                Successfully processed {(importResults?.added || 0) + (importResults?.merged || 0)}{' '}
                contacts
              </p>

              <div className="import-summary">
                <div className="summary-item">
                  <span className="summary-label">Contacts Added</span>
                  <span className="summary-value success">{importResults?.added || 0}</span>
                </div>
                {importResults?.merged > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Contacts Merged</span>
                    <span className="summary-value success">{importResults.merged}</span>
                  </div>
                )}
                {importResults?.skipped > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Duplicates Skipped</span>
                    <span className="summary-value">{importResults.skipped}</span>
                  </div>
                )}
                {importResults?.failed > 0 && (
                  <div className="summary-item">
                    <span className="summary-label">Failed</span>
                    <span className="summary-value error">{importResults.failed}</span>
                  </div>
                )}
              </div>

              {importResults?.errors?.length > 0 && (
                <div className="import-errors-list">
                  <h4>Errors:</h4>
                  <ul>
                    {importResults.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>
                        {err.contact}: {err.error}
                      </li>
                    ))}
                    {importResults.errors.length > 5 && (
                      <li>...and {importResults.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="import-complete-actions">
                <button className="btn btn-secondary" onClick={handleStartOver}>
                  Import Another File
                </button>
                <button className="btn btn-primary" onClick={() => onNavigate('contacts')}>
                  View Contacts
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="import-page">
      <div className="import-header">
        <button className="btn btn-ghost" onClick={() => onNavigate('contacts')}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="20"
            height="20"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Contacts
        </button>
        <h1>Import Contacts</h1>
      </div>

      <div className="import-content">{renderStep()}</div>
    </div>
  );
}

export default ImportPage;
