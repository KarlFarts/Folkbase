import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSheetId } from '../utils/sheetResolver';
import MergePreview from '../components/MergePreview';
import { findDuplicatesInList } from '../services/duplicateDetector';
import { readSheetData, updateContact, SHEETS } from '../utils/devModeWrapper';

function DuplicateManager({ onNavigate }) {
  const { accessToken, user } = useAuth();
  const sheetId = useActiveSheetId();
  const [contacts, setContacts] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);
  const [linkedPairs, setLinkedPairs] = useState([]);
  const [error, setError] = useState('');

  // Load contacts on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        const result = await readSheetData(accessToken, sheetId, SHEETS.CONTACTS);
        setContacts(result.data || []);
        setError('');
      } catch (err) {
        setError('Failed to load contacts: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    if (accessToken || import.meta.env.VITE_DEV_MODE === 'true') {
      loadContacts();
    }
  }, [accessToken, sheetId]);

  const handleScanDuplicates = async () => {
    try {
      setScanning(true);
      setError('');

      // Find duplicates in the existing contact list
      const found = findDuplicatesInList(contacts, 75); // 75% threshold
      setDuplicates(found);

      if (found.length === 0) {
        setError('No duplicate contacts found');
      }
    } catch (err) {
      setError('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setScanning(false);
    }
  };

  const handleLinkDuplicates = async (selectedValues) => {
    if (!selectedDuplicate) return;

    try {
      const { contact1, contact2 } = selectedDuplicate;
      const contact1Id = contact1['Contact ID'];
      const contact2Id = contact2['Contact ID'];

      // Update contact1 with selected field values and link to contact2
      const updated1 = {
        ...contact1,
        DuplicateLinkedTo: contact2Id,
      };

      // Merge selected field values
      Object.entries(selectedValues).forEach(([fieldKey, source]) => {
        if (source === 'contact1') {
          updated1[fieldKey] = contact1[fieldKey];
        } else if (source === 'contact2') {
          updated1[fieldKey] = contact2[fieldKey];
        }
        // If 'skip', don't update the field
      });

      // Update contact2 to link back to contact1
      const updated2 = {
        ...contact2,
        DuplicateLinkedTo: contact1Id,
      };

      // Apply updates
      await updateContact(accessToken, sheetId, contact1Id, contact1, updated1, user?.email);
      await updateContact(accessToken, sheetId, contact2Id, contact2, updated2, user?.email);

      // Record the linked pair
      setLinkedPairs([
        ...linkedPairs,
        {
          contact1Id,
          contact2Id,
          contact1Name: contact1.Name,
          contact2Name: contact2.Name,
          linkedAt: new Date().toISOString(),
        },
      ]);

      // Remove from duplicates list and close preview
      setDuplicates(duplicates.filter((d) => d !== selectedDuplicate));
      setSelectedDuplicate(null);
    } catch (err) {
      setError('Failed to link duplicates: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSkipDuplicate = () => {
    if (!selectedDuplicate) return;
    setDuplicates(duplicates.filter((d) => d !== selectedDuplicate));
    setSelectedDuplicate(null);
  };

  const handleUnlinkDuplicate = async (contact1Id, contact2Id) => {
    try {
      setError('');

      // Find the contacts to unlink
      const contact1 = contacts.find((c) => c['Contact ID'] === contact1Id);
      const contact2 = contacts.find((c) => c['Contact ID'] === contact2Id);

      if (!contact1 || !contact2) {
        setError('One or both contacts not found');
        return;
      }

      // Remove the DuplicateLinkedTo field
      const updated1 = { ...contact1 };
      delete updated1.DuplicateLinkedTo;

      const updated2 = { ...contact2 };
      delete updated2.DuplicateLinkedTo;

      // Apply updates
      await updateContact(accessToken, sheetId, contact1Id, contact1, updated1, user?.email);
      await updateContact(accessToken, sheetId, contact2Id, contact2, updated2, user?.email);

      // Remove from linked pairs
      setLinkedPairs(
        linkedPairs.filter((p) => !(p.contact1Id === contact1Id && p.contact2Id === contact2Id))
      );
    } catch (err) {
      setError('Failed to unlink duplicates: ' + (err.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="text-center dm-loading">
          <p>Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1>Duplicate Manager</h1>
          <p className="text-muted">Find and link duplicate contacts</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('contacts')}>
          Back to Contacts
        </button>
      </div>

      {error && (
        <div className="alert alert-danger dm-error">
          {error}
        </div>
      )}

      {/* Scan section */}
      <div className="card">
        <div className="card-header">
          <h2>Scan for Duplicates</h2>
          <button
            className="btn btn-primary"
            onClick={handleScanDuplicates}
            disabled={scanning || contacts.length < 2}
          >
            {scanning ? 'Scanning...' : `Scan ${contacts.length} Contacts`}
          </button>
        </div>
        <div className="card-body">
          <p className="text-sm">
            This will compare all contacts and find potential duplicates based on:
          </p>
          <ul className="text-sm dm-criteria-list">
            <li>Exact or similar names (80%+ match)</li>
            <li>Matching phone numbers</li>
            <li>Matching email addresses</li>
          </ul>
        </div>
      </div>

      {/* Duplicates found section */}
      {duplicates.length > 0 && (
        <div className="card dm-results-card">
          <div className="card-header">
            <h2>Found {duplicates.length} Potential Duplicate(s)</h2>
          </div>
          <div className="card-body">
            <div className="duplicates-list">
              {duplicates.map((duplicate, idx) => (
                <div key={idx} className="duplicate-pair">
                  <div className="duplicate-info">
                    <div className="contact-info">
                      <h4>{duplicate.contact1.Name}</h4>
                      <p className="text-sm text-muted">
                        {duplicate.contact1.Organization || 'No organization'}
                      </p>
                      {duplicate.contact1.Email && (
                        <p className="text-sm">{duplicate.contact1.Email}</p>
                      )}
                      {duplicate.contact1.Phone && (
                        <p className="text-sm">{duplicate.contact1.Phone}</p>
                      )}
                    </div>
                    <div className="duplicate-vs">VS</div>
                    <div className="contact-info">
                      <h4>{duplicate.contact2.Name}</h4>
                      <p className="text-sm text-muted">
                        {duplicate.contact2.Organization || 'No organization'}
                      </p>
                      {duplicate.contact2.Email && (
                        <p className="text-sm">{duplicate.contact2.Email}</p>
                      )}
                      {duplicate.contact2.Phone && (
                        <p className="text-sm">{duplicate.contact2.Phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="duplicate-confidence">
                    <span className="badge badge-info">{duplicate.confidenceScore}% match</span>
                  </div>

                  <div className="duplicate-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectedDuplicate(duplicate)}
                    >
                      Review & Link
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSkipDuplicate()}
                    >
                      Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Linked pairs section */}
      {linkedPairs.length > 0 && (
        <div className="card dm-results-card">
          <div className="card-header">
            <h2>Linked Duplicates ({linkedPairs.length})</h2>
          </div>
          <div className="card-body">
            <div className="linked-pairs-list">
              {linkedPairs.map((pair, idx) => (
                <div key={idx} className="linked-pair">
                  <div className="pair-info">
                    <span>{pair.contact1Name}</span>
                    <span className="text-muted">↔</span>
                    <span>{pair.contact2Name}</span>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleUnlinkDuplicate(pair.contact1Id, pair.contact2Id)}
                  >
                    Unlink
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Merge preview modal */}
      {selectedDuplicate && (
        <MergePreview
          contact1={selectedDuplicate.contact1}
          contact2={selectedDuplicate.contact2}
          matchDetails={selectedDuplicate.matchDetails}
          onConfirm={handleLinkDuplicates}
          onCancel={() => setSelectedDuplicate(null)}
        />
      )}

    </div>
  );
}

export default DuplicateManager;
