/**
 * Google Sheets Schema Validator
 *
 * Validates that the Google Sheet has the correct structure (tabs and columns)
 * before the app starts using it. Provides clear error messages if schema is incorrect.
 */

import { SHEET_NAMES } from '../config/constants';

/**
 * Define the required schema for the Google Sheet
 */
export const REQUIRED_SCHEMA = {
  [SHEET_NAMES.CONTACTS]: [
    'Contact ID',
    'Name',
    'Email',
    'Phone',
    'Organization',
    'Role',
    'Tags',
    'Notes',
    'Last Contact',
    'Next Followup',
    'Created At',
    'Updated At',
    'Created By',
    'Updated By',
  ],
  [SHEET_NAMES.ORGANIZATIONS]: [
    'Organization ID',
    'Name',
    'Type',
    'Website',
    'Address',
    'City',
    'State',
    'Zip',
    'Description',
    'Tags',
    'Created At',
    'Updated At',
    'Created By',
    'Updated By',
  ],
  [SHEET_NAMES.LOCATIONS]: [
    'Location ID',
    'Name',
    'Type',
    'Address',
    'City',
    'State',
    'Zip',
    'Latitude',
    'Longitude',
    'Description',
    'Tags',
    'Created At',
    'Updated At',
    'Created By',
    'Updated By',
  ],
  [SHEET_NAMES.TOUCHPOINTS]: [
    'Touchpoint ID',
    'Contact ID',
    'Date',
    'Type',
    'Notes',
    'Created At',
    'Updated At',
    'Created By',
    'Updated By',
  ],
  [SHEET_NAMES.EVENTS]: [
    'Event ID',
    'Title',
    'Date',
    'Time',
    'Location',
    'Description',
    'Status',
    'RSVP Count',
    'Created At',
    'Updated At',
    'Created By',
    'Updated By',
  ],
  [SHEET_NAMES.TASKS]: [
    'Task ID',
    'Title',
    'Description',
    'Status',
    'Priority',
    'Due Date',
    'Assigned To',
    'Created At',
    'Updated At',
    'Created By',
    'Updated By',
  ],
  [SHEET_NAMES.NOTES]: [
    'Note ID',
    'Title',
    'Content',
    'Category',
    'Tags',
    'Created At',
    'Updated At',
    'Created By',
    'Updated By',
  ],
  [SHEET_NAMES.CONTACT_RELATIONSHIPS]: [
    'Relationship ID',
    'Contact ID 1',
    'Contact ID 2',
    'Relationship Type',
    'Notes',
    'Created At',
    'Created By',
  ],
  [SHEET_NAMES.ENTITY_RELATIONSHIPS]: [
    'Relationship ID',
    'Entity Type 1',
    'Entity ID 1',
    'Entity Type 2',
    'Entity ID 2',
    'Relationship Type',
    'Notes',
    'Created At',
    'Created By',
  ],
};

// Optional tabs that may not exist yet
export const OPTIONAL_TABS = [
  'Workspaces',
  'Workspace_Members',
  'Workspace_Invitations',
  'Contact_Links',
  'Sync_Conflicts',
  'Activities',
  'Audit_Log',
  'Import_Settings',
  'Import_History',
  'Lists',
  'Contact_Lists',
  'Contact_Notes',
  'Event_Notes',
  'List_Notes',
  'Task_Notes',
  'Location_Visits',
];

/**
 * Validate Google Sheets schema
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @returns {Promise<Object>} Validation result
 */
