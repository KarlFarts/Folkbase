import { validateEmail, formatPhone, validateDropdownValue, validateRequiredFields, validateContact } from './importValidator';

describe('importValidator - Email Validation', () => {
  test('accepts valid email addresses', () => {
    const result = validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('rejects empty email', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email is required');
  });

  test('rejects email without @ symbol', () => {
    const result = validateEmail('userexample.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  test('rejects email without domain', () => {
    const result = validateEmail('user@');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  test('rejects email without local part', () => {
    const result = validateEmail('@example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  test('accepts email with subdomain', () => {
    const result = validateEmail('user@mail.example.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('accepts email with plus addressing', () => {
    const result = validateEmail('user+tag@example.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('trims whitespace from email', () => {
    const result = validateEmail('  user@example.com  ');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('user@example.com');
  });

  test('allows undefined email (optional field)', () => {
    const result = validateEmail(undefined);
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });

  test('allows null email (optional field)', () => {
    const result = validateEmail(null);
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });
});

describe('importValidator - Phone Formatting', () => {
  test('formats 10-digit phone with dashes', () => {
    const result = formatPhone('5551234567');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('555-123-4567');
  });

  test('formats phone with parentheses and spaces', () => {
    const result = formatPhone('(555) 123-4567');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('555-123-4567');
  });

  test('formats phone with dots', () => {
    const result = formatPhone('555.123.4567');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('555-123-4567');
  });

  test('formats phone with spaces', () => {
    const result = formatPhone('555 123 4567');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('555-123-4567');
  });

  test('removes non-numeric characters except formatting', () => {
    const result = formatPhone('+1-555-123-4567');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('555-123-4567');
  });

  test('trims whitespace from phone', () => {
    const result = formatPhone('  555-123-4567  ');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('555-123-4567');
  });

  test('rejects phone with too few digits', () => {
    const result = formatPhone('555123');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Phone must be 10 digits');
  });

  test('rejects phone with too many digits', () => {
    const result = formatPhone('55512345678901');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Phone must be 10 digits');
  });

  test('rejects phone with letters', () => {
    const result = formatPhone('555CALLNOW');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Phone must be 10 digits');
  });

  test('allows undefined phone (optional field)', () => {
    const result = formatPhone(undefined);
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });

  test('allows null phone (optional field)', () => {
    const result = formatPhone(null);
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });

  test('allows empty phone string (optional field)', () => {
    const result = formatPhone('');
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });
});

describe('importValidator - Dropdown Value Fuzzy Matching', () => {
  const allowedPriorities = ['High', 'Medium', 'Low'];
  const allowedStatuses = ['Active', 'Inactive', 'Prospect'];

  test('accepts exact match (case-sensitive)', () => {
    const result = validateDropdownValue('High', allowedPriorities, 'Priority');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('High');
    expect(result.suggestion).toBeUndefined();
  });

  test('suggests match for case difference', () => {
    const result = validateDropdownValue('high', allowedPriorities, 'Priority');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('High');
    expect(result.suggestion).toBe('High');
  });

  test('suggests match for extra whitespace', () => {
    const result = validateDropdownValue('  High  ', allowedPriorities, 'Priority');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('High');
    expect(result.suggestion).toBe('High');
  });

  test('suggests match for similar spelling (typo)', () => {
    const result = validateDropdownValue('Hight', allowedPriorities, 'Priority');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('High');
    expect(result.suggestion).toBe('High');
  });

  test('suggests match for partial match', () => {
    const result = validateDropdownValue('Inact', allowedStatuses, 'Status');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('Inactive');
    expect(result.suggestion).toBe('Inactive');
  });

  test('rejects value with no close match', () => {
    const result = validateDropdownValue('VeryHigh', allowedPriorities, 'Priority');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Priority must be one of: High, Medium, Low');
  });

  test('rejects completely different value', () => {
    const result = validateDropdownValue('xyz123', allowedPriorities, 'Priority');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Priority must be one of: High, Medium, Low');
  });

  test('allows undefined value (optional field)', () => {
    const result = validateDropdownValue(undefined, allowedPriorities, 'Priority');
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });

  test('allows null value (optional field)', () => {
    const result = validateDropdownValue(null, allowedPriorities, 'Priority');
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });

  test('allows empty string (optional field)', () => {
    const result = validateDropdownValue('', allowedPriorities, 'Priority');
    expect(result.isValid).toBe(true);
    expect(result.value).toBeUndefined();
  });

  test('suggests best match when multiple similar options exist', () => {
    const districts = ['District 1', 'District 2', 'District 10'];
    const result = validateDropdownValue('District1', districts, 'District');
    expect(result.isValid).toBe(true);
    expect(result.value).toBe('District 1');
    expect(result.suggestion).toBe('District 1');
  });
});

describe('importValidator - Required Fields Validation', () => {
  test('passes when all required fields are present', () => {
    const contact = { Name: 'John Smith', Email: 'john@example.com', Phone: '555-123-4567' };
    const requiredFields = ['Name', 'Email'];
    const result = validateRequiredFields(contact, requiredFields);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('fails when required field is missing', () => {
    const contact = { Email: 'john@example.com', Phone: '555-123-4567' };
    const requiredFields = ['Name', 'Email'];
    const result = validateRequiredFields(contact, requiredFields);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  test('fails when required field is undefined', () => {
    const contact = { Name: undefined, Email: 'john@example.com' };
    const requiredFields = ['Name'];
    const result = validateRequiredFields(contact, requiredFields);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  test('fails when required field is null', () => {
    const contact = { Name: null, Email: 'john@example.com' };
    const requiredFields = ['Name'];
    const result = validateRequiredFields(contact, requiredFields);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  test('fails when required field is empty string', () => {
    const contact = { Name: '', Email: 'john@example.com' };
    const requiredFields = ['Name'];
    const result = validateRequiredFields(contact, requiredFields);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  test('fails when required field is only whitespace', () => {
    const contact = { Name: '   ', Email: 'john@example.com' };
    const requiredFields = ['Name'];
    const result = validateRequiredFields(contact, requiredFields);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required');
  });

  test('collects multiple missing field errors', () => {
    const contact = { Phone: '555-123-4567' };
    const requiredFields = ['Name', 'Email'];
    const result = validateRequiredFields(contact, requiredFields);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Name is required');
    expect(result.errors).toContain('Email is required');
    expect(result.errors.length).toBe(2);
  });

  test('passes with no required fields', () => {
    const contact = { Phone: '555-123-4567' };
    const requiredFields = [];
    const result = validateRequiredFields(contact, requiredFields);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('importValidator - Complete Contact Validation', () => {
  const validationOptions = {
    requiredFields: ['Name'],
    dropdownFields: {
      Priority: ['High', 'Medium', 'Low'],
      Status: ['Active', 'Inactive', 'Prospect']
    }
  };

  test('passes validation with all valid data', () => {
    const contact = {
      Name: 'John Smith',
      Email: 'john@example.com',
      Phone: '5551234567',
      Priority: 'High',
      Status: 'Active'
    };
    const result = validateContact(contact, validationOptions);
    expect(result.isValid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.correctedContact.Phone).toBe('555-123-4567');
  });

  test('collects all validation issues', () => {
    const contact = {
      Name: '',
      Email: 'invalid-email',
      Phone: '123',
      Priority: 'VeryHigh',
      Status: 'Active'
    };
    const result = validateContact(contact, validationOptions);
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.some(issue => issue.field === 'Name')).toBe(true);
    expect(result.issues.some(issue => issue.field === 'Email')).toBe(true);
    expect(result.issues.some(issue => issue.field === 'Phone')).toBe(true);
    expect(result.issues.some(issue => issue.field === 'Priority')).toBe(true);
  });

  test('auto-corrects phone and email formatting', () => {
    const contact = {
      Name: 'John Smith',
      Email: '  john@example.com  ',
      Phone: '(555) 123-4567'
    };
    const result = validateContact(contact, validationOptions);
    expect(result.correctedContact.Email).toBe('john@example.com');
    expect(result.correctedContact.Phone).toBe('555-123-4567');
  });

  test('suggests corrections for dropdown values', () => {
    const contact = {
      Name: 'John Smith',
      Priority: 'high',
      Status: 'active'
    };
    const result = validateContact(contact, validationOptions);
    expect(result.correctedContact.Priority).toBe('High');
    expect(result.correctedContact.Status).toBe('Active');
    expect(result.issues.some(issue => issue.type === 'suggestion')).toBe(true);
  });

  test('works without validation options', () => {
    const contact = {
      Name: 'John Smith',
      Email: 'john@example.com'
    };
    const result = validateContact(contact);
    expect(result.isValid).toBe(true);
    expect(result.correctedContact.Email).toBe('john@example.com');
  });
});
