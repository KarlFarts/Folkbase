#!/usr/bin/env node
/* eslint-disable no-console */
/* global process */

/**
 * ============================================================================
 * ADD-API CLI TOOL
 * ============================================================================
 *
 * Interactive CLI tool to add new API integrations to Touchpoint CRM.
 * This tool makes it easy for beginners to add free APIs with automatic
 * rate limit tracking and monitoring.
 *
 * Usage:
 *   npm run add-api
 *
 * What it does:
 *   1. Asks you questions about the API you want to add
 *   2. Automatically adds the API configuration to constants.js
 *   3. Creates a template service file in src/services/
 *   4. Updates .env.example with any required API keys
 *
 * No additional dependencies required - uses Node.js built-in readline!
 *
 * ============================================================================
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ============================================================================
// COMMON FREE APIs SUGGESTIONS
// ============================================================================
// These are popular free APIs that beginners might want to use

const POPULAR_FREE_APIS = [
  {
    name: 'OpenWeatherMap',
    description: 'Weather data for any location',
    rateLimit: '1,000 calls/day (free tier)',
    requiresKey: true,
    signupUrl: 'https://openweathermap.org/api',
  },
  {
    name: 'OpenStreetMap Nominatim',
    description: 'Free geocoding (address to coordinates)',
    rateLimit: '1 request/second',
    requiresKey: false,
    signupUrl: 'https://nominatim.org/',
  },
  {
    name: 'ExchangeRate-API',
    description: 'Currency exchange rates',
    rateLimit: '1,500 calls/month (free tier)',
    requiresKey: true,
    signupUrl: 'https://www.exchangerate-api.com/',
  },
  {
    name: 'REST Countries',
    description: 'Country information and flags',
    rateLimit: 'Unlimited (no key needed)',
    requiresKey: false,
    signupUrl: 'https://restcountries.com/',
  },
  {
    name: 'Abstract API (Email Validation)',
    description: 'Validate email addresses',
    rateLimit: '100 calls/month (free tier)',
    requiresKey: true,
    signupUrl: 'https://www.abstractapi.com/email-verification-validation-api',
  },
];

// ============================================================================
// TERMINAL COLORS (works in most terminals)
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a readline interface for user input
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask a question and wait for user input
 */
function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Ask a yes/no question
 */
