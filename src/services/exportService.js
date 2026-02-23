import Papa from 'papaparse';

// Field presets for export
export const FIELD_PRESETS = {
  basic: ['Contact ID', 'Name', 'Phone', 'Email'],
  full: [
    'Contact ID',
    'Name',
    'First Name',
    'Last Name',
    'Phone',
    'Email',
    'Organization',
    'Role',
    'Priority',
    'Status',
    'District',
    'Tags',
    'Bio',
    'Date Added',
    'Last Contact Date'
  ],
  organizer: [
    'Contact ID',
    'Name',
    'Phone',
    'Email',
    'Tags',
    'District',
    'Priority',
    'Status',
    'Last Contact Date'
  ]
};

// Get all available fields from contacts
export function getAllFields(contacts) {
  if (!contacts || contacts.length === 0) {
    return FIELD_PRESETS.full;
  }

  const fieldsSet = new Set();
  contacts.forEach(contact => {
    Object.keys(contact).forEach(key => fieldsSet.add(key));
  });

  return Array.from(fieldsSet).sort();
}

/**
 * Generate CSV from contacts array
 * @param {Array} contacts - Array of contact objects
 * @param {Array} selectedFields - Array of field names to include
 * @returns {string} CSV string with UTF-8 BOM
 */
export function generateCSV(contacts, selectedFields) {
  if (!contacts || contacts.length === 0) {
    throw new Error('No contacts to export');
  }

  // Filter contacts to only include selected fields
  const filteredContacts = contacts.map(contact => {
    const filtered = {};
    selectedFields.forEach(field => {
      filtered[field] = contact[field] || '';
    });
    return filtered;
  });

  // Use PapaParse to convert to CSV
  const csv = Papa.unparse(filteredContacts, {
    quotes: true, // Quote all fields
    header: true,
    newline: '\r\n' // CRLF for Windows compatibility
  });

  // Add UTF-8 BOM for Excel compatibility
  return '\uFEFF' + csv;
}

/**
 * Generate vCard 3.0 format from contacts array
 * @param {Array} contacts - Array of contact objects
 * @returns {string} vCard string
 */
export function generateVCard(contacts) {
  if (!contacts || contacts.length === 0) {
    throw new Error('No contacts to export');
  }

  const vCards = contacts.map((contact) => {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];

    // FN (Formatted Name) - use Display Name or fallback to Name
    const displayName = contact['Display Name'] || contact['Name'] || 'Unknown';
    lines.push(`FN:${escapeVCardValue(displayName)}`);

    // N (Structured Name) - Last;First;Middle;Prefix;Suffix
    const lastName = contact['Last Name'] || '';
    const firstName = contact['First Name'] || '';
    const middleName = contact['Middle Name'] || '';
    lines.push(
      `N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};${escapeVCardValue(middleName)};;`
    );

    // NICKNAME (Preferred Name)
    if (contact['Preferred Name']) {
      lines.push(`NICKNAME:${escapeVCardValue(contact['Preferred Name'])}`);
    }

    // Phones with types
    if (contact['Phone Mobile']) {
      lines.push(`TEL;TYPE=CELL:${escapeVCardValue(contact['Phone Mobile'])}`);
    }
    if (contact['Phone Home']) {
      lines.push(`TEL;TYPE=HOME:${escapeVCardValue(contact['Phone Home'])}`);
    }
    if (contact['Phone Work']) {
      lines.push(`TEL;TYPE=WORK:${escapeVCardValue(contact['Phone Work'])}`);
    }
    // Legacy Phone field (fallback)
    if (contact['Phone'] && !contact['Phone Mobile']) {
      lines.push(`TEL;TYPE=CELL:${escapeVCardValue(contact['Phone'])}`);
    }

    // Emails with types
    if (contact['Email Personal']) {
      lines.push(`EMAIL;TYPE=HOME:${escapeVCardValue(contact['Email Personal'])}`);
    }
    if (contact['Email Work']) {
      lines.push(`EMAIL;TYPE=WORK:${escapeVCardValue(contact['Email Work'])}`);
    }
    // Legacy Email field (fallback)
    if (contact['Email'] && !contact['Email Personal']) {
      lines.push(`EMAIL;TYPE=HOME:${escapeVCardValue(contact['Email'])}`);
    }

    // Organization + Role
    if (contact['Organization']) {
      lines.push(`ORG:${escapeVCardValue(contact['Organization'])}`);
    }
    if (contact['Role']) {
      lines.push(`TITLE:${escapeVCardValue(contact['Role'])}`);
    }

    // Structured Address (ADR) - ;;Street;City;State;ZIP;Country
    if (contact['Mailing Address'] || contact['Street']) {
      const street = contact['Street'] || contact['Mailing Address'] || '';
      const city = contact['City'] || '';
      const state = contact['State'] || '';
      const zip = contact['ZIP'] || '';
      const country = contact['Country'] || '';
      lines.push(
        `ADR;TYPE=HOME:;;${escapeVCardValue(street)};${escapeVCardValue(city)};${escapeVCardValue(state)};${escapeVCardValue(zip)};${escapeVCardValue(country)}`
      );
    }

    // URLs
    if (contact['Website']) {
      lines.push(`URL:${escapeVCardValue(contact['Website'])}`);
    }
    if (contact['LinkedIn']) {
      lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${escapeVCardValue(contact['LinkedIn'])}`);
    }
    if (contact['Twitter Handle']) {
      lines.push(`X-SOCIALPROFILE;TYPE=twitter:${escapeVCardValue(contact['Twitter Handle'])}`);
    }

    // Birthday (BDAY) - convert YYYY-MM-DD to YYYYMMDD
    if (contact['Date of Birth']) {
      const bday = contact['Date of Birth'].replace(/-/g, '');
      lines.push(`BDAY:${bday}`);
    }

    // Gender
    if (contact['Gender']) {
      lines.push(`X-GENDER:${escapeVCardValue(contact['Gender'])}`);
    }

    // Note (Bio)
    if (contact['Bio']) {
      lines.push(`NOTE:${escapeVCardValue(contact['Bio'])}`);
    }

    // Categories (Tags)
    if (contact['Tags']) {
      lines.push(`CATEGORIES:${escapeVCardValue(contact['Tags'])}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
  });

  return vCards.join('\r\n') + '\r\n';
}

/**
 * Escape special characters in vCard values
 * @param {string} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeVCardValue(value) {
  if (!value) return '';

  return String(value)
    .replace(/\\/g, '\\\\')  // Backslash
    .replace(/;/g, '\\;')    // Semicolon
    .replace(/,/g, '\\,')    // Comma
    .replace(/\n/g, '\\n');  // Newline
}

/**
 * Trigger browser download of file
 * @param {string} content - File content
 * @param {string} filename - Filename with extension
 * @param {string} mimeType - MIME type (e.g., 'text/csv', 'text/vcard')
 */
export function downloadFile(content, filename, mimeType) {
  // Create blob
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });

  // Create temporary download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Trigger download
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with current date
 * @param {string} prefix - Filename prefix (e.g., 'touchpoint-contacts')
 * @param {string} extension - File extension without dot (e.g., 'csv', 'vcf')
 * @returns {string} Filename with date
 */
export function generateFilename(prefix, extension) {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}-${date}.${extension}`;
}
