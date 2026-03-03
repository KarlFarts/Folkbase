import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import ContactsDropdown from './ContactsDropdown';
import Breadcrumbs from './Breadcrumbs';
import { DevModeRoleSwitcher } from './DevModeRoleSwitcher';
import { ApiUsageIndicator } from './ApiUsageIndicator';
import UserMenuDropdown from './UserMenuDropdown';

function Navbar({ onNavigate }) {
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Silent failure expected
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar-left">
          <div className="navbar-brand" onClick={() => onNavigate('dashboard')}>
            <img src="/logo.svg" alt="Folkbase Logo" className="navbar-logo" />
            FOLKBASE
          </div>
        </div>

        <button
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <ContactsDropdown mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          <Link
            to="/touchpoints"
            className={`nav-link ${isActive('/touchpoints') ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Touchpoints
          </Link>
          <Link
            to="/events"
            className={`nav-link ${isActive('/events') ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Events
          </Link>
          <Link
            to="/notes"
            className={`nav-link ${isActive('/notes') ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Notes
          </Link>
        </div>

        <div className="navbar-nav navbar-right">
          <WorkspaceSwitcher />
          {import.meta.env.VITE_DEV_MODE === 'true' && <ApiUsageIndicator />}
          <DevModeRoleSwitcher
            onShowSettings={() => navigate('/settings')}
            onLogout={handleLogout}
          />
          <UserMenuDropdown />
        </div>
      </nav>
      <Breadcrumbs />
    </>
  );
}

export default Navbar;