async function askYesNo(rl, question, defaultValue = true) {
  const defaultHint = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = await ask(rl, `${question} ${defaultHint}: `);

  if (answer === '') return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

/**
 * Convert a name to a service ID (kebab-case)
 * Example: "OpenWeatherMap" -> "openweathermap"
 */
function toServiceId(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Convert a name to a constant name (SCREAMING_SNAKE_CASE)
 * Example: "OpenWeatherMap" -> "OPENWEATHERMAP"
 */
function toConstantName(name) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Convert a name to a camelCase service file name
 * Example: "OpenWeatherMap" -> "openWeatherMapService"
 */
function toServiceFileName(name) {
  const cleaned = name.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const words = cleaned.split(' ');
  const camelCase = words
    .map((word, index) => {
      if (index === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
  return `${camelCase}Service.js`;
}

/**
 * Convert a name to an environment variable name
 * Example: "OpenWeatherMap" -> "VITE_OPENWEATHERMAP_API_KEY"
 */
function toEnvVarName(name) {
  return `VITE_${toConstantName(name)}_API_KEY`;
}

// ============================================================================
// RATE LIMIT HELPERS
// ============================================================================

/**
 * Parse rate limit type from user input
 */
function parseRateLimitType(input) {
  const lower = input.toLowerCase();

  if (lower.includes('second')) return 'per-second';
  if (lower.includes('minute')) return 'per-minute';
  if (lower.includes('hour')) return 'per-hour';
  if (lower.includes('day')) return 'per-day';
  if (lower.includes('month')) return 'per-month';
  if (lower.includes('100') && lower.includes('sec')) return 'per-100-seconds';

  // Default to per-minute if unclear
  return 'per-minute';
}

/**
 * Get window in seconds from rate limit type
 */
function getWindowSeconds(type) {
  switch (type) {
    case 'per-second':
      return 1;
    case 'per-minute':
      return 60;
    case 'per-hour':
      return 3600;
    case 'per-day':
      return 86400;
    case 'per-month':
      return 2592000;
    case 'per-100-seconds':
      return 100;
    default:
      return 60;
  }
}

// ============================================================================
// FILE GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate the API_QUOTAS entry for constants.js
 */
function generateQuotaEntry(config) {
  const { constantName, displayName, cost, quotas, documentationUrl } = config;

  const quotasArray = quotas
    .map(
      (q) => `      {
        type: '${q.type}',
        limit: ${q.limit},
        window: ${q.window},
        description: '${q.description}',
      }`
    )
    .join(',\n');

  return `
  ${constantName}: {
    name: '${displayName}',
    cost: '${cost}',
    enabled: true,
    quotas: [
${quotasArray}
    ],
    documentationUrl: '${documentationUrl}',
  },`;
}

/**
 * Generate the service file template
 */
function generateServiceFile(config) {
  const { displayName, serviceId, envVarName, requiresKey, exampleEndpoint } = config;

  const apiKeySection = requiresKey
    ? `
// Get API key from environment variables
const API_KEY = import.meta.env.${envVarName};

// Check if API key is configured
if (!API_KEY) {
  console.warn('${displayName} API key not configured. Add ${envVarName} to your .env file.');
}
`
    : `
// This API doesn't require an API key!
`;

  const exampleFunction = requiresKey
    ? `
/**
 * Example: Make a request to ${displayName}
 *
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} API response data
 *
 * @example
 * const result = await fetchData({ query: 'example' });
 * console.log(result);
 */
export async function fetchData(params = {}) {
  return callExternalApi('${serviceId}', 'fetchData', async () => {
    const response = await axios.get('${exampleEndpoint}', {
      params: {
        ...params,
        // Most APIs use 'key', 'apikey', or 'appid' - check your API's docs!
        key: API_KEY,
      },
    });
    return response.data;
  });
}
`
    : `
/**
 * Example: Make a request to ${displayName}
 *
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} API response data
 *
 * @example
 * const result = await fetchData({ query: 'example' });
 * console.log(result);
 */
export async function fetchData(params = {}) {
  return callExternalApi('${serviceId}', 'fetchData', async () => {
    const response = await axios.get('${exampleEndpoint}', {
      params,
    });
    return response.data;
  });
}
`;

  return `/**
 * ============================================================================
 * ${displayName.toUpperCase()} SERVICE
 * ============================================================================
 *
 * This service provides integration with the ${displayName} API.
 *
 * FEATURES (automatic via apiClient wrapper):
 * - Automatic rate limit tracking
 * - Retry with exponential backoff on failures
 * - Usage monitoring in the API Dashboard
 * - Rate limit warnings before you hit limits
 *
 * SETUP:
 * ${requiresKey ? `1. Get your API key from the ${displayName} website` : '1. No API key required!'}
 * ${requiresKey ? `2. Add ${envVarName}=your_key_here to your .env file` : '2. Just import and use the functions below'}
 * ${requiresKey ? '3. Restart your dev server' : ''}
 *
 * USAGE:
 * import { fetchData } from './services/${config.serviceFileName}';
 * const result = await fetchData({ query: 'example' });
 *
 * ============================================================================
 */

import axios from 'axios';
import { callExternalApi } from '../utils/apiClient.js';
${apiKeySection}
${exampleFunction}

/**
 * Example with rate limit handling and retry
 *
 * Use this pattern when you want more control over retry behavior.
 */
export async function fetchDataWithRetry(params = {}) {
  return callExternalApi('${serviceId}', 'fetchDataWithRetry', async () => {
    // Your API call here
    const response = await axios.get('${exampleEndpoint}', {
      params: {
        ...params,${requiresKey ? '\n        key: API_KEY,' : ''}
      },
    });
    return response.data;
  }, {
    retries: 3,           // Retry up to 3 times on failure
    retryDelay: 1000,     // Wait 1 second between retries
    throwOnRateLimit: true, // Stop if rate limited (recommended)
  });
}

/**
 * Check if the ${displayName} service is available
 * (not rate limited and properly configured)
 */
export function isAvailable() {
  ${requiresKey ? `if (!API_KEY) return false;` : ''}
  // The apiClient will check rate limits automatically
  return true;
}
`;
}

/**
 * Generate the .env.example entry
 */
function generateEnvEntry(config) {
  const { displayName, envVarName, signupUrl } = config;

  return `
# ============================================
# ${displayName.toUpperCase()} API
# ============================================
# Get your free API key at: ${signupUrl}
# Rate limits and pricing: See API documentation
#
${envVarName}=your_api_key_here
`;
}

// ============================================================================
// FILE UPDATE FUNCTIONS
// ============================================================================

/**
 * Update constants.js with new API quota entry
 */
function updateConstantsFile(quotaEntry) {
  const constantsPath = path.join(projectRoot, 'src/config/constants.js');

  if (!fs.existsSync(constantsPath)) {
    throw new Error(`Cannot find constants.js at ${constantsPath}`);
  }

  let content = fs.readFileSync(constantsPath, 'utf8');

  // Find the API_QUOTAS object and add new entry before closing brace
  // Look for the pattern: API_QUOTAS = { ... }
  const quotasRegex = /(export const API_QUOTAS = \{[\s\S]*?)(^\};)/m;
  const match = content.match(quotasRegex);

  if (!match) {
    throw new Error('Could not find API_QUOTAS in constants.js. Is the file format correct?');
  }

  // Insert the new entry before the closing };
  const newContent = content.replace(quotasRegex, `$1${quotaEntry}\n$2`);

  fs.writeFileSync(constantsPath, newContent);
  return constantsPath;
}

/**
 * Create the service file
 */
function createServiceFile(serviceFileName, serviceContent) {
  const servicesDir = path.join(projectRoot, 'src/services');
  const servicePath = path.join(servicesDir, serviceFileName);

  if (fs.existsSync(servicePath)) {
    throw new Error(`Service file already exists at ${servicePath}`);
  }

  fs.writeFileSync(servicePath, serviceContent);
  return servicePath;
}

/**
 * Update .env.example with new API key entry
 */
function updateEnvExample(envEntry) {
  const envExamplePath = path.join(projectRoot, '.env.example');

  if (!fs.existsSync(envExamplePath)) {
    console.log(colorize('Note: .env.example not found, skipping...', 'yellow'));
    return null;
  }

  let content = fs.readFileSync(envExamplePath, 'utf8');

  // Add the new entry at the end of the file
  content = content.trimEnd() + '\n' + envEntry;

  fs.writeFileSync(envExamplePath, content);
  return envExamplePath;
}

// ============================================================================
// MAIN CLI FLOW
// ============================================================================

async function main() {
  console.log('\n' + colorize('='.repeat(60), 'cyan'));
  console.log(colorize('  ADD NEW API INTEGRATION', 'bright'));
  console.log(colorize('  Touchpoint CRM - API Integration Tool', 'dim'));
  console.log(colorize('='.repeat(60), 'cyan') + '\n');

  console.log('This tool helps you add new free APIs to Touchpoint CRM.\n');
  console.log("You'll need to know:");
  console.log("  - The API's name");
  console.log('  - Whether it requires an API key');
  console.log("  - The rate limits (from the API's documentation)\n");

  // Show popular free APIs
  console.log(colorize('Popular Free APIs:', 'bright'));
  console.log(colorize('-'.repeat(40), 'dim'));
  POPULAR_FREE_APIS.forEach((api, index) => {
    console.log(`  ${index + 1}. ${colorize(api.name, 'cyan')} - ${api.description}`);
    console.log(`     Rate limit: ${api.rateLimit}`);
    console.log(`     Requires API key: ${api.requiresKey ? 'Yes' : 'No'}`);
  });
  console.log('');

  const rl = createReadlineInterface();

  try {
    // ========================================
    // STEP 1: API Name
    // ========================================
    console.log(colorize('\nSTEP 1: API Information', 'bright'));
    console.log(colorize('-'.repeat(40), 'dim'));

    const displayName = await ask(rl, '\nWhat is the name of the API? (e.g., "OpenWeatherMap"): ');

    if (!displayName) {
      console.log(colorize('\nError: API name is required.', 'red'));
      process.exit(1);
    }

    const serviceId = toServiceId(displayName);
    const constantName = toConstantName(displayName);
    const serviceFileName = toServiceFileName(displayName);
    const envVarName = toEnvVarName(displayName);

    console.log(colorize(`\nGenerated identifiers:`, 'dim'));
    console.log(`  Service ID: ${colorize(serviceId, 'cyan')}`);
    console.log(`  Constant name: ${colorize(constantName, 'cyan')}`);
    console.log(`  Service file: ${colorize(serviceFileName, 'cyan')}`);

    // ========================================
    // STEP 2: API Key Requirement
    // ========================================
    console.log(colorize('\n\nSTEP 2: Authentication', 'bright'));
    console.log(colorize('-'.repeat(40), 'dim'));

    console.log('\nDoes this API require an API key?');
    console.log(colorize('  (Most APIs do - check their documentation)', 'dim'));

    const requiresKey = await askYesNo(rl, 'Requires API key?', true);

    let signupUrl = '';
    if (requiresKey) {
      console.log(`\nYou'll need to add ${colorize(envVarName, 'cyan')} to your .env file.`);
      signupUrl = await ask(rl, '\nWhere can users sign up for an API key? (URL, optional): ');
    }

    // ========================================
    // STEP 3: Rate Limits
    // ========================================
    console.log(colorize('\n\nSTEP 3: Rate Limits', 'bright'));
    console.log(colorize('-'.repeat(40), 'dim'));

    console.log('\nRate limits protect APIs from overuse. Most free APIs have them.');
    console.log(colorize("Check the API's documentation for rate limit details.", 'dim'));
    console.log('');
    console.log('Common examples:');
    console.log('  - "1000 per day" (free tier limit)');
    console.log('  - "60 per minute" (standard rate limit)');
    console.log('  - "1 per second" (aggressive rate limit)');
    console.log('');

    const quotas = [];
    let addMoreQuotas = true;

    while (addMoreQuotas) {
      const limitInput = await ask(rl, 'Rate limit (e.g., "1000 per day" or "60 per minute"): ');

      if (!limitInput) {
        if (quotas.length === 0) {
          console.log(
            colorize('Note: No rate limit specified. Adding default placeholder.', 'yellow')
          );
          quotas.push({
            type: 'per-day',
            limit: 1000,
            window: 86400,
            description: 'Free tier limit - check API documentation',
          });
        }
        break;
      }

      // Parse the rate limit
      const limitMatch = limitInput.match(/(\d+)/);
      const limit = limitMatch ? parseInt(limitMatch[1], 10) : 1000;
      const type = parseRateLimitType(limitInput);
      const window = getWindowSeconds(type);

      const description = await ask(rl, 'Description (optional, e.g., "Free tier daily limit"): ');

      quotas.push({
        type,
        limit,
        window,
        description: description || `${limit} requests ${type.replace('per-', 'per ')}`,
      });

      console.log(colorize(`\nAdded: ${limit} requests ${type.replace('per-', 'per ')}`, 'green'));

      if (quotas.length < 3) {
        addMoreQuotas = await askYesNo(rl, '\nAdd another rate limit?', false);
      } else {
        addMoreQuotas = false;
      }
    }

    // ========================================
    // STEP 4: Additional Details
    // ========================================
    console.log(colorize('\n\nSTEP 4: Additional Details', 'bright'));
    console.log(colorize('-'.repeat(40), 'dim'));

    const documentationUrl =
      (await ask(rl, '\nAPI documentation URL (optional): ')) || signupUrl || '';
    const exampleEndpoint =
      (await ask(rl, 'Example API endpoint URL (optional): ')) || 'https://api.example.com/v1/data';

    // Calculate cost description
    let cost = 'FREE';
    if (quotas.length > 0) {
      const mainQuota = quotas[0];
      const periodMap = {
        'per-second': '/sec',
        'per-minute': '/min',
        'per-hour': '/hour',
        'per-day': '/day',
        'per-month': '/month',
        'per-100-seconds': '/100sec',
      };
      cost = `FREE (${mainQuota.limit} calls${periodMap[mainQuota.type] || ''})`;
    }

    // ========================================
    // STEP 5: Review and Confirm
    // ========================================
    console.log(colorize('\n\nSTEP 5: Review', 'bright'));
    console.log(colorize('='.repeat(60), 'cyan'));
    console.log(`\nAPI Name: ${colorize(displayName, 'bright')}`);
    console.log(`Service ID: ${colorize(serviceId, 'cyan')}`);
    console.log(`Requires API Key: ${requiresKey ? 'Yes' : 'No'}`);
    if (requiresKey) {
      console.log(`Environment Variable: ${colorize(envVarName, 'cyan')}`);
    }
    console.log(`Cost: ${colorize(cost, 'green')}`);
    console.log('\nRate Limits:');
    quotas.forEach((q) => {
      console.log(`  - ${q.limit} requests ${q.type.replace('per-', 'per ')}: ${q.description}`);
    });
    console.log(`\nFiles to create/update:`);
    console.log(`  - src/config/constants.js (add API_QUOTAS entry)`);
    console.log(`  - src/services/${serviceFileName} (create service file)`);
    if (requiresKey) {
      console.log(`  - .env.example (add ${envVarName})`);
    }

    console.log(colorize('\n' + '='.repeat(60), 'cyan'));

    const proceed = await askYesNo(rl, '\nProceed with creating these files?', true);

    if (!proceed) {
      console.log(colorize('\nCancelled. No files were modified.', 'yellow'));
      process.exit(0);
    }

    // ========================================
    // STEP 6: Generate Files
    // ========================================
    console.log(colorize('\n\nCreating files...', 'bright'));

    const config = {
      displayName,
      serviceId,
      constantName,
      serviceFileName,
      envVarName,
      requiresKey,
      signupUrl,
      cost,
      quotas,
      documentationUrl,
      exampleEndpoint,
    };

    // Generate content
    const quotaEntry = generateQuotaEntry(config);
    const serviceContent = generateServiceFile(config);
    const envEntry = requiresKey ? generateEnvEntry(config) : null;

    // Write files
    try {
      const constantsPath = updateConstantsFile(quotaEntry);
      console.log(colorize(`  Updated: ${constantsPath}`, 'green'));

      const servicePath = createServiceFile(serviceFileName, serviceContent);
      console.log(colorize(`  Created: ${servicePath}`, 'green'));

      if (envEntry) {
        const envPath = updateEnvExample(envEntry);
        if (envPath) {
          console.log(colorize(`  Updated: ${envPath}`, 'green'));
        }
      }

      // ========================================
      // SUCCESS MESSAGE
      // ========================================
      console.log(colorize('\n' + '='.repeat(60), 'green'));
      console.log(colorize('  SUCCESS! API integration added.', 'green'));
      console.log(colorize('='.repeat(60), 'green'));

      console.log('\n' + colorize('Next steps:', 'bright'));
      if (requiresKey) {
        console.log(`\n  1. Get your API key from: ${signupUrl || 'the API provider'}`);
        console.log(`  2. Add to your .env file:`);
        console.log(colorize(`     ${envVarName}=your_actual_key_here`, 'cyan'));
        console.log(`  3. Restart your dev server: npm start`);
        console.log(`  4. Import and use the service:`);
      } else {
        console.log(`\n  1. Import and use the service:`);
      }
      console.log(
        colorize(`     import { fetchData } from './services/${serviceFileName}';`, 'cyan')
      );
      console.log(`\n  5. Check the API Dashboard to monitor usage!`);

      console.log('\n' + colorize('Documentation:', 'bright'));
      console.log(`  - Full guide: docs/API_INTEGRATION_GUIDE.md`);
      console.log(`  - Examples: docs/examples/`);
      console.log(`  - API Dashboard: /api-usage (in the app)`);
    } catch (error) {
      console.log(colorize(`\nError: ${error.message}`, 'red'));
      process.exit(1);
    }
  } finally {
    rl.close();
  }
}

// Run the CLI
main().catch((error) => {
  console.error(colorize(`\nUnexpected error: ${error.message}`, 'red'));
  process.exit(1);
});
