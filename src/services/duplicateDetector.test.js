import {
  isDuplicate,
  detectDuplicates,
  mergeContacts,
  applyDuplicateResolutions,
  formatMatchDetails,
  CONFIDENCE,
} from './duplicateDetector';

describe('duplicateDetector', () => {
  describe('isDuplicate', () => {
    test('returns HIGH confidence for exact name and phone match', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '555-123-4567',
        Email: '',
      };
      const existing = {
        Name: 'John Smith',
        Phone: '(555) 123-4567',
        Email: '',
      };

      expect(isDuplicate(incoming, existing)).toBe(CONFIDENCE.HIGH);
    });

    test('returns HIGH confidence for exact name and email match', () => {
      const incoming = {
        Name: 'Jane Doe',
        Phone: '',
        Email: 'jane@example.com',
      };
      const existing = {
        Name: 'jane doe',
        Phone: '',
        Email: 'JANE@EXAMPLE.COM',
      };

      expect(isDuplicate(incoming, existing)).toBe(CONFIDENCE.HIGH);
    });

    test('returns MEDIUM confidence for fuzzy name (80%+) and phone match', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '555-123-4567',
        Email: '',
      };
      const existing = {
        Name: 'Jon Smith',
        Phone: '5551234567',
        Email: '',
      };

      expect(isDuplicate(incoming, existing)).toBe(CONFIDENCE.MEDIUM);
    });

    test('returns MEDIUM confidence for phone match without name match', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '555-123-4567',
        Email: '',
      };
      const existing = {
        Name: 'Different Person',
        Phone: '(555) 123-4567',
        Email: '',
      };

      expect(isDuplicate(incoming, existing)).toBe(CONFIDENCE.MEDIUM);
    });

    test('returns MEDIUM confidence for email match without name match', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '',
        Email: 'john@example.com',
      };
      const existing = {
        Name: 'Different Person',
        Phone: '',
        Email: 'john@example.com',
      };

      expect(isDuplicate(incoming, existing)).toBe(CONFIDENCE.MEDIUM);
    });

    test('returns NONE for completely different contacts', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '555-123-4567',
        Email: 'john@example.com',
      };
      const existing = {
        Name: 'Jane Doe',
        Phone: '555-999-8888',
        Email: 'jane@example.com',
      };

      expect(isDuplicate(incoming, existing)).toBe(CONFIDENCE.NONE);
    });

    test('normalizes phone numbers correctly', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '1-555-123-4567',
        Email: '',
      };
      const existing = {
        Name: 'John Smith',
        Phone: '(555) 123.4567',
        Email: '',
      };

      expect(isDuplicate(incoming, existing)).toBe(CONFIDENCE.HIGH);
    });

    test('normalizes email addresses correctly', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '',
        Email: '  JOHN@EXAMPLE.COM  ',
      };
      const existing = {
        Name: 'John Smith',
        Phone: '',
        Email: 'john@example.com',
      };

      expect(isDuplicate(incoming, existing)).toBe(CONFIDENCE.HIGH);
    });
  });

  describe('detectDuplicates', () => {
    test('finds all duplicates in a batch', async () => {
      const incomingContacts = [
        { Name: 'John Smith', Phone: '555-123-4567', Email: 'john@example.com' },
        { Name: 'Jane Doe', Phone: '555-999-8888', Email: 'jane@example.com' },
        { Name: 'New Person', Phone: '555-111-2222', Email: 'new@example.com' },
      ];

      const existingContacts = [
        { Name: 'John Smith', Phone: '5551234567', Email: 'john@example.com', 'Contact ID': 'C001' },
        { Name: 'Bob Jones', Phone: '555-333-4444', Email: 'bob@example.com', 'Contact ID': 'C002' },
      ];

      const duplicates = await detectDuplicates(incomingContacts, existingContacts);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].incomingContact.Name).toBe('John Smith');
      expect(duplicates[0].existingContact['Contact ID']).toBe('C001');
      expect(duplicates[0].confidence).toBe(CONFIDENCE.HIGH);
    });

    test('only reports first match for each incoming contact', async () => {
      const incomingContacts = [
        { Name: 'John Smith', Phone: '555-123-4567', Email: 'john@example.com' },
      ];

      const existingContacts = [
        { Name: 'John Smith', Phone: '5551234567', Email: 'john@example.com', 'Contact ID': 'C001' },
        { Name: 'John Smith', Phone: '5551234567', Email: 'john@different.com', 'Contact ID': 'C002' },
      ];

      const duplicates = await detectDuplicates(incomingContacts, existingContacts);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].existingContact['Contact ID']).toBe('C001');
    });

    test('returns empty array when no duplicates found', async () => {
      const incomingContacts = [
        { Name: 'New Person', Phone: '555-111-2222', Email: 'new@example.com' },
      ];

      const existingContacts = [
        { Name: 'Existing Person', Phone: '555-999-8888', Email: 'existing@example.com', 'Contact ID': 'C001' },
      ];

      const duplicates = await detectDuplicates(incomingContacts, existingContacts);

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('mergeContacts', () => {
    test('merges new data into existing contact', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '555-123-4567',
        Email: 'newemail@example.com',
        Organization: 'New Company',
        Role: '',
      };

      const existing = {
        'Contact ID': 'C001',
        Name: 'John Smith',
        Phone: '555-123-4567',
        Email: 'oldemail@example.com',
        Organization: 'Old Company',
        Role: 'Manager',
        Priority: 'High',
        Status: 'Active',
      };

      const merged = mergeContacts(incoming, existing);

      expect(merged['Contact ID']).toBe('C001');
      expect(merged.Name).toBe('John Smith');
      expect(merged.Email).toBe('newemail@example.com'); // New value
      expect(merged.Organization).toBe('New Company'); // New value
      expect(merged.Role).toBe('Manager'); // Preserved from existing
      expect(merged.Priority).toBe('High'); // Preserved from existing
    });

    test('preserves existing values when incoming has empty fields', () => {
      const incoming = {
        Name: 'John Smith',
        Phone: '',
        Email: '',
        Organization: '',
      };

      const existing = {
        'Contact ID': 'C001',
        Name: 'John Smith',
        Phone: '555-123-4567',
        Email: 'john@example.com',
        Organization: 'Company',
      };

      const merged = mergeContacts(incoming, existing);

      expect(merged.Phone).toBe('555-123-4567');
      expect(merged.Email).toBe('john@example.com');
      expect(merged.Organization).toBe('Company');
    });
  });

  describe('applyDuplicateResolutions', () => {
    test('correctly separates contacts by action', () => {
      const duplicates = [
        {
          incomingIndex: 0,
          incomingContact: { Name: 'John Smith', Phone: '555-123-4567' },
          existingContact: { 'Contact ID': 'C001', Name: 'John Smith', Phone: '555-123-4567' },
          action: 'skip',
        },
        {
          incomingIndex: 1,
          incomingContact: { Name: 'Jane Doe', Phone: '555-999-8888', Email: 'jane@new.com' },
          existingContact: { 'Contact ID': 'C002', Name: 'Jane Doe', Phone: '555-999-8888', Email: 'jane@old.com' },
          action: 'merge',
        },
        {
          incomingIndex: 2,
          incomingContact: { Name: 'Bob Jones', Phone: '555-111-2222' },
          existingContact: { 'Contact ID': 'C003', Name: 'Bob Jones', Phone: '555-111-2222' },
          action: 'add',
        },
      ];

      const incomingContacts = [
        { Name: 'John Smith', Phone: '555-123-4567' },
        { Name: 'Jane Doe', Phone: '555-999-8888', Email: 'jane@new.com' },
        { Name: 'Bob Jones', Phone: '555-111-2222' },
        { Name: 'New Person', Phone: '555-333-4444' },
      ];

      const results = applyDuplicateResolutions(duplicates, incomingContacts);

      expect(results.skipped).toHaveLength(1);
      expect(results.skipped[0].contact.Name).toBe('John Smith');

      expect(results.toMerge).toHaveLength(1);
      expect(results.toMerge[0].contactId).toBe('C002');
      expect(results.toMerge[0].updated.Email).toBe('jane@new.com');

      expect(results.toImport).toHaveLength(2); // Bob Jones (add anyway) + New Person (not duplicate)
      expect(results.toImport.some(c => c.Name === 'Bob Jones')).toBe(true);
      expect(results.toImport.some(c => c.Name === 'New Person')).toBe(true);
    });
  });

  describe('formatMatchDetails', () => {
    test('formats match details correctly', () => {
      const matchDetails = {
        nameMatch: true,
        fuzzyNameMatch: false,
        nameSimilarity: 1.0,
        phoneMatch: true,
        emailMatch: false,
      };

      expect(formatMatchDetails(matchDetails)).toBe('exact name, phone');
    });

    test('formats fuzzy match details correctly', () => {
      const matchDetails = {
        nameMatch: false,
        fuzzyNameMatch: true,
        nameSimilarity: 0.85,
        phoneMatch: false,
        emailMatch: true,
      };

      expect(formatMatchDetails(matchDetails)).toBe('similar name (85%), email');
    });

    test('formats phone and email match without name', () => {
      const matchDetails = {
        nameMatch: false,
        fuzzyNameMatch: false,
        nameSimilarity: 0.5,
        phoneMatch: true,
        emailMatch: true,
      };

      expect(formatMatchDetails(matchDetails)).toBe('phone, email');
    });
  });
});
