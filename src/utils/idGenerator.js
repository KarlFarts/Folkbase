/**
 * UUID-Based ID Generator
 *
 * Generates globally unique IDs without any API calls.
 * Format: PREFIX-xxxxxxxx (prefix + 8 random hex chars)
 *
 * Old sequential IDs (C001, T001, etc.) remain valid throughout the app.
 * All ID comparisons use exact string matching, so both formats coexist.
 */

export const ID_PREFIXES = {
  CONTACT: 'CON',
  TOUCHPOINT: 'TP',
  EVENT: 'EVT',
  NOTE: 'NOTE',
  TASK: 'TSK',
  LIST: 'LST',
  ORGANIZATION: 'ORG',
  LOCATION: 'LOC',
  VISIT: 'VIS',
  WORKSPACE: 'WS',
  MEMBER: 'MEM',
  LINK: 'LNK',
  CONFLICT: 'CONF',
  ACTIVITY: 'ACT',
  INVITATION: 'INV',
  RELATIONSHIP: 'REL',
  ENTITY_REL: 'ERE',
  MOMENT: 'MOM',
};

/**
 * Generate a globally unique ID with the given prefix.
 * Format: PREFIX-xxxxxxxx (8 random hex characters)
 *
 * @param {string} prefix - The entity prefix (e.g., 'CON', 'TP', 'EVT')
 * @returns {string} A unique ID like 'CON-a7f3b2c1'
 */
export function generateId(prefix) {
  if (!prefix) {
    throw new Error('ID prefix is required');
  }
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}-${hex}`;
}
