import React, { useState } from 'react';
import { Smartphone, FileSpreadsheet, FileText } from 'lucide-react';
import FileDropzone from './FileDropzone';

function ImportSourceSelector({ onFileAccepted, isProcessing, _compact = false }) {
  const [selectedSource, setSelectedSource] = useState(null);

  const sources = [
    {
      id: 'iphone',
      icon: Smartphone,
      title: 'iPhone / Apple',
      description: 'Export from your iPhone',
      instructions: [
        'On your iPhone, open Settings then tap Contacts',
        'Tap Export (iOS 18+), or visit iCloud.com/contacts and click the export icon',
        'Transfer the .vcf file to this computer (email it to yourself, AirDrop, or use iCloud Drive)',
        'Upload the file below',
      ],
    },
    {
      id: 'android',
      icon: Smartphone,
      title: 'Android / Google',
      description: 'Export from Google Contacts',
      instructions: [
        'Open contacts.google.com in your browser',
        'Click Export in the left sidebar',
        'Select Google CSV format and click Export',
        'Upload the downloaded file below',
      ],
    },
    {
      id: 'csv',
      icon: FileSpreadsheet,
      title: 'CSV File',
      description: 'Upload a CSV spreadsheet',
      instructions: null,
    },
    {
      id: 'vcard',
      icon: FileText,
      title: 'vCard File',
      description: 'Upload a .vcf contact file',
      instructions: null,
    },
  ];

  const handleSourceSelect = (sourceId) => {
    setSelectedSource(sourceId);
  };

  return (
    <div className="import-source-selector">
      <div className="path-selection">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <div
              key={source.id}
              className={`path-card ${selectedSource === source.id ? 'selected' : ''}`}
              onClick={() => handleSourceSelect(source.id)}
            >
              <div className="path-card-icon">
                <Icon size={32} />
              </div>
              <h3 className="path-card-title">{source.title}</h3>
              <p className="path-card-description">{source.description}</p>
            </div>
          );
        })}
      </div>

      {selectedSource && (
        <div className="import-source-content">
          {sources.find((s) => s.id === selectedSource)?.instructions && (
            <div className="wizard-info-box" style={{ marginBottom: 'var(--spacing-md)' }}>
              <ol style={{ margin: 0, paddingLeft: 'var(--spacing-lg)' }}>
                {sources
                  .find((s) => s.id === selectedSource)
                  .instructions.map((instruction, index) => (
                    <li key={index} style={{ marginBottom: 'var(--spacing-xs)' }}>
                      {instruction}
                    </li>
                  ))}
              </ol>
            </div>
          )}

          <FileDropzone onFileAccepted={onFileAccepted} isProcessing={isProcessing} />
        </div>
      )}
    </div>
  );
}

export default ImportSourceSelector;
