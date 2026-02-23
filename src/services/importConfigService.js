import axios from 'axios';
import { SHEET_NAMES, API_CONFIG } from '../config/constants';
import { appendRow, readSheetData } from '../utils/devModeWrapper';

const SHEETS_API_BASE = API_CONFIG.SHEETS_API_BASE;

/**
 * Pre-built field mapping templates for common contact export formats
 * These templates map source columns (from CSV/vCard) to Folkbase fields
 */
export const IMPORT_TEMPLATES = {
  'Google Contacts': {
    name: 'Google Contacts',
    description: 'Google Contacts CSV export format',
    mappings: {
      'Given Name': 'First Name',
      'Family Name': 'Last Name',
      'Middle Name': 'Middle Name',
      'Name Prefix': 'Prefix',
      'Name Suffix': 'Suffix',
      Nickname: 'Preferred Name',
      'Phone 1 - Value': 'Phone Mobile',
      'Phone 2 - Value': 'Phone Home',
      'Phone 3 - Value': 'Phone Work',
      'E-mail 1 - Value': 'Email Personal',
      'E-mail 2 - Value': 'Email Work',
      'Organization 1 - Name': 'Current Organization',
      'Organization 1 - Title': 'Current Title',
      'Address 1 - Street': 'Street Address',
      'Address 1 - City': 'City',
      'Address 1 - Region': 'State',
      'Address 1 - Postal Code': 'ZIP Code',
      Notes: 'Bio',
      'Website 1 - Value': 'Website',
      Birthday: 'Date of Birth',
    },
  },

  'iPhone/iOS Contacts': {
    name: 'iPhone/iOS Contacts',
    description: 'iPhone Contacts CSV export (via iCloud or third-party apps)',
    mappings: {
      First: 'First Name',
      Last: 'Last Name',
      Middle: 'Middle Name',
      Title: 'Prefix',
      Suffix: 'Suffix',
      Nickname: 'Preferred Name',
      Mobile: 'Phone Mobile',
      Home: 'Phone Home',
      Work: 'Phone Work',
      Main: 'Phone Mobile',
      iPhone: 'Phone Mobile',
      'Home Email': 'Email Personal',
      'Work Email': 'Email Work',
      Email: 'Email Personal',
      Company: 'Current Organization',
      'Job Title': 'Current Title',
      Department: 'Department',
      Street: 'Street Address',
      City: 'City',
      State: 'State',
      ZIP: 'ZIP Code',
      Country: 'Country',
      Note: 'Bio',
      Birthday: 'Date of Birth',
    },
  },

  'Samsung Contacts': {
    name: 'Samsung Contacts',
    description: 'Samsung Contacts CSV export format',
    mappings: {
      'First name': 'First Name',
      'Last name': 'Last Name',
      'Middle name': 'Middle Name',
      'Name prefix': 'Prefix',
      'Name suffix': 'Suffix',
      'Mobile phone': 'Phone Mobile',
      'Home phone': 'Phone Home',
      'Work phone': 'Phone Work',
      'E-mail': 'Email Personal',
      'E-mail 2': 'Email Work',
      Organization: 'Current Organization',
      'Job title': 'Current Title',
      Street: 'Street Address',
      City: 'City',
      'State/Province': 'State',
      'Postal code': 'ZIP Code',
      Notes: 'Bio',
    },
  },

  'Microsoft Outlook': {
    name: 'Microsoft Outlook',
    description: 'Microsoft Outlook CSV export format',
    mappings: {
      'First Name': 'First Name',
      'Last Name': 'Last Name',
      'Middle Name': 'Middle Name',
      Title: 'Prefix',
      Suffix: 'Suffix',
      Nickname: 'Preferred Name',
      'Mobile Phone': 'Phone Mobile',
      'Home Phone': 'Phone Home',
      'Business Phone': 'Phone Work',
      'E-mail Address': 'Email Personal',
      'E-mail 2 Address': 'Email Work',
      Company: 'Current Organization',
      'Job Title': 'Current Title',
      Department: 'Department',
      'Business Street': 'Street Address',
      'Business City': 'City',
      'Business State': 'State',
      'Business Postal Code': 'ZIP Code',
      Notes: 'Bio',
      'Web Page': 'Website',
      Birthday: 'Date of Birth',
    },
  },

  'Yahoo Contacts': {
    name: 'Yahoo Contacts',
    description: 'Yahoo Mail contacts CSV export',
    mappings: {
      First: 'First Name',
      Last: 'Last Name',
      Middle: 'Middle Name',
      Nickname: 'Preferred Name',
      Mobile: 'Phone Mobile',
      Home: 'Phone Home',
      Work: 'Phone Work',
      'Personal Email': 'Email Personal',
      'Work Email': 'Email Work',
      Company: 'Current Organization',
      JobTitle: 'Current Title',
      Street: 'Street Address',
      City: 'City',
      State: 'State',
      Zip: 'ZIP Code',
      Notes: 'Bio',
    },
  },

  Thunderbird: {
    name: 'Mozilla Thunderbird',
    description: 'Thunderbird address book CSV export',
    mappings: {
      'First Name': 'First Name',
      'Last Name': 'Last Name',
      'Display Name': 'Display Name',
      Nickname: 'Preferred Name',
      'Primary Email': 'Email Personal',
      'Secondary Email': 'Email Work',
      'Work Phone': 'Phone Work',
      'Home Phone': 'Phone Home',
      'Mobile Number': 'Phone Mobile',
      Organization: 'Current Organization',
      'Job Title': 'Current Title',
      Department: 'Department',
      'Home Address': 'Street Address',
      'Home City': 'City',
      'Home State': 'State',
      'Home ZipCode': 'ZIP Code',
      Notes: 'Bio',
      'Web Page 1': 'Website',
      'Birth Year': 'Date of Birth',
    },
  },

  WhatsApp: {
    name: 'WhatsApp',
    description: 'WhatsApp contacts export (via phone backup)',
    mappings: {
      Name: 'Display Name',
      Phone: 'Phone Mobile',
      'E-mail': 'Email Personal',
    },
  },

  LinkedIn: {
    name: 'LinkedIn Connections',
    description: 'LinkedIn connections CSV export',
    mappings: {
      'First Name': 'First Name',
      'Last Name': 'Last Name',
      'Email Address': 'Email Personal',
      Company: 'Current Organization',
      Position: 'Current Title',
    },
  },

  Salesforce: {
    name: 'Salesforce',
    description: 'Salesforce Contacts CSV export',
    mappings: {
      FirstName: 'First Name',
      LastName: 'Last Name',
      Salutation: 'Prefix',
      Email: 'Email Personal',
      Phone: 'Phone Work',
      MobilePhone: 'Phone Mobile',
      HomePhone: 'Phone Home',
      Title: 'Current Title',
      'Account.Name': 'Current Organization',
      Department: 'Department',
      MailingStreet: 'Street Address',
      MailingCity: 'City',
      MailingState: 'State',
      MailingPostalCode: 'ZIP Code',
      Description: 'Bio',
    },
  },

  HubSpot: {
    name: 'HubSpot',
    description: 'HubSpot CRM contacts export',
    mappings: {
      'First Name': 'First Name',
      'Last Name': 'Last Name',
      Email: 'Email Personal',
      'Phone Number': 'Phone Work',
      'Mobile Phone Number': 'Phone Mobile',
      'Job Title': 'Current Title',
      'Company Name': 'Current Organization',
      'Street Address': 'Street Address',
      City: 'City',
      'State/Region': 'State',
      'Postal Code': 'ZIP Code',
      'Website URL': 'Website',
    },
  },

  'Generic CSV': {
    name: 'Generic CSV',
    description: 'Common field names used by most contact apps',
    mappings: {
      Name: 'Display Name',
      'First Name': 'First Name',
      'Last Name': 'Last Name',
      Phone: 'Phone Mobile',
      Mobile: 'Phone Mobile',
      Cell: 'Phone Mobile',
      Email: 'Email Personal',
      Company: 'Current Organization',
      Organization: 'Current Organization',
      Title: 'Current Title',
      Address: 'Street Address',
      Notes: 'Bio',
    },
  },
};

