import { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * UserMenuDropdown - Avatar + name button with dropdown for Settings and Sign Out.
 * Works in both dev and production modes.
 * In dev mode, the DevModeRoleSwitcher is rendered separately and this component is hidden.
 */
function UserMenuDropdown() {
  const { user, logout, isDevMode } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // In dev mode the DevModeRoleSwitcher already handles the user menu
  if (isDevMode) return null;

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await logout();
    } catch {
      // Silent failure expected
    }
  };

  const initials =
    user?.displayName
      ?.split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  return (
    <div className="umd-wrap" ref={ref}>
      <button
        className="umd-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {user?.photoURL ? (
          <img src={user.photoURL} alt="avatar" className="umd-avatar-img" />
        ) : (
          <span className="umd-avatar-initials">{initials}</span>
        )}
        <ChevronDown size={13} className={`umd-chevron ${isOpen ? 'umd-chevron--open' : ''}`} />
      </button>

      {isOpen && (
        <div className="umd-dropdown">
          <div className="umd-profile">
            <span className="umd-name">{user?.displayName}</span>
            <span className="umd-email">{user?.email}</span>
          </div>
          <div className="umd-divider" />
          <button
            className="umd-item"
            onClick={() => {
              setIsOpen(false);
              navigate('/settings');
            }}
          >
            <Settings size={15} />
            Settings
          </button>
          <button className="umd-item umd-item--danger" onClick={handleLogout}>
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenuDropdown;