export async function validateSheetSchema(accessToken, sheetId) {
  try {
    // Fetch sheet metadata
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch sheet metadata');
    }

    const metadata = await response.json();
    const existingSheets = metadata.sheets.map((sheet) => sheet.properties.title);

    // Check for missing required tabs
    const missingTabs = Object.keys(REQUIRED_SCHEMA).filter(
      (tabName) => !existingSheets.includes(tabName)
    );

    if (missingTabs.length > 0) {
      return {
        valid: false,
        error: 'missing_tabs',
        missingTabs,
        existingSheets,
        message: `Missing required tabs: ${missingTabs.join(', ')}`,
      };
    }

    // Validate columns for each required tab
    const columnValidation = {};
    const missingColumns = {};

    for (const [tabName, requiredColumns] of Object.entries(REQUIRED_SCHEMA)) {
      try {
        // Fetch first row (headers) of each tab
        const colResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}!1:1`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!colResponse.ok) {
          columnValidation[tabName] = { error: 'failed_to_fetch' };
          continue;
        }

        const colData = await colResponse.json();
        const actualColumns = colData.values?.[0] || [];

        // Check for missing columns
        const missing = requiredColumns.filter((col) => !actualColumns.includes(col));

        if (missing.length > 0) {
          missingColumns[tabName] = missing;
          columnValidation[tabName] = {
            valid: false,
            missing,
            actual: actualColumns,
          };
        } else {
          columnValidation[tabName] = {
            valid: true,
            columns: actualColumns,
          };
        }
      } catch (error) {
        columnValidation[tabName] = {
          error: error.message,
        };
      }
    }

    // Check if any tabs have missing columns
    if (Object.keys(missingColumns).length > 0) {
      return {
        valid: false,
        error: 'missing_columns',
        missingColumns,
        columnValidation,
        message: 'Some tabs are missing required columns',
      };
    }

    // All validation passed
    return {
      valid: true,
      existingSheets,
      columnValidation,
      message: 'Sheet schema is valid',
    };
  } catch (error) {
    return {
      valid: false,
      error: 'validation_failed',
      message: `Schema validation failed: ${error.message}`,
    };
  }
}

/**
 * Attempt to fix missing columns in the sheet
 * @param {string} accessToken - Google OAuth access token
 * @param {string} sheetId - Google Sheet ID
 * @param {Object} missingColumns - Object mapping tab names to missing columns
 * @returns {Promise<Object>} Fix result
 */
export async function fixMissingColumns(accessToken, sheetId, missingColumns) {
  const results = {};

  for (const [tabName, columns] of Object.entries(missingColumns)) {
    try {
      // Get current headers
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}!1:1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();
      const currentHeaders = data.values?.[0] || [];
      const newHeaders = [...currentHeaders, ...columns];

      // Update headers
      const updateResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabName)}!1:1?valueInputOption=RAW`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [newHeaders],
          }),
        }
      );

      if (updateResponse.ok) {
        results[tabName] = {
          success: true,
          addedColumns: columns,
        };
      } else {
        const errorData = await updateResponse.json();
        results[tabName] = {
          success: false,
          error: errorData.error?.message,
        };
      }
    } catch (error) {
      results[tabName] = {
        success: false,
        error: error.message,
      };
    }
  }

  return results;
}

/**
 * Render a schema validation error screen
 * @param {Object} validationResult - Result from validateSheetSchema
 * @param {Function} onRetry - Callback when user clicks retry
 * @param {Function} onFix - Callback when user clicks fix
 * @returns {HTMLElement} Error screen element
 */