/**
 * Auto-detect the best matching template for imported CSV columns
 * Returns template name if match score >= threshold (default 60%)
 */
export function detectTemplate(csvColumns, threshold = 0.6) {
  if (!csvColumns || csvColumns.length === 0) return null;

  const columnSet = new Set(csvColumns.map((col) => col.toLowerCase().trim()));
  let bestMatch = null;
  let bestScore = 0;

  for (const [templateKey, template] of Object.entries(IMPORT_TEMPLATES)) {
    const templateColumns = Object.keys(template.mappings);
    let matchCount = 0;

    for (const templateCol of templateColumns) {
      if (columnSet.has(templateCol.toLowerCase())) {
        matchCount++;
      }
    }

    const score = matchCount / csvColumns.length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = templateKey;
    }
  }

  // Return best match if it meets threshold
  if (bestScore >= threshold) {
    return {
      templateName: bestMatch,
      template: IMPORT_TEMPLATES[bestMatch],
      matchScore: bestScore,
      matchPercentage: Math.round(bestScore * 100),
    };
  }

  return null;
}

/**
 * Apply a template's mappings to CSV data
 * Returns an object with Folkbase field names
 */
export function applyTemplate(csvRow, templateName) {
  const template = IMPORT_TEMPLATES[templateName];
  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  const mappedData = {};

  for (const [sourceField, targetField] of Object.entries(template.mappings)) {
    if (csvRow[sourceField] !== undefined && csvRow[sourceField] !== '') {
      mappedData[targetField] = csvRow[sourceField];
    }
  }

  return mappedData;
}

