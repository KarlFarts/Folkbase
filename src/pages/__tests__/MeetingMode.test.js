import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import MeetingMode from '../MeetingMode';
import { NotificationProvider } from '../../contexts/NotificationContext';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    accessToken: 'mock-token',
  }),
}));

vi.mock('../../utils/sheetResolver', () => ({
  useActiveSheetId: () => 'mock-sheet-id',
}));

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({
    guardWrite: () => true,
  }),
}));

vi.mock('../../utils/devModeWrapper', () => ({
  readSheetData: vi.fn().mockResolvedValue([
    { 'Contact ID': 'C001', Name: 'John Doe', Organization: 'Acme' },
    { 'Contact ID': 'C002', Name: 'Jane Smith', Organization: 'Beta' },
  ]),
  addTouchpoint: vi.fn().mockResolvedValue({ touchpointId: 'T001' }),
  logActivity: vi.fn().mockResolvedValue({}),
  ACTIVITY_TYPES: { TOUCHPOINT_LOGGED: 'touchpoint_logged' },
  SHEETS: { CONTACTS: 'Contacts' },
}));

const renderWithProvider = (component) => {
  return render(<NotificationProvider>{component}</NotificationProvider>);
};

describe('MeetingMode Page', () => {
  it('should render meeting mode header', async () => {
    renderWithProvider(<MeetingMode onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/meeting mode/i)).toBeInTheDocument();
    });
  });

  it('should render timer component', async () => {
    renderWithProvider(<MeetingMode onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });

  it('should have attendee section', async () => {
    renderWithProvider(<MeetingMode onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('Attendees')).toBeInTheDocument();
    });
  });

  it('should have notes textarea', async () => {
    renderWithProvider(<MeetingMode onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/notes/i)).toBeInTheDocument();
    });
  });

  it('should have end meeting button', async () => {
    renderWithProvider(<MeetingMode onNavigate={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/end meeting/i)).toBeInTheDocument();
    });
  });
});
