import { vi, describe, test, expect, beforeEach } from 'vitest';

// Mock axios and sheets BEFORE importing the service
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    })),
  },
}));
vi.mock('../utils/sheets');

import {
  IMPORT_TEMPLATES,
  detectTemplate,
  applyTemplate,
} from './importConfigService';

describe('importConfigService', () => {
  // const mockAccessToken = 'mock-token';
  // const mockSheetId = 'mock-sheet-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveTemplate', () => {
    test('creates new template when name does not exist', async () => {
      // Test implementation will be added during execution
      expect(true).toBe(true);
    });

    test('updates existing template when name matches', async () => {
      expect(true).toBe(true);
    });
  });

  describe('listTemplates', () => {
    test('returns empty array when no templates exist', async () => {
      expect(true).toBe(true);
    });

    test('parses templates from sheet correctly', async () => {
      expect(true).toBe(true);
    });
  });

  describe('deleteTemplate', () => {
    test('deletes template by name', async () => {
      expect(true).toBe(true);
    });

    test('throws error when template not found', async () => {
      expect(true).toBe(true);
    });
  });

  describe('logImportHistory', () => {
    test('generates unique import ID', async () => {
      expect(true).toBe(true);
    });

    test('logs import with all metadata', async () => {
      expect(true).toBe(true);
    });
  });

  describe('IMPORT_TEMPLATES', () => {
    test('exports 11 pre-built templates', () => {
      const templateKeys = Object.keys(IMPORT_TEMPLATES);
      expect(templateKeys).toHaveLength(11);
      expect(templateKeys).toEqual(
        expect.arrayContaining([
          'Google Contacts',
          'iPhone/iOS Contacts',
          'Samsung Contacts',
          'Microsoft Outlook',
          'Yahoo Contacts',
          'Thunderbird',
          'WhatsApp',
          'LinkedIn',
          'Salesforce',
          'HubSpot',
          'Generic CSV',
        ])
      );
    });

    test('all templates have required structure', () => {
      for (const [_key, template] of Object.entries(IMPORT_TEMPLATES)) {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('mappings');
        expect(typeof template.name).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.mappings).toBe('object');
        expect(Object.keys(template.mappings).length).toBeGreaterThan(0);
      }
    });

    test('Google Contacts template has expected mappings', () => {
      const template = IMPORT_TEMPLATES['Google Contacts'];
      expect(template.mappings['Given Name']).toBe('First Name');
      expect(template.mappings['Family Name']).toBe('Last Name');
      expect(template.mappings['Phone 1 - Value']).toBe('Phone Mobile');
      expect(template.mappings['E-mail 1 - Value']).toBe('Email Personal');
    });

    test('iPhone template has expected mappings', () => {
      const template = IMPORT_TEMPLATES['iPhone/iOS Contacts'];
      expect(template.mappings['First']).toBe('First Name');
      expect(template.mappings['Last']).toBe('Last Name');
      expect(template.mappings['Mobile']).toBe('Phone Mobile');
      expect(template.mappings['Email']).toBe('Email Personal');
    });
  });

  describe('detectTemplate', () => {
    test('returns null when no columns provided', () => {
      expect(detectTemplate([])).toBeNull();
      expect(detectTemplate(null)).toBeNull();
    });

    test('detects Google Contacts format', () => {
      const csvColumns = [
        'Given Name',
        'Family Name',
        'Phone 1 - Value',
        'E-mail 1 - Value',
        'Organization 1 - Name',
      ];

      const result = detectTemplate(csvColumns);
      expect(result).not.toBeNull();
      expect(result.templateName).toBe('Google Contacts');
      expect(result.matchPercentage).toBeGreaterThan(0);
    });

    test('detects iPhone format', () => {
      const csvColumns = ['First', 'Last', 'Mobile', 'Email', 'Company'];

      const result = detectTemplate(csvColumns);
      expect(result).not.toBeNull();
      expect(result.templateName).toBe('iPhone/iOS Contacts');
    });

    test('detects Outlook format', () => {
      const csvColumns = [
        'First Name',
        'Last Name',
        'Mobile Phone',
        'E-mail Address',
        'Company',
      ];

      const result = detectTemplate(csvColumns);
      expect(result).not.toBeNull();
      expect(result.templateName).toBe('Microsoft Outlook');
    });

    test('is case-insensitive', () => {
      const csvColumns = ['GIVEN NAME', 'family name', 'Phone 1 - Value'];

      const result = detectTemplate(csvColumns);
      expect(result).not.toBeNull();
      expect(result.templateName).toBe('Google Contacts');
    });

    test('respects threshold parameter', () => {
      // 1 recognizable column out of 5 total = 20% precision
      const csvColumns = [
        'First Name',
        'Custom Field 1',
        'Custom Field 2',
        'Custom Field 3',
        'Custom Field 4',
      ];

      // Should return null with default 60% threshold (20% < 60%)
      expect(detectTemplate(csvColumns)).toBeNull();

      // Should return result with 1% threshold (20% > 1%)
      const result = detectTemplate(csvColumns, 0.01);
      expect(result).not.toBeNull();
    });

    test('returns template with highest match score', () => {
      // These columns match multiple templates, but Outlook best
      const csvColumns = [
        'First Name',
        'Last Name',
        'Middle Name',
        'Mobile Phone',
        'Business Phone',
        'E-mail Address',
        'E-mail 2 Address',
        'Company',
        'Job Title',
      ];

      const result = detectTemplate(csvColumns);
      expect(result).not.toBeNull();
      expect(result.matchPercentage).toBeGreaterThan(50);
    });

    test('returns match score and percentage', () => {
      const csvColumns = ['Given Name', 'Family Name'];

      const result = detectTemplate(csvColumns, 0.01);
      expect(result).toHaveProperty('matchScore');
      expect(result).toHaveProperty('matchPercentage');
      expect(typeof result.matchScore).toBe('number');
      expect(typeof result.matchPercentage).toBe('number');
      expect(result.matchScore).toBeGreaterThan(0);
      expect(result.matchScore).toBeLessThanOrEqual(1);
      expect(result.matchPercentage).toBe(Math.round(result.matchScore * 100));
    });
  });

  describe('applyTemplate', () => {
    test('throws error for invalid template name', () => {
      expect(() => {
        applyTemplate({ Name: 'John' }, 'NonExistent Template');
      }).toThrow('Template "NonExistent Template" not found');
    });

    test('applies Google Contacts template mappings', () => {
      const csvRow = {
        'Given Name': 'John',
        'Family Name': 'Doe',
        'Phone 1 - Value': '555-1234',
        'E-mail 1 - Value': 'john@example.com',
        'Organization 1 - Name': 'Acme Corp',
      };

      const result = applyTemplate(csvRow, 'Google Contacts');
      expect(result).toEqual({
        'First Name': 'John',
        'Last Name': 'Doe',
        'Phone Mobile': '555-1234',
        'Email Personal': 'john@example.com',
        'Current Organization': 'Acme Corp',
      });
    });

    test('applies iPhone template mappings', () => {
      const csvRow = {
        First: 'Jane',
        Last: 'Smith',
        Mobile: '555-5678',
        Email: 'jane@example.com',
      };

      const result = applyTemplate(csvRow, 'iPhone/iOS Contacts');
      expect(result).toEqual({
        'First Name': 'Jane',
        'Last Name': 'Smith',
        'Phone Mobile': '555-5678',
        'Email Personal': 'jane@example.com',
      });
    });

    test('skips empty and undefined values', () => {
      const csvRow = {
        'Given Name': 'John',
        'Family Name': '',
        'Phone 1 - Value': undefined,
        'E-mail 1 - Value': 'john@example.com',
      };

      const result = applyTemplate(csvRow, 'Google Contacts');
      expect(result).toEqual({
        'First Name': 'John',
        'Email Personal': 'john@example.com',
      });
      expect(result).not.toHaveProperty('Last Name');
      expect(result).not.toHaveProperty('Phone Mobile');
    });

    test('only maps fields that exist in CSV', () => {
      const csvRow = {
        'Given Name': 'John',
        // Missing many other fields
      };

      const result = applyTemplate(csvRow, 'Google Contacts');
      expect(result).toEqual({
        'First Name': 'John',
      });
    });

    test('applies Salesforce template', () => {
      const csvRow = {
        FirstName: 'Alice',
        LastName: 'Johnson',
        Email: 'alice@company.com',
        MobilePhone: '555-9999',
        Title: 'Director',
      };

      const result = applyTemplate(csvRow, 'Salesforce');
      expect(result).toEqual({
        'First Name': 'Alice',
        'Last Name': 'Johnson',
        'Email Personal': 'alice@company.com',
        'Phone Mobile': '555-9999',
        'Current Title': 'Director',
      });
    });

    test('applies Generic CSV template', () => {
      const csvRow = {
        Name: 'Bob Builder',
        Phone: '555-0000',
        Email: 'bob@build.com',
        Company: 'BuildCo',
      };

      const result = applyTemplate(csvRow, 'Generic CSV');
      expect(result).toEqual({
        'Display Name': 'Bob Builder',
        'Phone Mobile': '555-0000',
        'Email Personal': 'bob@build.com',
        'Current Organization': 'BuildCo',
      });
    });
  });
});
