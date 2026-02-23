import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SubWorkspaceManager from '../SubWorkspaceManager';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    accessToken: 'mock-token',
  }),
}));

vi.mock('../../contexts/WorkspaceContext', () => ({
  useWorkspace: () => ({
    switchToWorkspace: vi.fn(),
  }),
}));

vi.mock('../../utils/sheetResolver', () => ({
  useActiveSheetId: () => 'mock-sheet-id',
}));

// Track mock implementations for the hierarchy service (via devModeWrapper)
const mockGetWorkspaceChildren = vi.fn();
const mockGetWorkspacePath = vi.fn();
const mockHasChildren = vi.fn();

vi.mock('../../utils/devModeWrapper', () => ({
  getWorkspaceChildren: (...args) => mockGetWorkspaceChildren(...args),
  getWorkspacePath: (...args) => mockGetWorkspacePath(...args),
  hasChildren: (...args) => mockHasChildren(...args),
}));

// Test workspace data for a 4-level hierarchy:
// Campaign 2024 (root)
//   ├── Door Knocking (WS002) - has children
//   │   ├── District 1 (WS003) - has children
//   │   │   └── Precinct A (WS005) - leaf
//   │   └── District 2 (WS004) - leaf
//   └── Phone Banking (WS006) - leaf
const workspaces = {
  root: { id: 'WS001', name: 'Campaign 2024', type: 'campaign', owner_email: 'test@example.com' },
  doorKnocking: { id: 'WS002', name: 'Door Knocking', type: 'team' },
  district1: { id: 'WS003', name: 'District 1', type: 'team' },
  district2: { id: 'WS004', name: 'District 2', type: 'team' },
  precinctA: { id: 'WS005', name: 'Precinct A', type: 'team' },
  phoneBanking: { id: 'WS006', name: 'Phone Banking', type: 'team' },
};

const setupMocks = () => {
  mockGetWorkspacePath.mockResolvedValue([workspaces.root]);

  mockGetWorkspaceChildren.mockImplementation((_accessToken, _sheetId, parentId) => {
    switch (parentId) {
      case 'WS001':
        return Promise.resolve([workspaces.doorKnocking, workspaces.phoneBanking]);
      case 'WS002':
        return Promise.resolve([workspaces.district1, workspaces.district2]);
      case 'WS003':
        return Promise.resolve([workspaces.precinctA]);
      default:
        return Promise.resolve([]);
    }
  });

  mockHasChildren.mockImplementation((_accessToken, _sheetId, id) => {
    switch (id) {
      case 'WS002':
        return Promise.resolve(true); // Door Knocking has children
      case 'WS003':
        return Promise.resolve(true); // District 1 has children
      default:
        return Promise.resolve(false);
    }
  });
};

const renderComponent = (props = {}) => {
  return render(
    <MemoryRouter>
      <SubWorkspaceManager workspace={workspaces.root} {...props} />
    </MemoryRouter>
  );
};

