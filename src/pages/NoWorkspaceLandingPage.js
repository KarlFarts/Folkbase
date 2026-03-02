import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Link } from 'lucide-react';

const NoWorkspaceLandingPage = ({ onSetup }) => {
  const navigate = useNavigate();
  const [inviteUrl, setInviteUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  const handleJoinWithLink = () => {
    setUrlError('');
    try {
      const url = new URL(inviteUrl.trim());
      const token = url.searchParams.get('token');
      const sheet = url.searchParams.get('sheet');

      if (!token) {
        setUrlError('No invitation token found in that URL.');
        return;
      }

      const joinPath = sheet ? `/join?token=${token}&sheet=${sheet}` : `/join?token=${token}`;
      navigate(joinPath);
    } catch {
      // Maybe they pasted just a token
      const trimmed = inviteUrl.trim();
      if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
        navigate(`/join?token=${trimmed}`);
      } else {
        setUrlError('Please paste a valid invite link or token.');
      }
    }
  };

  return (
    <div className="nwlp-page">
      <div className="nwlp-inner">
        <h1 className="nwlp-title">Welcome to Folkbase</h1>
        <p className="nwlp-subtitle">Choose how you'd like to get started.</p>

        <div className="nwlp-cards">
          <div className="nwlp-card">
            <div className="nwlp-card-icon">
              <Users size={32} />
            </div>
            <h2>Set up your own contact manager</h2>
            <p>Create a personal Google Sheet to store and manage your contacts, touchpoints, and notes.</p>
            <button className="btn btn-primary" onClick={onSetup}>
              Get Started
            </button>
          </div>

          <div className="nwlp-card">
            <div className="nwlp-card-icon">
              <Link size={32} />
            </div>
            <h2>I have an invite link</h2>
            <p>Join an existing workspace someone shared with you.</p>
            <div className="nwlp-join-form">
              <input
                type="text"
                className="nwlp-invite-input"
                placeholder="Paste invite link or token here"
                value={inviteUrl}
                onChange={(e) => setInviteUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinWithLink()}
              />
              {urlError && <p className="nwlp-error">{urlError}</p>}
              <button
                className="btn btn-primary"
                onClick={handleJoinWithLink}
                disabled={!inviteUrl.trim()}
              >
                Join Workspace
              </button>
            </div>
            <p className="nwlp-hint">Waiting for an invite? Ask a workspace owner to send you one.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoWorkspaceLandingPage;
