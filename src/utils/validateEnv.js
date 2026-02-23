/**
 * Environment Variable Validation
 *
 * Validates that all required environment variables are set before
 * the application starts. Provides clear error messages for missing config.
 */

/**
 * Validates production environment variables
 * @returns {Object} Validation result with { valid: boolean, missing?: string[], message?: string }
 */
export function validateProductionEnv() {
  // Skip validation in dev mode
  if (import.meta.env.VITE_DEV_MODE === 'true') {
    return { valid: true, mode: 'development' };
  }

  // Only the Client ID is required at startup — the Sheet ID gets set by the setup wizard
  const required = ['VITE_GOOGLE_CLIENT_ID'];

  const missing = required.filter(
    (key) => !import.meta.env[key] || import.meta.env[key] === 'dev_mode_not_needed'
  );

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `Missing required environment variables: ${missing.join(', ')}`,
      help: 'Please configure your environment variables in your hosting platform or create a .env file with production values.',
    };
  }

  // Validate format of critical variables
  const validations = [];

  // Validate Google Client ID (should end with .apps.googleusercontent.com)
  if (
    import.meta.env.VITE_GOOGLE_CLIENT_ID &&
    !import.meta.env.VITE_GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')
  ) {
    validations.push(
      'VITE_GOOGLE_CLIENT_ID appears to have an invalid format (should end with ".apps.googleusercontent.com")'
    );
  }

  if (validations.length > 0) {
    return {
      valid: false,
      warnings: validations,
      message: 'Environment variables have potential format issues:\n' + validations.join('\n'),
    };
  }

  return { valid: true, mode: 'production' };
}

/**
 * Renders a user-friendly error screen for missing environment variables
 * @param {Object} validationResult - Result from validateProductionEnv()
 * @returns {HTMLElement} Error screen element
 */
export function renderEnvErrorScreen(validationResult) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: linear-gradient(135deg, #c2703e 0%, #8f4e28 100%);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'max-width: 600px; text-align: center;';

  const setupLabel = document.createElement('div');
  setupLabel.style.cssText = 'font-size: 2rem; margin-bottom: 1rem; font-weight: bold;';
  setupLabel.textContent = 'Setup';
  wrapper.appendChild(setupLabel);

  const heading = document.createElement('h1');
  heading.style.cssText = 'font-size: 2rem; margin-bottom: 1rem; font-weight: 600;';
  heading.textContent = 'Configuration Required';
  wrapper.appendChild(heading);

  const message = document.createElement('p');
  message.style.cssText = 'font-size: 1.125rem; margin-bottom: 2rem; opacity: 0.9;';
  message.textContent = validationResult.message;
  wrapper.appendChild(message);

  if (validationResult.missing) {
    const missingBox = document.createElement('div');
    missingBox.style.cssText =
      'background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; text-align: left;';
    const missingHeading = document.createElement('h2');
    missingHeading.style.cssText = 'font-size: 1rem; margin-bottom: 1rem; font-weight: 600;';
    missingHeading.textContent = 'Missing Variables:';
    missingBox.appendChild(missingHeading);
    const missingList = document.createElement('ul');
    missingList.style.cssText = 'list-style: none; padding: 0; margin: 0;';
    validationResult.missing.forEach((key) => {
      const li = document.createElement('li');
      li.style.cssText = 'padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.1);';
      li.textContent = `\u2022 ${key}`;
      missingList.appendChild(li);
    });
    missingBox.appendChild(missingList);
    wrapper.appendChild(missingBox);
  }

  if (validationResult.warnings) {
    const warnBox = document.createElement('div');
    warnBox.style.cssText =
      'background: rgba(255,200,0,0.2); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; text-align: left;';
    const warnHeading = document.createElement('h2');
    warnHeading.style.cssText = 'font-size: 1rem; margin-bottom: 1rem; font-weight: 600;';
    warnHeading.textContent = 'Warnings:';
    warnBox.appendChild(warnHeading);
    const warnList = document.createElement('ul');
    warnList.style.cssText = 'list-style: none; padding: 0; margin: 0;';
    validationResult.warnings.forEach((warning) => {
      const li = document.createElement('li');
      li.style.cssText = 'padding: 0.5rem 0; font-size: 0.875rem;';
      li.textContent = `\u2022 ${warning}`;
      warnList.appendChild(li);
    });
    warnBox.appendChild(warnList);
    wrapper.appendChild(warnBox);
  }

  const howToBox = document.createElement('div');
  howToBox.style.cssText =
    'background: rgba(255,255,255,0.1); padding: 1.5rem; border-radius: 8px; text-align: left;';
  const howToHeading = document.createElement('h2');
  howToHeading.style.cssText = 'font-size: 1rem; margin-bottom: 1rem; font-weight: 600;';
  howToHeading.textContent = 'How to Fix:';
  howToBox.appendChild(howToHeading);
  const steps = document.createElement('ol');
  steps.style.cssText = 'margin: 0; padding-left: 1.5rem; line-height: 1.8;';
  const stepTexts = [
    'Go to console.cloud.google.com',
    'Create a project and enable the Google Sheets API',
    'Create OAuth 2.0 credentials (Web application)',
    'Add authorized origins (localhost:3000 for dev, your domain for prod)',
    'Set VITE_GOOGLE_CLIENT_ID in your environment',
    'Create a Google Sheet and set VITE_GOOGLE_SHEETS_ID',
  ];
  stepTexts.forEach((text, i) => {
    const li = document.createElement('li');
    if (i === 0) {
      const link = document.createElement('a');
      link.href = 'https://console.cloud.google.com';
      link.target = '_blank';
      link.style.color = '#d4875a';
      link.textContent = 'console.cloud.google.com';
      li.textContent = 'Go to ';
      li.appendChild(link);
    } else {
      li.textContent = text;
    }
    steps.appendChild(li);
  });
  howToBox.appendChild(steps);
  const helpNote = document.createElement('p');
  helpNote.style.cssText = 'margin-top: 1rem; font-size: 0.875rem; opacity: 0.8;';
  helpNote.textContent = 'See SETUP_GUIDE.md for detailed instructions.';
  howToBox.appendChild(helpNote);
  wrapper.appendChild(howToBox);

  const retryBtn = document.createElement('button');
  retryBtn.style.cssText = `
    margin-top: 2rem;
    padding: 0.75rem 2rem;
    background: white;
    color: #c2703e;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  `;
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', () => window.location.reload());
  retryBtn.addEventListener('mouseover', () => (retryBtn.style.transform = 'scale(1.05)'));
  retryBtn.addEventListener('mouseout', () => (retryBtn.style.transform = 'scale(1)'));
  wrapper.appendChild(retryBtn);

  container.appendChild(wrapper);

  return container;
}
