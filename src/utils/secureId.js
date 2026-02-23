/**
 * Secure ID Generation Utilities
 *
 * Uses Web Crypto API for cryptographically secure random values.
 * Replaces Math.random() which is predictable and unsuitable for security-sensitive IDs.
 */

/**
 * Generate cryptographically secure random ID
 *
 * @param {string} prefix - ID prefix (e.g., 'link', 'conflict')
 * @param {number} length - Length of random portion (default: 12)
 * @returns {string} Secure random ID in format: {prefix}-{timestamp}-{random}
 *
 * @example
 * generateSecureId('link') // 'link-1739654321000-a8f3d9c2b4e1'
 */
export function generateSecureId(prefix, length = 12) {
  const array = new Uint8Array(Math.ceil(length * 0.75));
  crypto.getRandomValues(array);

  const randomString = Array.from(array, (byte) => byte.toString(36))
    .join('')
    .slice(0, length);

  return `${prefix}-${Date.now()}-${randomString}`;
}

/**
 * Generate activity ID (format: ACT{timestamp}{random})
 *
 * @returns {string} Secure activity ID
 *
 * @example
 * generateActivityId() // 'ACT1739654321000a8f3'
 */
export function generateActivityId() {
  const array = new Uint8Array(3);
  crypto.getRandomValues(array);
  const randomString = Array.from(array, (byte) => byte.toString(36))
    .join('')
    .slice(0, 4);

  return `ACT${Date.now()}${randomString}`;
}
