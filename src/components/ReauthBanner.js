import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './ReauthBanner.css';

export default function ReauthBanner() {
  const { needsReauth, clearReauth, refreshAccessToken } = useAuth();
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState(null);

  if (!needsReauth) return null;

  const handleReconnect = async () => {
    setReconnecting(true);
    setError(null);
    try {
      await refreshAccessToken();
      clearReauth();
    } catch {
      setError('Reconnect failed. Please try again.');
      setReconnecting(false);
    }
  };

  return (
    <div className="reauth-banner" role="alert">
      <AlertTriangle size={18} className="reauth-banner-icon" />
      <span className="reauth-banner-message">
        Your Google account needs to be reconnected.
      </span>
      <button
        className="btn btn-sm btn-primary reauth-banner-btn"
        onClick={handleReconnect}
        disabled={reconnecting}
      >
        {reconnecting ? 'Reconnecting...' : 'Reconnect Now'}
      </button>
      {error && <span className="reauth-banner-error">{error}</span>}
    </div>
  );
}
