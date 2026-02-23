/**
 * Auth Middleware - Validates Google OAuth tokens
 *
 * Checks the Authorization header for a Google OAuth access token,
 * validates it with Google's tokeninfo endpoint, and attaches the
 * user identity (email) to the request object.
 */

const GOOGLE_TOKEN_INFO_URL =
  process.env.GOOGLE_TOKEN_INFO_URL || 'https://www.googleapis.com/oauth2/v3/tokeninfo';

export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token with Google
    // Use Authorization header instead of query parameter to prevent token exposure in logs
    const response = await fetch(GOOGLE_TOKEN_INFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    const tokenInfo = await response.json();

    // Check if token has required scope (Sheets API)
    const hasRequiredScope = tokenInfo.scope?.includes(
      'https://www.googleapis.com/auth/spreadsheets'
    );

    if (!hasRequiredScope) {
      return res.status(403).json({ error: 'Token missing required scopes' });
    }

    // Check token expiration (should have at least 1 minute remaining)
    const expiresIn = tokenInfo.expires_in || 0;
    if (expiresIn < 60) {
      return res.status(401).json({ error: 'Token expired or expiring soon' });
    }

    // Attach user identity to request
    req.user = {
      email: tokenInfo.email,
      userId: tokenInfo.email, // Use email as primary user ID
      googleUserId: tokenInfo.user_id,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}
