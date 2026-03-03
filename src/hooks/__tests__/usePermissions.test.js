import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import { usePermissions } from '../usePermissions';

// Shared mock state controlled per test
let mockMode = 'personal';
let mockActiveWorkspace = null;
const mockWarning = vi.fn();

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({ mode: mockMode, activeWorkspace: mockActiveWorkspace }),
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: () => ({ notify: { warning: mockWarning } }),
}));

beforeEach(() => {
  mockMode = 'personal';
  mockActiveWorkspace = null;
  mockWarning.mockClear();
});

describe('usePermissions', () => {
  it('personal mode grants all write permissions', () => {
    mockMode = 'personal';
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canWrite('contacts')).toBe(true);
    expect(result.current.canWrite('touchpoints')).toBe(true);
    expect(result.current.canWrite('notes')).toBe(true);
    expect(result.current.role).toBeNull();
    expect(result.current.isOwner).toBe(false);
    expect(result.current.isEditor).toBe(false);
    expect(result.current.isViewer).toBe(false);
  });

  it('workspace owner has full write access', () => {
    mockMode = 'workspace';
    mockActiveWorkspace = { memberRole: 'owner', memberOverrides: '' };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isOwner).toBe(true);
    expect(result.current.canWrite('contacts')).toBe(true);
    expect(result.current.canWrite('touchpoints')).toBe(true);
  });

  it('workspace editor has full write access', () => {
    mockMode = 'workspace';
    mockActiveWorkspace = { memberRole: 'editor', memberOverrides: '' };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isEditor).toBe(true);
    expect(result.current.canWrite('contacts')).toBe(true);
    expect(result.current.canWrite('events')).toBe(true);
  });

  it('workspace viewer is denied write by default', () => {
    mockMode = 'workspace';
    mockActiveWorkspace = { memberRole: 'viewer', memberOverrides: '' };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.isViewer).toBe(true);
    expect(result.current.canWrite('contacts')).toBe(false);
    expect(result.current.canWrite('touchpoints')).toBe(false);
  });

  it('viewer with overrides can write permitted features only', () => {
    mockMode = 'workspace';
    mockActiveWorkspace = {
      memberRole: 'viewer',
      memberOverrides: 'touchpoints:write,notes:write',
    };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canWrite('touchpoints')).toBe(true);
    expect(result.current.canWrite('notes')).toBe(true);
    expect(result.current.canWrite('contacts')).toBe(false);
    expect(result.current.canWrite('events')).toBe(false);
  });

  it('guardWrite shows warning toast and returns false when denied', () => {
    mockMode = 'workspace';
    mockActiveWorkspace = { memberRole: 'viewer', memberOverrides: '' };
    const { result } = renderHook(() => usePermissions());
    const allowed = result.current.guardWrite('contacts');
    expect(allowed).toBe(false);
    expect(mockWarning).toHaveBeenCalledOnce();
  });

  it('guardWrite returns true and does not toast when permitted', () => {
    mockMode = 'workspace';
    mockActiveWorkspace = { memberRole: 'editor', memberOverrides: '' };
    const { result } = renderHook(() => usePermissions());
    const allowed = result.current.guardWrite('contacts');
    expect(allowed).toBe(true);
    expect(mockWarning).not.toHaveBeenCalled();
  });

  it('canRead always returns true regardless of role', () => {
    mockMode = 'workspace';
    mockActiveWorkspace = { memberRole: 'viewer', memberOverrides: '' };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.canRead('contacts')).toBe(true);
  });
});
