import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReauthBanner from '../ReauthBanner';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../contexts/AuthContext';

describe('ReauthBanner', () => {
  it('does not render when needsReauth is false', () => {
    useAuth.mockReturnValue({
      needsReauth: false,
      clearReauth: vi.fn(),
      refreshAccessToken: vi.fn(),
    });

    render(<ReauthBanner />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders banner when needsReauth is true', () => {
    useAuth.mockReturnValue({
      needsReauth: true,
      clearReauth: vi.fn(),
      refreshAccessToken: vi.fn(),
    });

    render(<ReauthBanner />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Your Google account needs to be reconnected.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reconnect Now' })).toBeTruthy();
  });

  it('calls refreshAccessToken and clearReauth on success', async () => {
    const clearReauth = vi.fn();
    const refreshAccessToken = vi.fn().mockResolvedValue();

    useAuth.mockReturnValue({
      needsReauth: true,
      clearReauth,
      refreshAccessToken,
    });

    render(<ReauthBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect Now' }));

    await waitFor(() => {
      expect(clearReauth).toHaveBeenCalled();
    });
    expect(refreshAccessToken).toHaveBeenCalled();
  });

  it('shows error when refreshAccessToken throws', async () => {
    const clearReauth = vi.fn();
    const refreshAccessToken = vi.fn().mockRejectedValue(new Error('token error'));

    useAuth.mockReturnValue({
      needsReauth: true,
      clearReauth,
      refreshAccessToken,
    });

    render(<ReauthBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect Now' }));

    await waitFor(() => {
      expect(screen.getByText('Reconnect failed. Please try again.')).toBeTruthy();
    });
    expect(clearReauth).not.toHaveBeenCalled();
  });
});