export function renderSchemaErrorScreen(validationResult, onRetry, onFix) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: linear-gradient(135deg, #dc2626 0%, #a85c30 100%);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'max-width: 700px; text-align: center;';

  const heading = document.createElement('h1');
  heading.style.cssText = 'font-size: 2rem; margin-bottom: 1rem; font-weight: 600;';
  heading.textContent = 'Sheet Schema Error';
  wrapper.appendChild(heading);

  const message = document.createElement('p');
  message.style.cssText = 'font-size: 1.125rem; margin-bottom: 2rem; opacity: 0.9;';
  message.textContent = validationResult.message;
  wrapper.appendChild(message);

  if (validationResult.missingTabs) {
    const tabsBox = document.createElement('div');
    tabsBox.style.cssText =
      'background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; text-align: left;';
    const tabsHeading = document.createElement('h2');
    tabsHeading.style.cssText = 'font-size: 1rem; margin-bottom: 1rem; font-weight: 600;';
    tabsHeading.textContent = 'Missing Tabs:';
    tabsBox.appendChild(tabsHeading);
    const tabsList = document.createElement('ul');
    tabsList.style.cssText = 'list-style: none; padding: 0; margin: 0;';
    validationResult.missingTabs.forEach((tab) => {
      const li = document.createElement('li');
      li.style.cssText = 'padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);';
      li.textContent = `\u2022 ${tab}`;
      tabsList.appendChild(li);
    });
    tabsBox.appendChild(tabsList);
    wrapper.appendChild(tabsBox);
  }

  if (validationResult.missingColumns) {
    const colsBox = document.createElement('div');
    colsBox.style.cssText =
      'background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; text-align: left; max-height: 400px; overflow-y: auto;';
    const colsHeading = document.createElement('h2');
    colsHeading.style.cssText = 'font-size: 1rem; margin-bottom: 1rem; font-weight: 600;';
    colsHeading.textContent = 'Missing Columns:';
    colsBox.appendChild(colsHeading);
    Object.entries(validationResult.missingColumns).forEach(([tab, cols]) => {
      const section = document.createElement('div');
      section.style.cssText =
        'margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);';
      const tabLabel = document.createElement('strong');
      tabLabel.textContent = `${tab}:`;
      section.appendChild(tabLabel);
      const colList = document.createElement('ul');
      colList.style.cssText = 'margin: 0.5rem 0 0 1.5rem; font-size: 0.875rem;';
      cols.forEach((col) => {
        const li = document.createElement('li');
        li.textContent = col;
        colList.appendChild(li);
      });
      section.appendChild(colList);
      colsBox.appendChild(section);
    });
    wrapper.appendChild(colsBox);
  }

  const howToBox = document.createElement('div');
  howToBox.style.cssText =
    'background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 8px; text-align: left; margin-bottom: 2rem;';
  const howToHeading = document.createElement('h2');
  howToHeading.style.cssText = 'font-size: 1rem; margin-bottom: 1rem; font-weight: 600;';
  howToHeading.textContent = 'How to Fix:';
  howToBox.appendChild(howToHeading);

  if (validationResult.error === 'missing_tabs') {
    const p = document.createElement('p');
    p.textContent =
      'Create a new Google Sheet using the template provided in the documentation, or manually add the missing tabs to your existing sheet.';
    howToBox.appendChild(p);
  } else {
    const p = document.createElement('p');
    p.textContent = 'You can either:';
    howToBox.appendChild(p);
    const ol = document.createElement('ol');
    ol.style.cssText = 'margin: 0.5rem 0 0 1.5rem; line-height: 1.8;';
    [
      'Click "Auto-Fix" below to automatically add missing columns',
      'Manually add the missing columns to your sheet',
      'Use the provided template sheet',
    ].forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      ol.appendChild(li);
    });
    howToBox.appendChild(ol);
  }
  wrapper.appendChild(howToBox);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 1rem; justify-content: center;';

  if (validationResult.missingColumns) {
    const fixBtn = document.createElement('button');
    fixBtn.style.cssText = `
      padding: 0.75rem 2rem;
      background: #059669;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    `;
    fixBtn.textContent = 'Auto-Fix Missing Columns';
    fixBtn.addEventListener('mouseover', () => (fixBtn.style.transform = 'scale(1.05)'));
    fixBtn.addEventListener('mouseout', () => (fixBtn.style.transform = 'scale(1)'));
    fixBtn.addEventListener('click', () => {
      fixBtn.disabled = true;
      fixBtn.textContent = 'Fixing...';
      onFix();
    });
    btnRow.appendChild(fixBtn);
  }

  const retryBtn = document.createElement('button');
  retryBtn.style.cssText = `
    padding: 0.75rem 2rem;
    background: white;
    color: #dc2626;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  `;
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('mouseover', () => (retryBtn.style.transform = 'scale(1.05)'));
  retryBtn.addEventListener('mouseout', () => (retryBtn.style.transform = 'scale(1)'));
  retryBtn.addEventListener('click', onRetry);
  btnRow.appendChild(retryBtn);

  wrapper.appendChild(btnRow);
  container.appendChild(wrapper);

  return container;
}