/**
 * Create axios instance with auth header
 */
function createSheetsClient(accessToken) {
  return axios.create({
    baseURL: SHEETS_API_BASE,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Check if a sheet tab exists in the spreadsheet
 */
async function sheetTabExists(accessToken, sheetId, tabName) {
  const client = createSheetsClient(accessToken);
  const response = await client.get(`/${sheetId}`, {
    params: {
      fields: 'sheets.properties.title',
    },
  });

  const sheets = response.data.sheets || [];
  return sheets.some((sheet) => sheet.properties.title === tabName);
}

/**
 * Create a new sheet tab with headers
 */
async function createSheetTab(accessToken, sheetId, tabName, headers) {
  const client = createSheetsClient(accessToken);

  // Step 1: Add the sheet
  await client.post(`/${sheetId}:batchUpdate`, {
    requests: [
      {
        addSheet: {
          properties: {
            title: tabName,
          },
        },
      },
    ],
  });

  // Step 2: Add headers to first row
  await client.put(
    `/${sheetId}/values/${tabName}!A1`,
    {
      values: [headers],
    },
    {
      params: {
        valueInputOption: 'USER_ENTERED',
      },
    }
  );
}

/**
 * Ensure Import Settings tab exists, create if missing
 */
export async function ensureImportSettingsTabExists(accessToken, sheetId) {
  const tabName = SHEET_NAMES.IMPORT_SETTINGS;

  // Check if tab exists
  const exists = await sheetTabExists(accessToken, sheetId, tabName);

  if (!exists) {
    // Create tab with headers
    const headers = [
      'Template Name',
      'Source System',
      'File Type',
      'Field Mappings',
      'Created By',
      'Created Date',
      'Last Used',
      'Use Count',
    ];

    await createSheetTab(accessToken, sheetId, tabName, headers);
  }

  return true;
}

/**
 * Ensure Import History tab exists, create if missing
 */
export async function ensureImportHistoryTabExists(accessToken, sheetId) {
  const tabName = SHEET_NAMES.IMPORT_HISTORY;

  // Check if tab exists
  const exists = await sheetTabExists(accessToken, sheetId, tabName);

  if (!exists) {
    // Create tab with headers
    const headers = [
      'Import ID',
      'Filename',
      'Import Date',
      'Imported By',
      'Total Rows',
      'Contacts Added',
      'Duplicates Merged',
      'Duplicates Skipped',
      'Invalid Excluded',
      'Template Used',
      'Status',
    ];

    await createSheetTab(accessToken, sheetId, tabName, headers);
  }

  return true;
}

/**
 * Save a field mapping template
 * Updates existing template if name matches, otherwise creates new
 */
export async function saveTemplate(accessToken, sheetId, templateData) {
  // Ensure Import Settings tab exists
  await ensureImportSettingsTabExists(accessToken, sheetId);

  const {
    templateName,
    sourceSystem = 'Unknown',
    fileType,
    fieldMappings,
    createdBy,
    createdDate = new Date().toISOString().split('T')[0],
    lastUsed = new Date().toISOString().split('T')[0],
    useCount = 1,
  } = templateData;

  // Input validation
  if (!templateName || !templateName.trim()) {
    throw new Error('Template name is required');
  }
  if (!fieldMappings || typeof fieldMappings !== 'object') {
    throw new Error('Field mappings are required and must be an object');
  }

  // Check if template already exists
  const client = createSheetsClient(accessToken);
  const response = await client.get(`/${sheetId}/values/${SHEET_NAMES.IMPORT_SETTINGS}`);
  const rows = response.data.values || [];

  if (rows.length === 0) {
    throw new Error('Import Settings tab is missing headers');
  }

  const existingIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === templateName);

  // Build row values
  const rowValues = [
    templateName,
    sourceSystem,
    fileType,
    JSON.stringify(fieldMappings),
    createdBy,
    createdDate,
    lastUsed,
    String(useCount),
  ];

  if (existingIndex > 0) {
    // Update existing template
    const rowNumber = existingIndex + 1; // +1 because sheets are 1-indexed
    const range = `${SHEET_NAMES.IMPORT_SETTINGS}!A${rowNumber}:H${rowNumber}`;

    await client.put(
      `/${sheetId}/values/${range}`,
      {
        values: [rowValues],
      },
      {
        params: {
          valueInputOption: 'USER_ENTERED',
        },
      }
    );
  } else {
    // Create new template
    await appendRow(accessToken, sheetId, SHEET_NAMES.IMPORT_SETTINGS, rowValues);
  }

  return { success: true, templateName };
}

/**
 * List all saved templates
 */
export async function listTemplates(accessToken, sheetId) {
  // Ensure Import Settings tab exists
  await ensureImportSettingsTabExists(accessToken, sheetId);

  const client = createSheetsClient(accessToken);
  const response = await client.get(`/${sheetId}/values/${SHEET_NAMES.IMPORT_SETTINGS}`);
  const rows = response.data.values || [];

  if (rows.length <= 1) return []; // No templates or only headers

  const templates = rows.slice(1).map((row) => {
    let fieldMappings = {};
    try {
      fieldMappings = JSON.parse(row[3] || '{}');
    } catch {
      fieldMappings = {};
    }

    return {
      templateName: row[0] || '',
      sourceSystem: row[1] || '',
      fileType: row[2] || '',
      fieldMappings,
      createdBy: row[4] || '',
      createdDate: row[5] || '',
      lastUsed: row[6] || '',
      useCount: parseInt(row[7] || '0', 10),
    };
  });

  return templates;
}

/**
 * Load a specific template by name
 */
export async function loadTemplate(accessToken, sheetId, templateName) {
  const templates = await listTemplates(accessToken, sheetId);
  const template = templates.find((t) => t.templateName === templateName);

  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  return template;
}

/**
 * Delete a template by name
 */
export async function deleteTemplate(accessToken, sheetId, templateName) {
  const client = createSheetsClient(accessToken);

  // Get current data
  const response = await client.get(`/${sheetId}/values/${SHEET_NAMES.IMPORT_SETTINGS}`);
  const rows = response.data.values || [];

  if (rows.length <= 1) {
    throw new Error('No templates to delete');
  }

  const templateIndex = rows.findIndex((row, idx) => idx > 0 && row[0] === templateName);

  if (templateIndex < 0) {
    throw new Error(`Template "${templateName}" not found`);
  }

  const rowNumber = templateIndex + 1; // +1 because sheets are 1-indexed

  // Get sheet ID for the Import Settings tab
  const sheetsResponse = await client.get(`/${sheetId}`, {
    params: {
      fields: 'sheets(properties(sheetId,title))',
    },
  });

  const importSettingsSheet = sheetsResponse.data.sheets.find(
    (s) => s.properties.title === SHEET_NAMES.IMPORT_SETTINGS
  );

  if (!importSettingsSheet) {
    throw new Error('Import Settings tab not found');
  }

  const sheetIdNum = importSettingsSheet.properties.sheetId;

  // Delete the row
  await client.post(`/${sheetId}:batchUpdate`, {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: sheetIdNum,
            dimension: 'ROWS',
            startIndex: rowNumber - 1, // 0-indexed for API
            endIndex: rowNumber,
          },
        },
      },
    ],
  });

  return { success: true, templateName };
}

