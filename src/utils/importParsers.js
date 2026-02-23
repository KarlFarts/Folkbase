import Papa from 'papaparse';

/**
 * Sanitize a value to prevent formula injection
 * Removes leading characters that could trigger formula evaluation: =, +, -, @
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeFormulaInjection(value) {
  if (!value || typeof value !== 'string') return value;
  // Remove leading formula indicators
  return value.replace(/^[=+\-@]/, '');
}

/**
 * Recursively sanitize an object to prevent formula injection in all string fields
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj) {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeFormulaInjection(sanitized[key]);
    }
  }
  return sanitized;
}

/**
 * Parse a file and return contacts with metadata
 * @param {File} file - The file to parse
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<Object>} Parse results with contacts and metadata
 */
export async function parseFile(file, onProgress) {
  const content = await file.text();
  const isVCard = file.name.toLowerCase().endsWith('.vcf');

  onProgress?.({
    phase: 'parsing',
    total: 100,
    processed: 10,
    current: `Reading ${file.name}...`,
    canCancel: false,
  });

  let contacts;
  let sourceColumns;

  if (isVCard) {
    contacts = parseVCard(content);
    // vCard always maps to standard fields
    sourceColumns = [
      'Name',
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
  } else {
    const result = await parseCSVWithMetadata(content, onProgress);
    contacts = result.contacts;
    sourceColumns = result.columns;
  }

  onProgress?.({
    phase: 'parsing',
    total: 100,
    processed: 100,
    current: 'Parsing complete!',
    canCancel: false,
  });

  return {
    contacts,
    sourceColumns,
    metadata: {
      fileName: file.name,
      fileType: isVCard ? 'vCard' : 'CSV',
      totalRows: contacts.length,
      columnCount: sourceColumns.length,
    },
  };
}

/**
 * Parse CSV with metadata and progress tracking
 */
async function parseCSVWithMetadata(csvContent, onProgress) {
  return new Promise((resolve, reject) => {
    const contacts = [];
    let columns = [];
    let rowCount = 0;

    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      step: (result) => {
        if (columns.length === 0) {
          columns = Object.keys(result.data);
        }

        // Keep raw data for mapping preview (sanitize for formula injection)
        if (Object.values(result.data).some((v) => v && v.trim())) {
          contacts.push(sanitizeObject(result.data));
        }

        rowCount++;

        // Progress update every 100 rows
        if (rowCount % 100 === 0) {
          onProgress?.({
            phase: 'parsing',
            total: 100,
            processed: 50,
            current: `Parsed ${rowCount} rows...`,
            canCancel: false,
          });
        }
      },
      complete: () => {
        resolve({ contacts, columns });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse a vCard (.vcf) file into contact objects
 * vCard format reference: https://en.wikipedia.org/wiki/VCard
 */
export function parseVCard(vcfContent) {
  const contacts = [];
  const vcards = vcfContent.split(/(?=BEGIN:VCARD)/i).filter((v) => v.trim());

  for (const vcard of vcards) {
    if (!vcard.includes('BEGIN:VCARD')) continue;

    const contact = {
      'First Name': '',
      'Last Name': '',
      'Middle Name': '',
      'Preferred Name': '',
      'Display Name': '',
      'Phone Mobile': '',
      'Phone Home': '',
      'Phone Work': '',
      'Email Personal': '',
      'Email Work': '',
      Organization: '',
      Role: '',
      Bio: '',
      Tags: '',
      Street: '',
      City: '',
      State: '',
      ZIP: '',
      Country: '',
      Website: '',
      LinkedIn: '',
      'Twitter Handle': '',
      'Date of Birth': '',
      Gender: '',
      Priority: 'Medium',
      Status: 'Active',
      // Legacy fields for backward compatibility
      Name: '',
      Phone: '',
      Email: '',
    };

    const lines = vcard.split(/\r?\n/);

    for (let line of lines) {
      // Handle line folding (lines starting with space are continuations)
      line = line.replace(/^\s+/, '');

      // FN (Formatted Name) → Display Name
      if (line.startsWith('FN:') || line.startsWith('FN;')) {
        contact['Display Name'] = extractValue(line);
        contact.Name = extractValue(line); // Legacy field
      }

      // N (Structured Name) → First/Last/Middle
      if (line.startsWith('N:') || line.startsWith('N;')) {
        const parts = extractValue(line).split(';');
        contact['Last Name'] = parts[0] || '';
        contact['First Name'] = parts[1] || '';
        contact['Middle Name'] = parts[2] || '';
      }

      // NICKNAME → Preferred Name
      if (line.startsWith('NICKNAME:') || line.startsWith('NICKNAME;')) {
        contact['Preferred Name'] = extractValue(line);
      }

      // TEL with type detection
      if (line.startsWith('TEL:') || line.startsWith('TEL;')) {
        const phone = formatPhone(extractValue(line));
        if (line.includes('TYPE=CELL') || line.includes('TYPE=MOBILE')) {
          contact['Phone Mobile'] = phone;
        } else if (line.includes('TYPE=HOME')) {
          contact['Phone Home'] = phone;
        } else if (line.includes('TYPE=WORK')) {
          contact['Phone Work'] = phone;
        } else {
          // Default to mobile if no type
          if (!contact['Phone Mobile']) contact['Phone Mobile'] = phone;
        }
        // Also set legacy Phone field to first number found
        if (!contact.Phone) contact.Phone = phone;
      }

      // EMAIL with type detection
      if (line.startsWith('EMAIL:') || line.startsWith('EMAIL;')) {
        const email = extractValue(line).toLowerCase();
        if (line.includes('TYPE=WORK')) {
          contact['Email Work'] = email;
        } else {
          // Default to personal
          contact['Email Personal'] = email;
        }
        // Also set legacy Email field to first email found
        if (!contact.Email) contact.Email = email;
      }

      // ORG → Organization
      if (line.startsWith('ORG:') || line.startsWith('ORG;')) {
        contact.Organization = extractValue(line).split(';')[0];
      }

      // TITLE → Role
      if (line.startsWith('TITLE:') || line.startsWith('TITLE;')) {
        contact.Role = extractValue(line);
      }

      // ADR (Address) → Street, City, State, ZIP, Country
      if (line.startsWith('ADR:') || line.startsWith('ADR;')) {
        const parts = extractValue(line).split(';');
        contact.Street = parts[2] || '';
        contact.City = parts[3] || '';
        contact.State = parts[4] || '';
        contact.ZIP = parts[5] || '';
        contact.Country = parts[6] || '';
      }

      // URL → Website
      if (line.startsWith('URL:') || line.startsWith('URL;')) {
        contact.Website = extractValue(line);
      }

      // Social profiles
      if (line.includes('linkedin')) {
        contact.LinkedIn = extractValue(line);
      }
      if (line.includes('twitter')) {
        contact['Twitter Handle'] = extractValue(line);
      }

      // BDAY → Date of Birth (convert YYYYMMDD to YYYY-MM-DD)
      if (line.startsWith('BDAY:') || line.startsWith('BDAY;')) {
        const bday = extractValue(line);
        if (bday.length === 8) {
          contact['Date of Birth'] = `${bday.slice(0, 4)}-${bday.slice(4, 6)}-${bday.slice(6, 8)}`;
        }
      }

      // X-GENDER → Gender
      if (line.startsWith('X-GENDER:') || line.startsWith('X-GENDER;')) {
        contact.Gender = extractValue(line);
      }

      // NOTE → Bio
      if (line.startsWith('NOTE:') || line.startsWith('NOTE;')) {
        contact.Bio = extractValue(line);
      }

      // CATEGORIES → Tags
      if (line.startsWith('CATEGORIES:') || line.startsWith('CATEGORIES;')) {
        contact.Tags = extractValue(line);
      }
    }

    // Only add if has at least a name
    if (contact['Display Name'] || contact['First Name'] || contact['Last Name']) {
      contacts.push(sanitizeObject(contact));
    }
  }

  return contacts;
}

/**
 * Extract value from vCard line (handles parameters like TYPE=)
 */
function extractValue(line) {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return '';
  return line.substring(colonIndex + 1).trim();
}

/**
 * Format phone number consistently
 */
function formatPhone(phone) {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Format as XXX-XXX-XXXX for US numbers
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return cleaned number for international or other formats
  return phone.trim();
}
