/**
 * Development Mode Role Switcher Component
 *
 * Small dropdown in the top-right corner that allows switching between mock user roles.
 * Only visible when VITE_DEV_MODE is enabled.
 *
 * IMPORTANT: This component is dev-mode only and will not appear in production builds.
 */

import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './DevModeRoleSwitcher.css';

export function DevModeRoleSwitcher({ onShowSettings, onLogout }) {
  const { isDevMode, user, setMockUserRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mockUsers, setMockUsers] = useState({});
  const [currentRole, setCurrentRole] = useState('admin');
  const [devPermRole, setDevPermRole] = useState(localStorage.getItem('dev_permission_role') || 'editor');

  useEffect(() => {
    if (isDevMode) {
      import('../__tests__/mocks/mockAuth').then((mod) => {
        setMockUsers(mod.mockUsers);
        setCurrentRole(mod.getCurrentMockRole());
      });
    }
  }, [isDevMode, user]);

  if (!isDevMode) {
    return null;
  }

  const handleRoleChange = (roleKey) => {
    setMockUserRole(roleKey);
    setIsOpen(false);
  };

  return (
    <div className="dev-mode-role-switcher" title="Development Mode: Click to switch user role">
      <button
        className="role-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch dev mode user role"
        aria-expanded={isOpen}
      >
        <span className="current-role">Profile</span>
        <ChevronDown size={14} className={`dropdown-arrow ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="role-switcher-dropdown">
          <div className="dropdown-section">
            <div className="dropdown-header">Profile</div>
            <div className="profile-info">
              <span className="profile-email">{user?.email}</span>
            </div>
          </div>
          <div className="dropdown-divider"></div>
          <div className="dropdown-header">Switch User Role</div>
          {Object.entries(mockUsers).map(([key, mockUser]) => (
            <button
              key={key}
              className={`role-option ${currentRole === key ? 'active' : ''}`}
              onClick={() => handleRoleChange(key)}
            >
              <span className="role-name">{mockUser.displayName}</span>
              <span className="role-email">{mockUser.email}</span>
              <span className="role-type">{mockUser.role}</span>
              {currentRole === key && (
                <span className="checkmark">
                  <Check size={14} />
                </span>
              )}
            </button>
          ))}
          <div className="dropdown-footer">
            <p>Roles persist across page reloads</p>
          </div>
          <div className="dropdown-divider"></div>
          <div className="dropdown-header">Permission Role (viewer test)</div>
          {['editor', 'viewer'].map((role) => (
            <button
              key={role}
              className={`role-option ${devPermRole === role ? 'active' : ''}`}
              onClick={() => {
                localStorage.setItem('dev_permission_role', role);
                setDevPermRole(role);
                setIsOpen(false);
                window.location.reload();
              }}
            >
              <span className="role-name">{role.charAt(0).toUpperCase() + role.slice(1)}</span>
              {devPermRole === role && (
                <span className="checkmark">
                  <Check size={14} />
                </span>
              )}
            </button>
          ))}
          <div className="dropdown-divider"></div>
          <button
            className="dropdown-action"
            onClick={() => {
              onShowSettings();
              setIsOpen(false);
            }}
          >
            <Settings size={16} className="dropdown-action-icon" />
            Settings
          </button>
          <button className="dropdown-action dropdown-action-danger" onClick={onLogout}>
            <LogOut size={16} className="dropdown-action-icon" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
