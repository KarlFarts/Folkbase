import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, BarChart3, Settings, Check, ChevronDown } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';

const WorkspaceSwitcher = () => {
  const navigate = useNavigate();
  const { activeWorkspace, userWorkspaces, mode, switchToWorkspace, switchToPersonal } =
    useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchToPersonal = () => {
    switchToPersonal();
    setIsOpen(false);
    navigate('/');
  };

  const handleSwitchToWorkspace = (workspace) => {
    switchToWorkspace(workspace);
    setIsOpen(false);
    navigate('/contacts');
  };

  const handleManageWorkspaces = () => {
    setIsOpen(false);
    navigate('/workspaces');
  };

  const displayName =
    mode === 'personal' ? 'Personal Contacts' : activeWorkspace?.name || 'Workspace';

  return (
    <div className="workspace-switcher" ref={dropdownRef}>
      <button
        className="workspace-switcher-button workspace-switcher-subtle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="workspace-name">{displayName}</span>
        <ChevronDown size={14} className={`dropdown-arrow${isOpen ? ' open' : ''}`} />
      </button>

      {isOpen && (
        <div className="workspace-switcher-dropdown">
          <div className="dropdown-section">
            <div className="dropdown-section-header">Personal</div>
            <button
              className={`dropdown-item ${mode === 'personal' ? 'active' : ''}`}
              onClick={handleSwitchToPersonal}
            >
              <span className="item-icon">
                <Home size={16} />
              </span>
              <span>Personal Contacts</span>
              {mode === 'personal' && (
                <span className="checkmark">
                  <Check size={16} />
                </span>
              )}
            </button>
          </div>

          {userWorkspaces.length > 0 && (
            <div className="dropdown-section">
              <div className="dropdown-section-header">Workspaces</div>
              {userWorkspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  className={`dropdown-item ${
                    mode === 'workspace' && activeWorkspace?.id === workspace.id ? 'active' : ''
                  }`}
                  onClick={() => handleSwitchToWorkspace(workspace)}
                >
                  <span className="item-icon">
                    <BarChart3 size={16} />
                  </span>
                  <span>{workspace.name}</span>
                  {mode === 'workspace' && activeWorkspace?.id === workspace.id && (
                    <span className="checkmark">
                      <Check size={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="dropdown-section dropdown-actions">
            <button className="dropdown-item action-item" onClick={handleManageWorkspaces}>
              <span className="item-icon">
                <Settings size={16} />
              </span>
              <span>Manage Workspaces</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
