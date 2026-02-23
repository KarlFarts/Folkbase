import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import './ContactFileDropzone.css';

function ContactFileDropzone({ onFileAccepted, isProcessing }) {
  const [showHelp, setShowHelp] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0]);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/vcard': ['.vcf'],
      'text/x-vcard': ['.vcf'],
      'application/vnd.ms-excel': ['.csv'],
    },
    multiple: false,
    disabled: isProcessing,
  });

  return (
    <div className="contact-file-dropzone-wrapper">
      <div
        {...getRootProps()}
        className={`contact-file-dropzone ${isDragActive ? 'dropzone-active' : ''} ${isDragReject ? 'dropzone-reject' : ''} ${isProcessing ? 'dropzone-disabled' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="dropzone-content">
          <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {isDragActive ? (
            <p className="dropzone-text">Drop your contacts file here...</p>
          ) : isProcessing ? (
            <p className="dropzone-text">Processing contacts...</p>
          ) : (
            <>
              <p className="dropzone-text">Drop your contacts file here</p>
              <p className="dropzone-subtext">or click to browse</p>
            </>
          )}
          <p className="dropzone-formats">Supports vCard (.vcf) and CSV files</p>
        </div>
      </div>

      <button
        type="button"
        className="help-toggle"
        onClick={() => setShowHelp(!showHelp)}
      >
        {showHelp ? 'Hide export instructions' : 'How do I export contacts?'}
      </button>

      {showHelp && (
        <div className="export-help">
          <h4>Export Instructions by Platform</h4>

          <div className="help-section">
            <h5>iPhone / iCloud</h5>
            <ol>
              <li>Go to <a href="https://icloud.com/contacts" target="_blank" rel="noopener noreferrer">icloud.com/contacts</a></li>
              <li>Select the contacts you want to export (or Select All)</li>
              <li>Click the gear icon and choose "Export vCard"</li>
              <li>Drop the downloaded .vcf file here</li>
            </ol>
            <p className="help-tip">Or on iPhone: Contacts app → Select contact → Share → Export as vCard</p>
          </div>

          <div className="help-section">
            <h5>Android / Google Contacts</h5>
            <ol>
              <li>Go to <a href="https://contacts.google.com" target="_blank" rel="noopener noreferrer">contacts.google.com</a></li>
              <li>Select contacts or use the checkbox to select all</li>
              <li>Click the three dots menu → Export</li>
              <li>Choose "vCard" format and export</li>
            </ol>
          </div>

          <div className="help-section">
            <h5>Outlook</h5>
            <ol>
              <li>Open Outlook and go to People/Contacts</li>
              <li>File → Open & Export → Import/Export</li>
              <li>Choose "Export to a file" → "Comma Separated Values"</li>
              <li>Select your Contacts folder and save</li>
            </ol>
          </div>

          <div className="help-section">
            <h5>Other Sources</h5>
            <p>Export as CSV with these columns: Name, Phone, Email</p>
            <p>Optional columns: Organization, Role, Notes</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactFileDropzone;
