/**
 * Dev Mode Utility
 *
 * Production-safe check for dev mode. Import this instead of __tests__/mocks/mockAuth
 * to avoid pulling test fixtures into the production bundle.
 */

export function isDevMode() {
  return import.meta.env.VITE_DEV_MODE === 'true';
}
