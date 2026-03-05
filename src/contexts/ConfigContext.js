import React, { createContext, useState, useContext } from 'react';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

// Google Sheet IDs are 44-char base64 strings
const isValidSheetId = (id) =>
  typeof id === 'string' && id.length > 20 && !id.includes(' ') && !id.includes('_here');

export const ConfigProvider = ({ children }) => {
  const getInitialConfig = () => {
    // DEV MODE: Auto-initialize with dummy sheet ID (no Google Sheets needed)
    if (import.meta.env.VITE_DEV_MODE === 'true') {
      return { personalSheetId: 'dev-mode-dummy-sheet-id', isLoaded: true };
    }

    // PRODUCTION: Load from localStorage or wait for setup
    // Try new key first, fall back to old key for migration
    const personalSheet =
      localStorage.getItem('personalSheetId') || localStorage.getItem('googleSheetId');

    if (personalSheet && isValidSheetId(personalSheet)) {
      localStorage.setItem('personalSheetId', personalSheet);
      localStorage.removeItem('googleSheetId');
      return { personalSheetId: personalSheet, isLoaded: true };
    } else {
      // Clear invalid/stale values
      localStorage.removeItem('personalSheetId');
      localStorage.removeItem('googleSheetId');
      return { personalSheetId: null, isLoaded: true };
    }
  };

  const [config, setConfig] = useState(getInitialConfig);

  const saveConfig = (newConfig) => {
    if (newConfig.personalSheetId) {
      localStorage.setItem('personalSheetId', newConfig.personalSheetId);
    }
    // Support legacy sheetId property for backward compatibility
    if (newConfig.sheetId) {
      localStorage.setItem('personalSheetId', newConfig.sheetId);
    }
    setConfig({ ...newConfig, isLoaded: true });
  };

  const value = { config, saveConfig };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};
