import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './styles/index.css';
import App from './App';
import { ConfigProvider } from './contexts/ConfigContext';
import { validateProductionEnv, renderEnvErrorScreen } from './utils/validateEnv';
import { initErrorReporting } from './utils/errorReporting';
import { GOOGLE_CLIENT_ID } from './googleAuth';
import { isDevMode } from './__tests__/mocks/mockAuth';
import { seedTestRelationships } from './utils/seedRelationships';

// Validate environment variables before starting the app
const envValidation = validateProductionEnv();
if (!envValidation.valid) {
  const errorScreen = renderEnvErrorScreen(envValidation);
  document.body.innerHTML = '';
  document.body.appendChild(errorScreen);
  throw new Error(envValidation.message);
}

// Log environment mode
if (envValidation.mode === 'development') {
  // eslint-disable-next-line no-console
  console.log('[DEV] Running in DEVELOPMENT mode');
  // Make seed function available globally in dev mode
  window.seedTestRelationships = seedTestRelationships;
  // eslint-disable-next-line no-console
  console.log(
    '[DEV] 💡 Run window.seedTestRelationships() in console to add test relationship data'
  );
} else {
  // eslint-disable-next-line no-console
  console.log('[INFO] Running in PRODUCTION mode');
}

// Initialize error reporting (Sentry, etc.)
initErrorReporting({ service: 'sentry' });

// No theme initialization needed - using single classic light theme

const root = ReactDOM.createRoot(document.getElementById('root'));

// In dev mode, skip GoogleOAuthProvider since we use mock auth
const AppWrapper = isDevMode() ? (
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
) : (
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ConfigProvider>
          <App />
        </ConfigProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);

root.render(AppWrapper);
