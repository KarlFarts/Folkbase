import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ContactsDropdown = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine if any contacts-related route is active
  const isActiveRoute = () => {
    const path = location.pathname;
    return (
      path.startsWith('/contacts') ||
      path.startsWith('/organizations') ||
      path.startsWith('/locations')
    );
  };

  // Handle navigation to a specific route
  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="contacts-dropdown" ref={dropdownRef}>
      <button
        className={`contacts-dropdown-button ${isActiveRoute() ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Contacts</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="contacts-dropdown-menu">
          <button
            className={`contacts-dropdown-item ${location.pathname.startsWith('/contacts') ? 'active' : ''}`}
            onClick={() => handleNavigate('/contacts')}
          >
            Contacts
          </button>
          <button
            className={`contacts-dropdown-item ${location.pathname.startsWith('/organizations') ? 'active' : ''}`}
            onClick={() => handleNavigate('/organizations')}
          >
            Organizations
          </button>
          <button
            className={`contacts-dropdown-item ${location.pathname.startsWith('/locations') ? 'active' : ''}`}
            onClick={() => handleNavigate('/locations')}
          >
            Locations
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactsDropdown;
