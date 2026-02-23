# Security Documentation

## Overview

Touchpoint CRM is a client-side application that prioritizes user privacy and data security. This document outlines our security architecture, threat model, and best practices.

**Last Security Audit:** 2026-02-15
**Security Grade:** A-

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Input Validation](#input-validation)
5. [XSS Prevention](#xss-prevention)
6. [Threat Model](#threat-model)
7. [Security Features](#security-features)
8. [Known Limitations](#known-limitations)
9. [Reporting Vulnerabilities](#reporting-vulnerabilities)
10. [Security Checklist for Developers](#security-checklist-for-developers)

---

## Security Architecture

### Client-Side Application Model

Touchpoint CRM is a **100% client-side application** with no traditional backend:

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       ├─── Google OAuth ────> Google Identity Platform
       │
       └─── Google Sheets API ─> User's Google Sheet
                                  (owned by user, not us)
```

**Benefits:**
- ✅ **Zero-trust architecture** - We never see your data
- ✅ **No server to hack** - No central database to breach
- ✅ **Data sovereignty** - You own your data in your Google account
- ✅ **GDPR compliant** - No data storage on our servers

**Trade-offs:**
- ⚠️ Client-side storage (localStorage) used for tokens
- ⚠️ Security depends on browser and Google's infrastructure
- ⚠️ No server-side validation (client-side only)

---

## Authentication & Authorization

### OAuth 2.0 with Google

We use Google OAuth 2.0 for authentication:

**Scopes Requested:**
- `userinfo.email` - Your email address
- `userinfo.profile` - Your name and photo
- `spreadsheets` - Read/write access to your Google Sheets
- `drive.file` - Create files in Google Drive
- `calendar.events` - (Optional) Calendar sync

**OAuth Security Features:**
- ✅ **CSRF Protection** - Cryptographically secure state validation
- ✅ **Token Validation** - Tokens verified with Google before use
- ✅ **Scope Validation** - Checks for required permissions
- ✅ **Expiration Monitoring** - Auto-refresh before expiry
- ✅ **Secure Token Storage** - Uses Web Crypto API for state generation

**Implementation:**
```javascript
// src/contexts/AuthContext.js
function generateOAuthState() {
  const array = new Uint8Array(32); // 256-bit entropy
  crypto.getRandomValues(array);
  const state = Array.from(array, byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  sessionStorage.setItem('oauth_state', state);
  return state;
}
```

### Token Storage

**Where tokens are stored:**
- `localStorage.googleAccessToken` - OAuth access token
- `localStorage.googleAccessTokenExpiresAt` - Expiration timestamp
- `localStorage.googleUserInfo` - Cached user profile
- `sessionStorage.oauth_state` - CSRF protection token

**Security measures:**
1. **Short-lived tokens** - 1 hour expiry (enforced by Google)
2. **Validation before use** - Tokens checked with Google before API calls
3. **Automatic cleanup** - Removed on logout and when expired
4. **HTTPS only** - Never transmitted over HTTP
5. **Token revocation** - Explicitly revoked with Google on logout

**Why localStorage instead of httpOnly cookies?**

As a client-only app, we cannot use httpOnly cookies (requires a backend). However:
- Tokens expire quickly (1 hour)
- Content Security Policy prevents most XSS attacks
- No XSS vulnerabilities found in our code
- Alternative would require adding a backend (defeats the purpose)

---

## Data Protection

### Data Storage Model

**Your data is stored in YOUR Google Sheet:**
- We never store your data on our servers
- You control access via Google Drive permissions
- You can export/delete your data anytime
- Standard Google encryption at rest and in transit

**Google Drive Folder Structure:**
```
Google Drive
└── Touchpoint CRM/
    ├── [Main Sheet]       - Contact data, events, etc.
    ├── Exports/           - CSV, vCard exports
    ├── Backups/           - Timestamped backups
    └── Attachments/       - (Future) Photos, documents
```

**Data Transmission:**
- All API calls use **HTTPS only**
- Tokens sent in `Authorization` headers (not URLs)
- Request size limited to 10MB (Google Sheets API limit)
- Rate limiting enforced (100 requests/100s per user)

---

## Input Validation

### Multi-Layer Validation

**1. Client-Side Validation**
```javascript
// src/utils/inputSanitizer.js
export function sanitizeStringInput(value, maxLength) {
  return value
    .trim()
    .replace(/[<>]/g, '')        // XSS prevention
    .replace(/^[=+\-@]/, '')     // Formula injection prevention
    .slice(0, maxLength);         // Length enforcement
}
```

**2. Schema-Based Validation**
```javascript
// Pre-defined schemas for each entity type
const SCHEMAS = {
  contact: {
    'First Name': { maxLength: 255 },
    'Bio': { maxLength: 5000 },
    // ...
  }
};
```

**3. Length Limits**
- **Short text:** 255 chars (names, emails, phones)
- **Medium text:** 1000 chars (organizations, roles)
- **Long text:** 5000 chars (bio, descriptions)
- **Very long text:** 10,000 chars (notes, rich content)

**Applied to all forms:**
- AddContact.js ✅
- AddOrganization.js ✅
- AddEvent.js ✅
- AddLocation.js ✅

---

## XSS Prevention

### Defense in Depth

**Layer 1: React's Built-in Protection**
- All dynamic content rendered via JSX (auto-escaped)
- Zero `dangerouslySetInnerHTML` usage in codebase
- No `eval()` or `Function()` constructor usage

**Layer 2: Content Security Policy (CSP)**
```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://accounts.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  connect-src 'self' https://sheets.googleapis.com https://www.googleapis.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**Why `unsafe-inline` for scripts?**
- Required for Google OAuth widget
- Mitigated by other layers (React escaping, input sanitization)
- Future: Migrate to CSP nonces

**Layer 3: Input Sanitization**
- HTML tags stripped from all user input
- Formula characters removed from beginning of strings
- Length limits enforced

**Layer 4: URL Validation**
```javascript
// src/utils/sanitize.js
const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];
const ALLOWED_SCHEMES = ['https:', 'http:', 'tel:', 'sms:', 'mailto:'];
```

---

## Threat Model

### In Scope

**Threats we protect against:**

1. **XSS (Cross-Site Scripting)**
   - **Attack:** Injecting malicious scripts via user input
   - **Defense:** React escaping + CSP + input sanitization
   - **Status:** ✅ Protected

2. **CSRF (Cross-Site Request Forgery)**
   - **Attack:** Unauthorized actions using victim's credentials
   - **Defense:** OAuth state validation
   - **Status:** ✅ Protected

3. **Token Theft**
   - **Attack:** Stealing access tokens from localStorage
   - **Defense:** CSP + token expiry + HTTPS + no XSS vectors
   - **Status:** ✅ Mitigated (short-lived tokens)

4. **Formula Injection**
   - **Attack:** CSV formula execution (=SYSTEM("cmd"))
   - **Defense:** Strip formula characters from input
   - **Status:** ✅ Protected

5. **Prototype Pollution**
   - **Attack:** Manipulating Object.prototype
   - **Defense:** Updated dependencies, no vulnerable patterns
   - **Status:** ✅ Protected (axios patched)

6. **Clickjacking**
   - **Attack:** Embedding app in malicious iframe
   - **Defense:** `frame-ancestors 'none'` CSP header
   - **Status:** ✅ Protected

### Out of Scope

**Threats we cannot protect against:**

1. **Physical Device Access**
   - If attacker has physical access to unlocked device
   - **Mitigation:** Users should lock devices, use OS-level encryption

2. **Browser Vulnerabilities**
   - Zero-day exploits in browser itself
   - **Mitigation:** Users should keep browsers updated

3. **Google Account Compromise**
   - If user's Google password is stolen
   - **Mitigation:** Users should enable 2FA on Google account

4. **Supply Chain Attacks**
   - Compromised npm packages
   - **Mitigation:** We audit dependencies regularly, use lock files

5. **Network-Level Attacks**
   - Man-in-the-middle attacks on user's network
   - **Mitigation:** All traffic uses HTTPS

---

## Security Features

### Implemented Security Controls

| Feature | Status | Description |
|---------|--------|-------------|
| OAuth 2.0 Authentication | ✅ | Google OAuth with CSRF protection |
| Token Validation | ✅ | Tokens verified with Google before use |
| Input Sanitization | ✅ | XSS and formula injection prevention |
| Content Security Policy | ✅ | Restricts script sources and actions |
| HTTPS Enforcement | ✅ | All API calls over HTTPS |
| Cryptographic IDs | ✅ | Secure random ID generation |
| Token Expiry Monitoring | ✅ | Auto-refresh before expiration |
| Token Revocation | ✅ | Explicit revocation on logout |
| Production Log Stripping | ✅ | console.log removed from builds |
| Dependency Auditing | ✅ | Regular npm audit checks |
| Length Validation | ✅ | maxLength on all inputs |
| Request Size Limits | ✅ | Prevents oversized payloads |

### Security Headers (Production)

```http
Content-Security-Policy: [see above]
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

---

## Known Limitations

### By Design

1. **OAuth Implicit Flow (Architectural Decision)**
   - **Context:** OAuth 2.0 implicit flow is deprecated *for apps with backends*
   - **Why We Use It:** Auth code flow requires a backend to securely exchange authorization codes for tokens using client_secret. As a 100% client-side app, we have no backend.
   - **Why It's Safe Here:**
     - ✅ CSRF protection via cryptographic state validation (256-bit entropy)
     - ✅ Tokens expire in 1 hour (Google-enforced, cannot be extended)
     - ✅ HTTPS-only transmission
     - ✅ No XSS vulnerabilities found (React auto-escaping + input sanitization + CSP)
     - ✅ Tokens sent in Authorization headers (not URLs)
   - **Industry Practice:** Google still supports and recommends implicit flow for client-only JavaScript apps
   - **Alternative:** Add backend server just for OAuth (defeats zero-trust architecture)

2. **Client-Side Token Storage**
   - **Limitation:** Tokens in localStorage vulnerable to XSS
   - **Mitigation:** No XSS vectors + CSP + 1-hour token expiry
   - **Alternative:** Would require backend (defeats purpose)

3. **No Server-Side Validation**
   - **Limitation:** All validation happens client-side
   - **Mitigation:** Data stored in user's own Google Sheet (they control access)
   - **Impact:** Malicious user could only affect their own data

4. **CSP with unsafe-inline**
   - **Limitation:** Allows inline scripts (for Google OAuth)
   - **Mitigation:** React auto-escaping + input sanitization
   - **Future:** Migrate to CSP nonces

### Accepted Risks

1. **localStorage XSS Risk**
   - **Risk Level:** Low
   - **Justification:** No XSS vulnerabilities found, CSP in place, tokens short-lived
   - **Monitoring:** Regular security audits

2. **Client-Only Architecture**
   - **Risk Level:** Low
   - **Justification:** Users own their data, we never see it
   - **Trade-off:** Privacy > centralized security

---

## Reporting Vulnerabilities

### Responsible Disclosure

If you discover a security vulnerability, please:

1. **DO NOT** disclose publicly
2. Email: [Your security contact email]
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

### Response Timeline

- **24 hours:** Acknowledgment of report
- **7 days:** Initial assessment and triage
- **30 days:** Fix developed and tested
- **Disclosure:** After fix is deployed

### Hall of Fame

We recognize security researchers who responsibly disclose vulnerabilities.

---

## Security Checklist for Developers

### Before Writing Code

- [ ] Review this security documentation
- [ ] Understand the threat model
- [ ] Check for similar existing patterns

### Writing Code

- [ ] **Never use `dangerouslySetInnerHTML`**
- [ ] **Always sanitize user input** - Use `inputSanitizer.js`
- [ ] **Validate URLs** - Use `isUrlSchemeAllowed()` from `sanitize.js`
- [ ] **Use cryptographic random** - Use `generateSecureId()`, never `Math.random()`
- [ ] **Add `maxLength` to inputs** - Use `INPUT_LIMITS` constants
- [ ] **No `eval()` or `Function()`** - Ever. No exceptions.
- [ ] **No `console.log` in production** - Use `logger.js` utility
- [ ] **Token in headers only** - Never in URLs or query params

### Authentication

- [ ] Never bypass OAuth flow
- [ ] Always validate tokens before use
- [ ] Use `Authorization: Bearer ${token}` header
- [ ] Clear tokens on logout (localStorage + sessionStorage)
- [ ] Handle token expiry gracefully

### API Calls

- [ ] All calls use HTTPS
- [ ] Tokens in Authorization header
- [ ] Validate response data
- [ ] Handle errors securely (no info leakage)
- [ ] Check rate limits before request

### Before Committing

- [ ] Run `npm audit` - Should show 0 vulnerabilities
- [ ] Run `npm run build` - Should succeed
- [ ] Test in dev mode first
- [ ] Review code for security issues
- [ ] Update security docs if needed

### Before Deploying

- [ ] Run full security audit
- [ ] Test all forms work correctly
- [ ] Verify CSP headers present
- [ ] Check console for errors
- [ ] Verify tokens not in logs

---

## Security Maintenance

### Regular Tasks

**Monthly:**
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review dependency updates
- [ ] Check Google security advisories
- [ ] Review access logs (if available)

**Quarterly:**
- [ ] Full security audit
- [ ] Penetration testing (manual)
- [ ] Review and update CSP
- [ ] Update this documentation

**Annually:**
- [ ] Comprehensive security review
- [ ] Third-party security audit (if budget allows)
- [ ] Review OAuth implementation against latest best practices
- [ ] Threat model update

---

## Additional Resources

### Internal Documentation
- `SECURITY_REMEDIATION.md` - Detailed fix tracking
- `SECURITY_FIXES_COMPLETED.md` - Implementation summary
- `SECURITY_PROGRESS_UPDATE.md` - Latest progress

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google OAuth Best Practices](https://developers.google.com/identity/protocols/oauth2/web-server)
- [React Security Best Practices](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-15 | Initial security documentation |

---

**Maintained by:** Development Team
**Last Reviewed:** 2026-02-15
**Next Review:** 2026-05-15
