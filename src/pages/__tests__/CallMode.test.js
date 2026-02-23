import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import CallMode from '../CallMode';
import { NotificationProvider } from '../../contexts/NotificationContext';

// Mock the hooks and utilities
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    accessToken: 'mock-token',
  }),
}));

vi.mock('../../utils/sheetResolver', () => ({
  useActiveSheetId: () => 'mock-sheet-id',
}));

vi.mock('../../utils/devModeWrapper', () => ({
  readSheetData: vi.fn().mockResolvedValue([
    {
      'Contact ID': 'C001',
      Name: 'John Doe',
      Organization: 'Acme Corp',
    },
  ]),
  addTouchpoint: vi.fn().mockResolvedValue({ touchpointId: 'T001' }),
  logActivity: vi.fn().mockResolvedValue({}),
  ACTIVITY_TYPES: { TOUCHPOINT_LOGGED: 'touchpoint_logged' },
  SHEETS: { CONTACTS: 'Contacts' },
}));

// Helper to render with router and notification provider
const renderWithRouter = (contactId = 'C001') => {
  return render(
    <NotificationProvider>
      <MemoryRouter initialEntries={[`/call-mode/${contactId}`]}>
        <Routes>
          <Route path="/call-mode/:contactId" element={<CallMode onNavigate={() => {}} />} />
        </Routes>
      </MemoryRouter>
    </NotificationProvider>
  );
};

describe('CallMode Page', () => {
  it('should render with contact name as title', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    });
  });

  it('should render timer component', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });

  it('should have notes textarea', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/notes/i)).toBeInTheDocument();
    });
  });

  it('should have close call button', async () => {
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/close call/i)).toBeInTheDocument();
    });
  });
});