describe('SubWorkspaceManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders root workspace and direct children', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
      expect(screen.getByText('Phone Banking')).toBeInTheDocument();
    });
  });

  it('passes accessToken and sheetId to service functions', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
    });

    expect(mockGetWorkspaceChildren).toHaveBeenCalledWith('mock-token', 'mock-sheet-id', 'WS001');
    expect(mockGetWorkspacePath).toHaveBeenCalledWith('mock-token', 'mock-sheet-id', 'WS001');
    expect(mockHasChildren).toHaveBeenCalledWith('mock-token', 'mock-sheet-id', 'WS002');
  });

  it('shows expand button for children that have sub-workspaces', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
    });

    // Door Knocking should have an expand button (hasChildren=true)
    const doorKnockingNode = screen.getByText('Door Knocking').closest('.workspace-tree-node');
    expect(doorKnockingNode.querySelector('.tree-node-toggle')).toBeInTheDocument();

    // Phone Banking should NOT have an expand button (hasChildren=false)
    const phoneBankingNode = screen.getByText('Phone Banking').closest('.workspace-tree-node');
    expect(phoneBankingNode.querySelector('.tree-node-toggle')).toBeNull();
  });

  it('expands level 2 to show level 3 children', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
    });

    // Expand Door Knocking
    const doorKnockingNode = screen.getByText('Door Knocking').closest('.workspace-tree-node');
    const expandBtn = doorKnockingNode.querySelector('.tree-node-toggle');
    await user.click(expandBtn);

    // Should show level 3 children
    await waitFor(() => {
      expect(screen.getByText('District 1')).toBeInTheDocument();
      expect(screen.getByText('District 2')).toBeInTheDocument();
    });
  });

  it('shows expand button for level 3 nodes that have children (the bug fix)', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
    });

    // Expand Door Knocking to reveal level 3
    const doorKnockingNode = screen.getByText('Door Knocking').closest('.workspace-tree-node');
    await user.click(doorKnockingNode.querySelector('.tree-node-toggle'));

    await waitFor(() => {
      expect(screen.getByText('District 1')).toBeInTheDocument();
    });

    // District 1 has children - it MUST have an expand button
    const district1Node = screen.getByText('District 1').closest('.workspace-tree-node');
    expect(district1Node.querySelector('.tree-node-toggle')).toBeInTheDocument();

    // District 2 is a leaf - should NOT have an expand button
    const district2Node = screen.getByText('District 2').closest('.workspace-tree-node');
    expect(district2Node.querySelector('.tree-node-toggle')).toBeNull();
  });

  it('expands level 3 to show level 4 children (deep hierarchy)', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
    });

    // Expand Door Knocking (level 2)
    const doorKnockingNode = screen.getByText('Door Knocking').closest('.workspace-tree-node');
    await user.click(doorKnockingNode.querySelector('.tree-node-toggle'));

    await waitFor(() => {
      expect(screen.getByText('District 1')).toBeInTheDocument();
    });

    // Expand District 1 (level 3) - this is the previously broken path
    const district1Node = screen.getByText('District 1').closest('.workspace-tree-node');
    await user.click(district1Node.querySelector('.tree-node-toggle'));

    // Should show level 4 children
    await waitFor(() => {
      expect(screen.getByText('Precinct A')).toBeInTheDocument();
    });
  });

  it('passes accessToken and sheetId through recursive expansions', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
    });

    // Expand Door Knocking
    const doorKnockingNode = screen.getByText('Door Knocking').closest('.workspace-tree-node');
    await user.click(doorKnockingNode.querySelector('.tree-node-toggle'));

    await waitFor(() => {
      expect(screen.getByText('District 1')).toBeInTheDocument();
    });

    // Verify level 3 expansion also used correct credentials
    expect(mockGetWorkspaceChildren).toHaveBeenCalledWith('mock-token', 'mock-sheet-id', 'WS002');
    expect(mockHasChildren).toHaveBeenCalledWith('mock-token', 'mock-sheet-id', 'WS003');
  });

  it('collapse and re-expand preserves correct state', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
    });

    // Expand Door Knocking
    const doorKnockingNode = screen.getByText('Door Knocking').closest('.workspace-tree-node');
    const expandBtn = doorKnockingNode.querySelector('.tree-node-toggle');
    await user.click(expandBtn);

    await waitFor(() => {
      expect(screen.getByText('District 1')).toBeInTheDocument();
    });

    // Collapse Door Knocking
    await user.click(expandBtn);
    await waitFor(() => {
      expect(screen.queryByText('District 1')).not.toBeInTheDocument();
    });

    // Re-expand Door Knocking
    await user.click(expandBtn);
    await waitFor(() => {
      expect(screen.getByText('District 1')).toBeInTheDocument();
    });
  });

  it('clicking a node name triggers workspace click handler', async () => {
    const onWorkspaceSelect = vi.fn();
    const user = userEvent.setup();
    renderComponent({ onWorkspaceSelect });

    await waitFor(() => {
      expect(screen.getByText('Door Knocking')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Door Knocking'));
    expect(onWorkspaceSelect).toHaveBeenCalledWith(workspaces.doorKnocking);
  });
});
