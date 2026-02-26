import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

function FileDropzone({ onFileAccepted, isProcessing }) {
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
    },
    multiple: false,
    disabled: isProcessing,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone ${isDragActive ? 'dropzone-active' : ''} ${isDragReject ? 'dropzone-reject' : ''} ${isProcessing ? 'dropzone-disabled' : ''}`}
    >
      <input {...getInputProps()} />
      <div className="dropzone-content">
        <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {isDragActive ? (
          <p className="dropzone-text">Drop the file here...</p>
        ) : isProcessing ? (
          <p className="dropzone-text">Processing file...</p>
        ) : (
          <>
            <p className="dropzone-text">Drag & drop a file here</p>
            <p className="dropzone-subtext">or click to browse</p>
          </>
        )}
        <p className="dropzone-formats">Supported: CSV, vCard (.vcf)</p>
      </div>
    </div>
  );
}

export default FileDropzone;
