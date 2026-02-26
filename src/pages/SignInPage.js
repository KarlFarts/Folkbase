import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { probeSheetAccess } from '../utils/sheetCreation';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { classifyAuthError } from '../utils/connectionErrors';
import ConnectionStatusPanel from '../components/ConnectionStatusPanel';
import './SignInPage.css';

/**
 * Full-screen split-screen sign-in page.
 * Left: sign-in card. Right: branding panel.
 *
 * @param {Function} props.onSignedIn - Called with the user object after successful sign-in.
 */
const SignInPage = ({ onSignedIn, initialError }) => {
  const { signInWithGoogle } = useAuth();
  const { config } = useConfig();
  const [isLoading, setIsLoading] = useState(false);
  const { steps, setStepStatus, resetStep } = useConnectionStatus();

  useEffect(() => {
    if (initialError) {
      const classified = classifyAuthError(initialError);
      setStepStatus(classified.step, 'error', classified);
    }
  }, [initialError, setStepStatus]);

  const handleSignIn = async () => {
    setIsLoading(true);
    resetStep('account');
    resetStep('sheets');
    setStepStatus('account', 'checking');

    try {
      const user = await signInWithGoogle();
      setStepStatus('account', 'connected');

      // Returning users: verify the new token can reach their sheet
      if (config.personalSheetId) {
        setStepStatus('sheets', 'checking');
        const token = localStorage.getItem('googleAccessToken');
        if (!token) {
          setStepStatus('sheets', 'error', {
            detail: 'Sign-in succeeded but the token could not be retrieved.',
            fix: 'Please try again.',
          });
          setIsLoading(false);
          return;
        }
        const probe = await probeSheetAccess(token, config.personalSheetId);
        if (!probe.ok) {
          const classified = classifyAuthError(probe.error);
          setStepStatus(classified.step, 'error', classified);
          setIsLoading(false);
          return;
        }
        setStepStatus('sheets', 'connected');
      }

      onSignedIn(user);
    } catch (err) {
      const classified = classifyAuthError(err);
      setStepStatus(classified.step, 'error', classified);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = (stepId) => {
    resetStep(stepId);
    handleSignIn();
  };

  // Only show account and sheets steps on sign-in page
  const visibleSteps = steps.filter((s) => s.id === 'account' || s.id === 'sheets');

  return (
    <div className="sign-in-page">
      {/* Left: sign-in card */}
      <div className="sign-in-left">
        <div className="sign-in-card">
          <h1 className="sign-in-title">Welcome back</h1>
          <p className="sign-in-subtitle">Sign in to continue to Folkbase.</p>

          <button
            type="button"
            className="sign-in-google-btn"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            <svg className="sign-in-google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          <ConnectionStatusPanel steps={visibleSteps} onRetry={handleRetry} compact />

          <p className="sign-in-note">First time here? It&apos;s free.</p>
        </div>
      </div>

      {/* Right: branding panel */}
      <div className="sign-in-right">
        <div className="sign-in-brand">
          <h2 className="sign-in-brand-name">Folkbase</h2>
          <p className="sign-in-brand-tagline">Your personal relationship manager.</p>
          <p className="sign-in-brand-description">
            Keep track of the people that matter — contacts, organizations, events, and
            touchpoints — all stored privately in your own Google Sheet.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
