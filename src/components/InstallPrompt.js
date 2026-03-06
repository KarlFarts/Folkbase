import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import './InstallPrompt.css';

/**
 * InstallPrompt Component
 *
 * Shows a custom install banner when the PWA can be installed.
 * Handles both Chrome/Edge (beforeinstallprompt) and iOS Safari (manual instructions).
 */
function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS] = useState(
    () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
  );

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed =
      localStorage.getItem('folkbase_install_prompt_dismissed') ||
      localStorage.getItem('touchpoint_install_prompt_dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Check if already installed (in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      return;
    }

    // For iOS, show manual install instructions after a few uses
    if (isIOS) {
      const visitCount = parseInt(
        localStorage.getItem('folkbase_visit_count') ||
          localStorage.getItem('touchpoint_visit_count') ||
          '0',
        10,
      );
      localStorage.setItem('folkbase_visit_count', (visitCount + 1).toString());

      // Show after 5 visits (not on first few)
      if (visitCount >= 4) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
      return;
    }

    // For Chrome/Edge, capture the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Show prompt after a delay (not immediately on first visit)
      const visitCount = parseInt(
        localStorage.getItem('folkbase_visit_count') ||
          localStorage.getItem('touchpoint_visit_count') ||
          '0',
        10,
      );
      localStorage.setItem('folkbase_visit_count', (visitCount + 1).toString());

      // Show after 5 visits (not on first few)
      if (visitCount >= 4) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('folkbase_install_prompt_dismissed', 'true');
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="install-prompt">
      <div className="install-prompt-content">
        <button className="install-prompt-close" onClick={handleDismiss} aria-label="Dismiss">
          <X size={20} />
        </button>

        {isIOS ? (
          // iOS Safari - Manual instructions
          <>
            <div className="install-prompt-icon">
              <Share size={24} />
            </div>
            <div className="install-prompt-text">
              <h3>Install Folkbase</h3>
              <p>
                Add Folkbase to your home screen for quick access. Tap the{' '}
                <Share size={14} className="install-prompt-inline-icon" /> Share
                button below, then select "Add to Home Screen"
              </p>
            </div>
            <button className="btn btn-secondary" onClick={handleDismiss}>
              Got it
            </button>
          </>
        ) : (
          // Chrome/Edge - Native install prompt
          <>
            <div className="install-prompt-icon">
              <Download size={24} />
            </div>
            <div className="install-prompt-text">
              <h3>Install Folkbase</h3>
              <p>Add Folkbase to your home screen for quick access and offline use</p>
            </div>
            <div className="install-prompt-actions">
              <button className="btn btn-primary" onClick={handleInstall}>
                Install
              </button>
              <button className="btn btn-ghost" onClick={handleDismiss}>
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default InstallPrompt;
