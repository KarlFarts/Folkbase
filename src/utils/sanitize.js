const ALLOWED_URL_SCHEMES = ['https:', 'http:', 'tel:', 'sms:', 'mailto:'];

export function isUrlSchemeAllowed(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    if (url.startsWith('/') || url.startsWith('#')) return true;
    const urlObj = new URL(url, window.location.origin);
    return ALLOWED_URL_SCHEMES.includes(urlObj.protocol.toLowerCase());
  } catch {
    const lowerUrl = url.toLowerCase().trim();
    const dangerous = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerous.some((s) => lowerUrl.startsWith(s))) return false;
    return ALLOWED_URL_SCHEMES.some((s) => lowerUrl.startsWith(s)) || !lowerUrl.includes(':');
  }
}

export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  return isUrlSchemeAllowed(trimmed) ? trimmed : '';
}

export function buildTelUrl(phone) {
  if (!phone || typeof phone !== 'string') return '';
  return `tel:${phone.replace(/[^\d+\-\s()]/g, '')}`;
}

export function buildSmsUrl(phone) {
  if (!phone || typeof phone !== 'string') return '';
  return `sms:${phone.replace(/[^\d+\-\s()]/g, '')}`;
}

export function buildMailtoUrl(email) {
  if (!email || typeof email !== 'string') return '';
  if (!email.includes('@') || email.includes('<')) return '';
  return `mailto:${email.trim()}`;
}
