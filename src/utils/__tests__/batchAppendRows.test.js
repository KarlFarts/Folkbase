import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios
const mockPost = vi.fn().mockResolvedValue({ data: { totalUpdatedRows: 3 } });
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      post: mockPost,
    }),
  },
}));

// Mock dependencies
vi.mock('../../services/apiUsageStats', () => ({
  canMakeRequest: vi.fn(() => ({ allowed: true })),
}));
vi.mock('../apiUsageLogger', () => ({
  logApiCall: vi.fn(),
}));
vi.mock('../logger', () => ({
  warn: vi.fn(),
  log: vi.fn(),
}));

import { batchAppendRows } from '../sheets';

describe('batchAppendRows', () => {
  beforeEach(() => {
    mockPost.mockClear();
  });

  it('sends a single batchUpdate request for multiple sheets', async () => {
    const rowsBySheet = {
      'Contact Notes': [['N1', 'C1', '2026-01-01']],
      'Event Notes': [
        ['N1', 'E1', '2026-01-01'],
        ['N2', 'E2', '2026-01-01'],
      ],
    };

    await batchAppendRows('token', 'sheet123', rowsBySheet);

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body, _options] = mockPost.mock.calls[0];
    expect(url).toContain('batchUpdate');
    expect(body.data.length).toBe(2);
    expect(body.data[0].range).toBe('Contact Notes');
    expect(body.data[0].values).toEqual([['N1', 'C1', '2026-01-01']]);
    expect(body.data[1].range).toBe('Event Notes');
    expect(body.data[1].values).toEqual([
      ['N1', 'E1', '2026-01-01'],
      ['N2', 'E2', '2026-01-01'],
    ]);
  });

  it('returns without calling API when rowsBySheet is empty', async () => {
    await batchAppendRows('token', 'sheet123', {});
    expect(mockPost).not.toHaveBeenCalled();
  });
});
