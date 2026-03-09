import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { GOOGLE_SCOPES, CALENDAR_SCOPE } from '../googleAuth';
import { isDevMode } from '../utils/devMode';

// Lazy-load mock auth module only in dev mode to keep it out of production bundles
let _mockAuth = null;
async function getMockAuth() {
  if (!_mockAuth) {
    _mockAuth = await import('../__tests__/mocks/mockAuth');
  }
  return _mockAuth;
}
import { log, warn } from '../utils/logger';
import { logApiCall } from '../utils/apiUsageLogger.js';
import { registerAuthErrorHandler } from '../utils/authErrorHandler.js';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

function generateOAuthState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const state = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  sessionStorage.setItem('oauth_state', state);
  return state;
}

function validateOAuthState(receivedState) {
  const storedState = sessionStorage.getItem('oauth_state');
  sessionStorage.removeItem('oauth_state');
  return storedState && storedState === receivedState;
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsReauth, setNeedsReauth] = useState(false);

  // Ref to prevent StrictMode double-mount from initializing auth twice
  const authInitializedRef = useRef(false);
  // Ref to track pending login callback
  const loginCallbackRef = useRef(null);
  // Ref to track previous token for auto-clear logic
  const prevTokenRef = useRef(null);

  // Google OAuth login hook
  // Called unconditionally to satisfy Rules of Hooks. In dev mode the result is
  // ignored -- signInWithGoogle() uses mock auth instead.
  const googleLoginHook = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (tokenResponse.state && !validateOAuthState(tokenResponse.state)) {
        warn('OAuth state mismatch - possible CSRF attack');
        if (loginCallbackRef.current) {
          loginCallbackRef.current.reject(new Error('OAuth state validation failed'));
          loginCallbackRef.current = null;
        }
        return;
      }

      const startTime = Date.now();
      try {
        const token = tokenResponse.access_token;
        setAccessToken(token);

        // Fetch user info from Google
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info');
        }

        const userInfo = await userInfoResponse.json();

        const newUser = {
          uid: userInfo.sub,
          email: userInfo.email,
          displayName: userInfo.name,
          photoURL: userInfo.picture,
        };

        setUser(newUser);

        // Store token with expiration metadata
        // Google OAuth tokens typically expire in 1 hour (3600 seconds)
        const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
        sessionStorage.setItem('googleAccessToken', token);
        sessionStorage.setItem('googleAccessTokenExpiresAt', expiresAt.toString());
        // Store user info for session restoration
        sessionStorage.setItem('googleUserInfo', JSON.stringify(newUser));

        // Log successful auth
        logApiCall('google-oauth', 'signInWithGoogle', {
          success: true,
          statusCode: 200,
          duration: Date.now() - startTime,
        });

        // Resolve the promise if there's a pending callback
        if (loginCallbackRef.current) {
          loginCallbackRef.current.resolve(newUser);
          loginCallbackRef.current = null;
        }
      } catch (error) {
        // Log failed auth
        logApiCall('google-oauth', 'signInWithGoogle', {
          success: false,
          statusCode: null,
          duration: Date.now() - startTime,
          error: error.message,
        });

        // Reject the promise if there's a pending callback
        if (loginCallbackRef.current) {
          loginCallbackRef.current.reject(error);
          loginCallbackRef.current = null;
        }
      }
    },
    onError: (error) => {
      warn('Google login failed:', error);

      // Log failed auth
      logApiCall('google-oauth', 'signInWithGoogle', {
        success: false,
        statusCode: null,
        duration: 0,
        error: error.error_description || error.error || 'Unknown error',
      });

      // Reject the promise if there's a pending callback
      if (loginCallbackRef.current) {
        loginCallbackRef.current.reject(
          new Error(error.error_description || error.error || 'Login failed')
        );
        loginCallbackRef.current = null;
      }
    },
    scope: GOOGLE_SCOPES,
    flow: 'implicit',
    ux_mode: 'popup',
    // NOTE: Implicit flow is deprecated for apps with backends, but is the correct
    // choice for client-only apps like Folkbase. Auth code flow requires a
    // backend to securely exchange the code for tokens using client_secret.
    // Mitigations: Short-lived tokens (1hr), CSRF protection via state validation,
    // CSP headers, HTTPS-only, and no XSS vulnerabilities.
    state: generateOAuthState(),
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const googleLogin = isDevMode() ? () => {} : googleLoginHook;

  const signInWithGoogle = useCallback(
    async (forceReauth = false) => {
      // DEV MODE: Use mock authentication
      if (isDevMode()) {
        const { mockSignIn, MOCK_ACCESS_TOKEN } = await getMockAuth();
        const mockUser = await mockSignIn();
        setUser(mockUser);
        setAccessToken(MOCK_ACCESS_TOKEN);
        log('[DEV MODE] Signed in as:', mockUser.displayName, `(${mockUser.role})`);
        return mockUser;
      }

      // PRODUCTION: Use Google OAuth
      // Create a promise that will be resolved when the OAuth callback completes
      return new Promise((resolve, reject) => {
        loginCallbackRef.current = { resolve, reject };

        // If forcing re-auth, we need to use a different approach
        // The @react-oauth/google library handles this via the prompt parameter
        if (forceReauth) {
          // For forced re-auth, we'll clear the stored token and trigger a new login
          sessionStorage.removeItem('googleAccessToken');
          sessionStorage.removeItem('googleAccessTokenExpiresAt');
          sessionStorage.removeItem('googleUserInfo');
        }

        // Trigger the Google OAuth popup
        googleLogin();
      });
    },
    [googleLogin]
  );

  const refreshAccessToken = useCallback(async () => {
    if (isDevMode()) {
      return signInWithGoogle(false);
    }

    // Try silent re-auth first using a hidden iframe.
    // If the user still has an active Google session (very common), this
    // returns a fresh token without any popup or user interaction.
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: window.location.origin,
      response_type: 'token',
      scope: GOOGLE_SCOPES,
      prompt: 'none',
      include_granted_scopes: 'true',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      let settled = false;
      const cleanup = () => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      };

      // Timeout after 8 seconds -- fall back to full popup
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        log('Silent refresh timed out, falling back to popup');
        signInWithGoogle(true).then(resolve, reject);
      }, 8000);

      // Listen for the redirect with token in the hash
      const checkIframe = () => {
        try {
          const iframeUrl = iframe.contentWindow?.location?.href;
          if (iframeUrl && iframeUrl.startsWith(window.location.origin)) {
            const hash = iframe.contentWindow.location.hash;
            if (hash) {
              const hashParams = new URLSearchParams(hash.substring(1));
              const token = hashParams.get('access_token');
              const expiresIn = hashParams.get('expires_in');

              if (token) {
                settled = true;
                clearTimeout(timeout);
                cleanup();

                // Update auth state with the new token
                setAccessToken(token);
                const expiresAt = Date.now() + (parseInt(expiresIn) || 3600) * 1000;
                sessionStorage.setItem('googleAccessToken', token);
                sessionStorage.setItem('googleAccessTokenExpiresAt', expiresAt.toString());

                log('Token refreshed silently');
                resolve(user);
                return;
              }
            }

            // Redirect happened but no token (error) -- fall back to popup
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              cleanup();
              log('Silent refresh failed, falling back to popup');
              signInWithGoogle(true).then(resolve, reject);
            }
          }
        } catch {
          // Cross-origin error means Google hasn't redirected yet -- keep waiting
        }
      };

      iframe.addEventListener('load', checkIframe);
      iframe.src = authUrl;
    });
  }, [signInWithGoogle, user]);

  async function logout() {
    const startTime = Date.now();
    try {
      // DEV MODE: Use mock sign out
      if (isDevMode()) {
        const { mockSignOut } = await getMockAuth();
        await mockSignOut();
        setUser(null);
        setAccessToken(null);
        log('[DEV MODE] Signed out');
        return;
      }

      // Get token before clearing for revocation
      const token = sessionStorage.getItem('googleAccessToken');

      // Clear local state
      setUser(null);
      setAccessToken(null);
      sessionStorage.removeItem('googleAccessToken');
      sessionStorage.removeItem('googleAccessTokenExpiresAt');
      sessionStorage.removeItem('googleUserInfo');

      // Clear session storage (OAuth state, etc.)
      sessionStorage.removeItem('oauth_state');

      // Optionally revoke the token (fire and forget)
      if (token) {
        fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `token=${encodeURIComponent(token)}`,
        }).catch((error) => {
          // Log for monitoring but don't block logout
          console.warn('Token revocation failed:', error.message);
          logApiCall('google-oauth', 'revokeToken', {
            success: false,
            error: error.message,
          });
        });
      }

      // Log successful sign out
      logApiCall('google-oauth', 'signOut', {
        success: true,
        statusCode: 200,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      // Log failed sign out
      logApiCall('google-oauth', 'signOut', {
        success: false,
        statusCode: null,
        duration: Date.now() - startTime,
        error: error.message,
      });
      throw error;
    }
  }

  useEffect(() => {
    // Prevent StrictMode double-mount from running this twice
    if (authInitializedRef.current) {
      return;
    }

    authInitializedRef.current = true;

    // DEV MODE: Auto-initialize with mock user
    if (isDevMode()) {
      getMockAuth().then(({ getCurrentMockUser, MOCK_ACCESS_TOKEN }) => {
        const mockUser = getCurrentMockUser();
        setUser(mockUser);
        setAccessToken(MOCK_ACCESS_TOKEN);
        setLoading(false);
        log(
          '[DEV MODE] Auto-initialized with mock user:',
          mockUser.displayName,
          `(${mockUser.role})`
        );
      });
      return () => {
        authInitializedRef.current = false;
      };
    }

    // PRODUCTION: Check for existing session in localStorage
    const restoreSession = async () => {
      const storedToken = sessionStorage.getItem('googleAccessToken');
      const expiresAt = sessionStorage.getItem('googleAccessTokenExpiresAt');
      const storedUserInfo = sessionStorage.getItem('googleUserInfo');

      if (storedToken && expiresAt && Date.now() < parseInt(expiresAt)) {
        // Token exists and hasn't expired — restore the session optimistically.
        // We trust the stored expiry timestamp rather than making a live API call,
        // which would log the user out on any transient network error.
        // If the token is actually invalid, the first Sheets/Calendar API call
        // will return 401 and the app will prompt re-authentication then.
        setAccessToken(storedToken);

        // Restore user from stored info (no network call needed)
        if (storedUserInfo) {
          try {
            const userInfo = JSON.parse(storedUserInfo);
            setUser(userInfo);
            setLoading(false);
            return;
          } catch {
            // Stored user info is malformed — fall through to fetch it
          }
        }

        // Stored user info missing or malformed — fetch it once
        try {
          const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });

          if (response.ok) {
            const userInfo = await response.json();
            const restoredUser = {
              uid: userInfo.sub,
              email: userInfo.email,
              displayName: userInfo.name,
              photoURL: userInfo.picture,
            };
            setUser(restoredUser);
            sessionStorage.setItem('googleUserInfo', JSON.stringify(restoredUser));
          }
          // If the fetch fails, we still have a valid non-expired token.
          // Don't log the user out — leave user as null and let the app
          // handle the unauthenticated state gracefully.
        } catch {
          // Network error — keep the token, don't clear the session.
        }
      } else if (storedToken) {
        // Token exists but timestamp says it's expired — clear it.
        sessionStorage.removeItem('googleAccessToken');
        sessionStorage.removeItem('googleAccessTokenExpiresAt');
        sessionStorage.removeItem('googleUserInfo');
      }

      setLoading(false);
    };

    restoreSession();

    return () => {
      authInitializedRef.current = false;
    };
  }, []);

  // Register auth error handler so API utilities can signal re-auth is needed
  useEffect(() => {
    if (isDevMode()) return;
    registerAuthErrorHandler(() => setNeedsReauth(true));
    return () => registerAuthErrorHandler(null);
  }, []);

  // Auto-clear needsReauth when a new token arrives (refresh succeeded)
  useEffect(() => {
    if (accessToken && prevTokenRef.current !== null && prevTokenRef.current !== accessToken) {
      setNeedsReauth(false);
    }
    prevTokenRef.current = accessToken;
  }, [accessToken]);

  // Token refresh removed - will happen on-demand when API calls fail
  // This prevents surprise popup interruptions during user's work

  // Calendar access - check if token has calendar scope
  const hasCalendarAccess = useCallback(async () => {
    if (isDevMode()) {
      // Dev mode: check localStorage setting
      const settings = JSON.parse(localStorage.getItem('touchpoint_calendar_settings') || '{}');
      return settings.enabled === true;
    }

    if (!accessToken) return false;

    try {
      // Use Authorization header to prevent token exposure in logs
      const response = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return false;

      const data = await response.json();
      return data.scope?.includes(CALENDAR_SCOPE) || false;
    } catch {
      return false;
    }
  }, [accessToken]);

  // Request calendar access via incremental consent
  const requestCalendarAccess = useCallback(async () => {
    if (isDevMode()) {
      // Dev mode: just enable in localStorage
      const settings = JSON.parse(localStorage.getItem('touchpoint_calendar_settings') || '{}');
      settings.enabled = true;
      localStorage.setItem('touchpoint_calendar_settings', JSON.stringify(settings));
      log('[DEV MODE] Calendar access enabled in localStorage');
      return true;
    }

    // Production: trigger OAuth with calendar scope
    return new Promise((resolve, reject) => {
      const state = generateOAuthState();
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      // Build OAuth URL with incremental consent
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: window.location.origin,
        response_type: 'token',
        scope: CALENDAR_SCOPE,
        state,
        prompt: 'consent',
        include_granted_scopes: 'true', // Keep existing scopes
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

      // Open popup
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        authUrl,
        'Google Calendar Authorization',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        reject(new Error('Popup blocked'));
        return;
      }

      // Listen for OAuth callback
      const handleMessage = (event) => {
        if (event.origin !== window.location.origin) return;

        const { type, token, state: receivedState, error } = event.data;

        if (type === 'oauth-callback') {
          window.removeEventListener('message', handleMessage);
          popup.close();

          if (error) {
            reject(new Error(error));
            return;
          }

          if (!validateOAuthState(receivedState)) {
            reject(new Error('OAuth state validation failed'));
            return;
          }

          // Update token with new scope
          setAccessToken(token);
          sessionStorage.setItem('googleAccessToken', token);
          // Update expiration metadata (tokens typically expire in 3600 seconds)
          const expiresAt = Date.now() + 3600 * 1000;
          sessionStorage.setItem('googleAccessTokenExpiresAt', expiresAt.toString());

          log('Calendar access granted');
          resolve(true);
        }
      };

      window.addEventListener('message', handleMessage);

      // Timeout after 2 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (!popup.closed) popup.close();
        reject(new Error('Authorization timeout'));
      }, 120000);
    });
  }, []);

  const value = {
    user,
    accessToken,
    signInWithGoogle,
    refreshAccessToken,
    logout,
    loading,
    hasCalendarAccess,
    requestCalendarAccess,
    needsReauth,
    triggerReauth: () => setNeedsReauth(true),
    clearReauth: () => setNeedsReauth(false),
    // Dev mode utilities
    isDevMode: isDevMode(),
    setMockUserRole: useCallback(async (role) => {
      if (isDevMode()) {
        const mockAuth = await getMockAuth();
        mockAuth.setMockUserRole(role);
        const mockUser = mockAuth.getCurrentMockUser();
        setUser(mockUser);
        log('[DEV MODE] Switched to:', mockUser.displayName, `(${mockUser.role})`);
      }
    }, []),
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}
