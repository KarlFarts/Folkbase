import {
  generateCSV,
  generateVCard,
  getAllFields,
  generateFilename,
  FIELD_PRESETS,
} from './exportService';

describe('exportService', () => {
  const mockContacts = [
    {
      'Contact ID': 'C001',
      Name: 'John Smith',
      'First Name': 'John',
      'Last Name': 'Smith',
      Phone: '555-0100',
      Email: 'john@example.com',
      Organization: 'UAW Local 600',
      Role: 'Organizer',
      Priority: 'High',
      Status: 'Active',
      District: 'District 1',
      Tags: 'Labor, Volunteer',
      Bio: 'Long-time union organizer',
    },
    {
      'Contact ID': 'C002',
      Name: 'Jane Doe',
      Phone: '555-0101',
      Email: 'jane@example.com',
      Organization: 'SEIU',
      Priority: 'Medium',
      Status: 'Active',
    },
  ];

  describe('getAllFields', () => {
    test('returns all unique fields from contacts', () => {
      const fields = getAllFields(mockContacts);
      expect(fields).toContain('Contact ID');
      expect(fields).toContain('Name');
      expect(fields).toContain('Phone');
      expect(fields).toContain('Email');
    });

    test('returns default fields for empty contacts array', () => {
      const fields = getAllFields([]);
      expect(fields).toEqual(FIELD_PRESETS.full);
    });
  });

  describe('generateCSV', () => {
    test('generates valid CSV with all fields', () => {
      const csv = generateCSV(mockContacts, ['Contact ID', 'Name', 'Phone', 'Email']);

      expect(csv).toContain('Contact ID');
      expect(csv).toContain('Name');
      expect(csv).toContain('Phone');
      expect(csv).toContain('Email');
      expect(csv).toContain('C001');
      expect(csv).toContain('John Smith');
      expect(csv).toContain('555-0100');
      expect(csv).toContain('john@example.com');
    });

    test('includes UTF-8 BOM', () => {
      const csv = generateCSV(mockContacts, ['Name']);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    test('handles empty fields gracefully', () => {
      const csv = generateCSV(mockContacts, ['Contact ID', 'Bio']);
      expect(csv).toContain('C002');
      // C002 has no Bio field, should be empty
      const lines = csv.split('\n');
      expect(lines[2]).toContain('C002');
    });

    test('throws error for empty contacts', () => {
      expect(() => {
        generateCSV([], ['Name']);
      }).toThrow('No contacts to export');
    });

    test('properly escapes special characters', () => {
      const contactsWithSpecialChars = [
        {
          Name: 'Test, Name',
          Bio: 'Line 1\nLine 2',
        },
      ];
      const csv = generateCSV(contactsWithSpecialChars, ['Name', 'Bio']);

      // PapaParse should properly quote fields with commas and newlines
      expect(csv).toContain('"Test, Name"');
    });
  });

  describe('generateVCard', () => {
    test('generates valid vCard format', () => {
      const vcard = generateVCard(mockContacts);

      expect(vcard).toContain('BEGIN:VCARD');
      expect(vcard).toContain('VERSION:3.0');
      expect(vcard).toContain('END:VCARD');
    });

    test('includes contact name (FN)', () => {
      const vcard = generateVCard(mockContacts);
      expect(vcard).toContain('FN:John Smith');
    });

    test('includes structured name (N) when First Name and Last Name available', () => {
      const vcard = generateVCard(mockContacts);
      expect(vcard).toContain('N:Smith;John;;;');
    });

    test('includes phone number', () => {
      const vcard = generateVCard(mockContacts);
      expect(vcard).toContain('TEL;TYPE=CELL:555-0100');
    });

    test('includes email', () => {
      const vcard = generateVCard(mockContacts);
      expect(vcard).toContain('EMAIL;TYPE=HOME:john@example.com');
    });

    test('includes organization', () => {
      const vcard = generateVCard(mockContacts);
      expect(vcard).toContain('ORG:UAW Local 600');
    });

    test('includes role/title', () => {
      const vcard = generateVCard(mockContacts);
      expect(vcard).toContain('TITLE:Organizer');
    });

    test('includes bio as note', () => {
      const vcard = generateVCard(mockContacts);
      expect(vcard).toContain('NOTE:Long-time union organizer');
    });

    test('handles multiple contacts', () => {
      const vcard = generateVCard(mockContacts);
      const vcardCount = (vcard.match(/BEGIN:VCARD/g) || []).length;
      expect(vcardCount).toBe(2);
    });

    test('escapes special vCard characters', () => {
      const contactsWithSpecialChars = [
        {
          Name: 'Test; Name',
          Bio: 'Line 1\nLine 2',
        },
      ];
      const vcard = generateVCard(contactsWithSpecialChars);

      expect(vcard).toContain('FN:Test\\; Name');
      expect(vcard).toContain('NOTE:Line 1\\nLine 2');
    });

    test('handles contact without First/Last Name', () => {
      const contactsWithoutNames = [
        {
          Name: 'Single Name',
          Phone: '555-1234',
        },
      ];
      const vcard = generateVCard(contactsWithoutNames);

      // FN uses Name field directly; N is empty when First/Last not provided
      expect(vcard).toContain('FN:Single Name');
      expect(vcard).toContain('N:;;;;');
    });

    test('throws error for empty contacts', () => {
      expect(() => {
        generateVCard([]);
      }).toThrow('No contacts to export');
    });
  });

  describe('generateFilename', () => {
    test('generates filename with current date', () => {
      const filename = generateFilename('test', 'csv');
      const today = new Date().toISOString().split('T')[0];
      expect(filename).toBe(`test-${today}.csv`);
    });

    test('handles different extensions', () => {
      const csvFilename = generateFilename('contacts', 'csv');
      const vcfFilename = generateFilename('contacts', 'vcf');

      expect(csvFilename).toMatch(/\.csv$/);
      expect(vcfFilename).toMatch(/\.vcf$/);
    });
  });

  describe('FIELD_PRESETS', () => {
    test('basic preset includes core fields', () => {
      expect(FIELD_PRESETS.basic).toContain('Contact ID');
      expect(FIELD_PRESETS.basic).toContain('Name');
      expect(FIELD_PRESETS.basic).toContain('Phone');
      expect(FIELD_PRESETS.basic).toContain('Email');
    });

    test('full preset includes all standard fields', () => {
      expect(FIELD_PRESETS.full.length).toBeGreaterThan(10);
      expect(FIELD_PRESETS.full).toContain('Contact ID');
      expect(FIELD_PRESETS.full).toContain('Name');
      expect(FIELD_PRESETS.full).toContain('Bio');
      expect(FIELD_PRESETS.full).toContain('Tags');
    });

    test('organizer preset includes organizing-specific fields', () => {
      expect(FIELD_PRESETS.organizer).toContain('Tags');
      expect(FIELD_PRESETS.organizer).toContain('District');
      expect(FIELD_PRESETS.organizer).toContain('Priority');
      expect(FIELD_PRESETS.organizer).toContain('Status');
    });
  });
});
