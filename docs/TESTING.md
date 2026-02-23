# Testing Documentation

This document describes the testing infrastructure and patterns used in Folkbase.

## Table of Contents
1. [Test Setup](#test-setup)
2. [Running Tests](#running-tests)
3. [Dev Mode vs Production Mode Testing](#dev-mode-vs-production-mode-testing)
4. [Test Data Fixtures](#test-data-fixtures)
5. [Mock Authentication](#mock-authentication)
6. [Test Utilities](#test-utilities)
7. [Writing Tests](#writing-tests)

---

## Test Setup

### Testing Framework
- **Vitest** - Fast unit test framework (Vite-native alternative to Jest)
- **React Testing Library** - Component testing with user-centric queries
- **jest-dom** - Custom matchers for DOM assertions

### Configuration Files
- [vite.config.js](../vite.config.js) - Test configuration in the `test` block
- [src/setupTests.js](../src/setupTests.js) - Global test setup and imports

### Installation
Testing dependencies are already included in `package.json`:
```bash
npm install  # Installs all dependencies including testing tools
```

---

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Running Specific Tests
```bash
# Run a specific test file
npm test src/pages/ImportPage.test.js

# Run tests matching a pattern
npm test -- --grep="contact"
```

---

## Dev Mode vs Production Mode Testing

Folkbase has two operating modes that significantly affect testing:

### Development Mode (`VITE_DEV_MODE=true`)
- Uses **localStorage** for data storage
- Uses **mock authentication** (no Firebase)
- Test data stored with `dev_` prefix
- Instant data operations (no network calls)

### Production Mode (`VITE_DEV_MODE=false`)
- Uses **Google Sheets API** for data storage
- Uses **Firebase authentication**
- Network-dependent operations
- Real API rate limits apply

### Switching Modes for Testing

Create different `.env` files:

**.env.development** (for dev mode testing):
```env
VITE_DEV_MODE=true
```

**.env.production** (for production mode testing):
```env
VITE_DEV_MODE=false
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
# ... other Firebase config
```

**Run tests with specific mode:**
```bash
# Test in dev mode
VITE_DEV_MODE=true npm test

# Test in production mode (requires Firebase credentials)
VITE_DEV_MODE=false npm test
```

---

## Test Data Fixtures

### Location
- [src/__tests__/fixtures/testContacts.js](../src/__tests__/fixtures/testContacts.js) - Sample contact data
- [src/__tests__/fixtures/seedTestData.js](../src/__tests__/fixtures/seedTestData.js) - Test data seeding system

### Test Contacts Structure
Test contacts are marked with a special `__test_data__` property for easy identification:

```javascript
import { testContacts, TEST_DATA_MARKER, isTestContact } from '../__tests__/fixtures/testContacts';

// Example test contact
{
  'Contact ID': 'TEST0102001',
  'First Name': 'Sarah',
  'Last Name': 'Johnson',
  'Email': 'sarah.johnson@email.com',
  [TEST_DATA_MARKER]: true  // Special marker for test data
}

// Check if contact is test data
if (isTestContact(contact)) {
  // This is test data, safe to modify/delete
}
```

### Seeding Test Data

The seeding system provides test data for development:

```javascript
import {
  seedTestData,
  clearTestData,
  reloadTestData,
  clearAllDevData,
  isTestDataSeeded
} from '../__tests__/fixtures/seedTestData';

// Seed test data (idempotent - safe to call multiple times)
seedTestData();

// Check if test data is already seeded
if (isTestDataSeeded()) {
  console.log('Test data is ready');
}

// Clear only test data (keeps real contacts)
clearTestData();

// Reload test data (clear and re-seed)
reloadTestData();

// Clear ALL dev data (use with caution!)
clearAllDevData();
```

### LocalStorage Keys for Test Data

Test data uses consistent `dev_` prefixed keys:
- `dev_contacts` - Test contacts
- `dev_touchpoints` - Test touchpoints
- `dev_events` - Test events
- `dev_activities` - Test activities
- `dev_lists` - Test contact lists
- `dev_contact_lists` - List membership mappings
- `dev_notes` - Test notes
- `dev_contact_notes` - Note-to-contact mappings
- `dev_workspaces` - Test workspaces
- `dev_contact_links` - Workspace-contact links
- `dev_sync_conflicts` - Simulated sync conflicts
- `dev_tasks` - Test tasks
- `dev_test_data_seeded` - Flag indicating test data is loaded

---

## Mock Authentication

### Location
- [src/__tests__/mocks/mockAuth.js](../src/__tests__/mocks/mockAuth.js) - Mock authentication layer

### Mock User Roles

Three mock users are available for testing different permission levels:

```javascript
import { mockUsers, getCurrentMockUser, setMockUserRole } from '../__tests__/mocks/mockAuth';

// Available roles:
// - admin: Full permissions (read, write, delete, manage_users)
// - volunteer: Basic permissions (read, write)
// - workspaceManager: Extended permissions (read, write, manage_contacts)

// Switch to a different role
setMockUserRole('volunteer');

// Get current mock user
const currentUser = getCurrentMockUser();
console.log(currentUser.displayName); // "Dev Volunteer"
console.log(currentUser.permissions); // ["read", "write"]
```

### Mock User Properties
```javascript
{
  id: "mock-admin-001",
  email: "admin@dev.local",
  displayName: "Dev Admin",
  role: "admin",
  permissions: ["read", "write", "delete", "manage_users"],
  photoURL: null
}
```

### Using in Tests

```javascript
import { setMockUserRole, getCurrentMockUser } from '../__tests__/mocks/mockAuth';

describe('Permission-based features', () => {
  it('should allow admins to delete contacts', () => {
    setMockUserRole('admin');
    const user = getCurrentMockUser();

    expect(user.permissions).toContain('delete');
    // Test admin-only functionality
  });

  it('should prevent volunteers from deleting contacts', () => {
    setMockUserRole('volunteer');
    const user = getCurrentMockUser();

    expect(user.permissions).not.toContain('delete');
    // Test permission restrictions
  });
});
```

---

## Test Utilities

### useTestDataManager Hook

Location: [src/__tests__/hooks/useTestDataManager.js](../src/__tests__/hooks/useTestDataManager.js)

React hook for managing test data lifecycle in components:

```javascript
import { useTestDataManager } from '../__tests__/hooks/useTestDataManager';

function TestDataPanel() {
  const {
    isDevMode,      // Boolean: is dev mode enabled?
    stats,          // Object: counts of test data items
    refreshStats,   // Function: refresh statistics
    seed,           // Function: seed test data
    clear,          // Function: clear test data only
    reload,         // Function: clear and re-seed
    clearAll,       // Function: clear ALL dev data
    isSeeded        // Boolean: is test data already seeded?
  } = useTestDataManager();

  if (!isDevMode) {
    return <p>Test data only available in dev mode</p>;
  }

  return (
    <div>
      <p>Contacts: {stats.contacts}</p>
      <p>Touchpoints: {stats.touchpoints}</p>
      <button onClick={seed}>Seed Test Data</button>
      <button onClick={clear}>Clear Test Data</button>
      <button onClick={reload}>Reload Test Data</button>
    </div>
  );
}
```

### Test Data Statistics

```javascript
import { getDevDataStats } from '../__tests__/fixtures/seedTestData';

const stats = getDevDataStats();
console.log(stats);
// {
//   contacts: 40,
//   touchpoints: 15,
//   events: 8,
//   activities: 20,
//   lists: 5,
//   contactLists: 60,
//   notes: 12,
//   contactNotes: 12,
//   workspaces: 3,
//   contactLinks: 10,
//   syncConflicts: 2,
//   tasks: 10
// }
```

---

## Writing Tests

### Test File Naming Convention
- Files: `*.test.js`
- Location: Either alongside component or in `__tests__` directory

Examples:
```
src/pages/ImportPage.test.js
src/services/duplicateDetector.test.js
src/components/__tests__/Timer.test.js
```

### Basic Component Test Structure

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
    localStorage.clear();
  });

  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    render(<MyComponent />);

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

### Testing with Test Data

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { seedTestData, clearTestData } from '../__tests__/fixtures/seedTestData';
import ContactList from './ContactList';

describe('ContactList with test data', () => {
  beforeEach(() => {
    clearTestData();
    seedTestData();
  });

  it('should display test contacts', () => {
    render(<ContactList />);

    // Test contacts are now in localStorage
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Michael Chen')).toBeInTheDocument();
  });
});
```

### Testing with Mock Authentication

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { setMockUserRole } from '../__tests__/mocks/mockAuth';
import ProtectedComponent from './ProtectedComponent';

describe('ProtectedComponent permissions', () => {
  it('should show admin options for admin users', () => {
    setMockUserRole('admin');
    render(<ProtectedComponent />);

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
  });

  it('should hide admin options for volunteers', () => {
    setMockUserRole('volunteer');
    render(<ProtectedComponent />);

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
  });
});
```

### Mocking Services

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readContacts } from '../utils/devModeWrapper';

// Mock the service
vi.mock('../utils/devModeWrapper', () => ({
  readContacts: vi.fn()
}));

describe('Component with service dependency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle service response', async () => {
    // Setup mock return value
    readContacts.mockResolvedValue([
      { 'Contact ID': 'C001', 'First Name': 'John' }
    ]);

    // Test component that uses readContacts
    // ...

    expect(readContacts).toHaveBeenCalledTimes(1);
  });
});
```

---

## Best Practices

### 1. Isolate Tests
- Clear localStorage between tests
- Reset mock state before each test
- Don't depend on test execution order

### 2. Use Test Data Markers
- Always check for `__test_data__` marker before modifying data
- Use `isTestContact()` to identify test data
- Keep test data separate from real data

### 3. Test in Both Modes
- Run critical tests in both dev and production mode
- Mock network calls in production mode tests
- Verify authentication flows in production mode

### 4. Clean Up After Tests
```javascript
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
```

### 5. Use Descriptive Test Names
```javascript
// Good
it('should display error message when email is invalid', () => { ... });

// Bad
it('should work', () => { ... });
```

### 6. Test User Behavior, Not Implementation
```javascript
// Good - tests what user sees
expect(screen.getByText('Welcome')).toBeInTheDocument();

// Bad - tests internal state
expect(component.state.showWelcome).toBe(true);
```

---

## Common Testing Patterns

### Testing Async Operations
```javascript
it('should load contacts asynchronously', async () => {
  render(<ContactList />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
});
```

### Testing Forms
```javascript
it('should submit form with valid data', async () => {
  render(<ContactForm />);

  fireEvent.change(screen.getByLabelText(/first name/i), {
    target: { value: 'John' }
  });

  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'john@example.com' }
  });

  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText('Contact saved')).toBeInTheDocument();
  });
});
```

### Testing Error States
```javascript
it('should display error when save fails', async () => {
  const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'));

  render(<ContactForm onSave={mockSave} />);

  fireEvent.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Tests Fail in Production Mode
- Ensure Firebase credentials are set in `.env.production`
- Mock external API calls
- Check network connectivity

### Test Data Not Loading
- Verify `VITE_DEV_MODE=true` is set
- Clear localStorage before seeding
- Check browser console for errors

### Mock Authentication Not Working
- Ensure dev mode is enabled
- Check that `isDevMode()` returns `true`
- Verify mock user role is set correctly

### Tests Are Flaky
- Add proper `waitFor` for async operations
- Clear state between tests
- Avoid hardcoded timeouts

---

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Dev Mode Documentation](./DEV_MODE_FOR_AGENTS.md)
