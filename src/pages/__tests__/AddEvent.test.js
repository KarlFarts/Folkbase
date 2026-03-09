import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    accessToken: 'tok',
    user: { email: 'a@b.com' },
    refreshAccessToken: vi.fn(),
  }),
}));
vi.mock('../../utils/sheetResolver', () => ({ useActiveSheetId: () => 'sheet1' }));
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: { error: vi.fn(), success: vi.fn() } }),
}));
vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: () => ({ canWrite: () => true, guardWrite: () => true }),
}));
vi.mock('../../hooks/useUnsavedChanges', () => ({ useUnsavedChanges: () => {} }));
vi.mock('../../utils/devModeWrapper', () => ({
  readSheetData: vi.fn().mockResolvedValue({ data: [] }),
  generateEventID: vi.fn().mockResolvedValue('EVT001'),
  SHEETS: { CONTACTS: 'Contacts', EVENTS: 'Events' },
}));

import AddEvent from '../AddEvent';

describe('AddEvent unresolved attendees', () => {
  it('renders Other attendees chip input', async () => {
    render(<AddEvent onNavigate={vi.fn()} />);
    expect(screen.getByLabelText(/other attendees/i)).toBeInTheDocument();
  });

  it('adds a chip on Enter', async () => {
    const user = userEvent.setup();
    render(<AddEvent onNavigate={vi.fn()} />);
    const input = screen.getByLabelText(/other attendees/i);
    await user.type(input, 'John ????{Enter}');
    expect(screen.getByText('John ????')).toBeInTheDocument();
  });
});
