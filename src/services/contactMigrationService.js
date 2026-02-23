import { readSheetData, updateContact } from '../utils/devModeWrapper';
import { SHEET_NAMES } from '../config/constants';

/**
 * Contact-specific data migrations
 * Run as part of Phase A migration
 */

/**
 * Split legacy "Name" field into First Name / Last Name
 * Also populates Display Name
 * @param {string} accessToken - Google OAuth token
 * @param {string} sheetId - Sheet ID
 * @param {string} userEmail - User email for audit
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<Object>} Migration result with count
 */
export const migrateContactNames = async (
  accessToken,
  sheetId,
  userEmail,
  progressCallback
) => {
  const { data: contacts } = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACTS);

  let migrated = 0;
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    // Skip if already migrated (has First Name)
    if (contact['First Name']) {
      continue;
    }

    // Parse legacy Name field
    const name = contact['Name'] || '';
    const parts = name.trim().split(/\s+/);

    let firstName = '';
    let lastName = '';
    let displayName = name;

    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      firstName = parts[0];
    }

    // Update contact
    await updateContact(
      accessToken,
      sheetId,
      contact['Contact ID'],
      contact,
      {
        ...contact,
        'First Name': firstName,
        'Last Name': lastName,
        'Display Name': displayName,
        Name: name, // Keep for backward compatibility
      },
      userEmail
    );

    migrated++;
    progressCallback?.({
      current: i + 1,
      total: contacts.length,
      message: `Migrating names: ${i + 1}/${contacts.length}`,
    });
  }

  return { migrated };
};

/**
 * Type existing Phone/Email fields
 * If contact has "Phone", move to "Phone Mobile"
 * If contact has "Email", move to "Email Personal"
 * @param {string} accessToken - Google OAuth token
 * @param {string} sheetId - Sheet ID
 * @param {string} userEmail - User email for audit
 * @returns {Promise<Object>} Migration result with count
 */
export const migrateContactMethods = async (accessToken, sheetId, userEmail) => {
  const { data: contacts } = await readSheetData(accessToken, sheetId, SHEET_NAMES.CONTACTS);

  let migrated = 0;
  for (const contact of contacts) {
    let needsUpdate = false;
    const updates = { ...contact };

    // Migrate Phone -> Phone Mobile (if Phone Mobile is empty)
    if (contact['Phone'] && !contact['Phone Mobile']) {
      updates['Phone Mobile'] = contact['Phone'];
      needsUpdate = true;
    }

    // Migrate Email -> Email Personal (if Email Personal is empty)
    if (contact['Email'] && !contact['Email Personal']) {
      updates['Email Personal'] = contact['Email'];
      needsUpdate = true;
    }

    if (needsUpdate) {
      await updateContact(accessToken, sheetId, contact['Contact ID'], contact, updates, userEmail);
      migrated++;
    }
  }

  return { migrated };
};