/**
 * Generate unique Import ID (IMP001, IMP002, etc.)
 */
async function generateImportID(accessToken, sheetId) {
  try {
    const { data } = await readSheetData(accessToken, sheetId, SHEET_NAMES.IMPORT_HISTORY);

    if (data.length === 0) return 'IMP001';

    // Find highest existing ID
    const ids = data
      .map((row) => row['Import ID'])
      .filter((id) => id && id.startsWith('IMP'))
      .map((id) => parseInt(id.substring(3), 10))
      .filter((num) => !isNaN(num));

    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    return `IMP${String(maxId + 1).padStart(3, '0')}`;
  } catch {
    // If tab doesn't exist yet, start at IMP001
    return 'IMP001';
  }
}

/**
 * Log an import operation to Import History
 */
export async function logImportHistory(accessToken, sheetId, importData) {
  // Ensure Import History tab exists
  await ensureImportHistoryTabExists(accessToken, sheetId);

  const {
    filename,
    importedBy,
    totalRows,
    contactsAdded,
    duplicatesMerged = 0,
    duplicatesSkipped = 0,
    invalidExcluded = 0,
    templateUsed = 'Manual',
    status = 'Completed',
  } = importData;

  const importId = await generateImportID(accessToken, sheetId);
  const importDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

  const rowValues = [
    importId,
    filename,
    importDate,
    importedBy,
    String(totalRows),
    String(contactsAdded),
    String(duplicatesMerged),
    String(duplicatesSkipped),
    String(invalidExcluded),
    templateUsed,
    status,
  ];

  await appendRow(accessToken, sheetId, SHEET_NAMES.IMPORT_HISTORY, rowValues);

  return { success: true, importId };
}

/**
 * Get import history (most recent first)
 */
export async function getImportHistory(accessToken, sheetId, limit = 10) {
  // Ensure Import History tab exists
  await ensureImportHistoryTabExists(accessToken, sheetId);

  const client = createSheetsClient(accessToken);
  const response = await client.get(`/${sheetId}/values/${SHEET_NAMES.IMPORT_HISTORY}`);
  const rows = response.data.values || [];

  if (rows.length <= 1) return []; // No history or only headers

  const history = rows.slice(1).map((row) => ({
    importId: row[0] || '',
    filename: row[1] || '',
    importDate: row[2] || '',
    importedBy: row[3] || '',
    totalRows: parseInt(row[4] || '0', 10),
    contactsAdded: parseInt(row[5] || '0', 10),
    duplicatesMerged: parseInt(row[6] || '0', 10),
    duplicatesSkipped: parseInt(row[7] || '0', 10),
    invalidExcluded: parseInt(row[8] || '0', 10),
    templateUsed: row[9] || '',
    status: row[10] || '',
  }));

  // Return most recent first, limited
  return history.reverse().slice(0, limit);
}

// Export for testing
export { sheetTabExists, createSheetTab };
