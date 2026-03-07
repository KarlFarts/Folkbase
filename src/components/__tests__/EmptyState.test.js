import { render, screen, fireEvent } from '@testing-library/react';
import { FileText } from 'lucide-react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No notes yet" description="Add your first note to get started." />);
    expect(screen.getByRole('heading', { name: 'No notes yet' })).toBeInTheDocument();
    expect(screen.getByText('Add your first note to get started.')).toBeInTheDocument();
  });

  it('renders a primary action button that fires onAction', () => {
    const handler = vi.fn();
    render(<EmptyState title="No notes yet" action="Add Note" onAction={handler} />);
    const btn = screen.getByRole('button', { name: 'Add Note' });
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders a secondary action button that fires onSecondaryAction', () => {
    const handler = vi.fn();
    render(
      <EmptyState
        title="No results"
        secondaryAction="Clear Filters"
        onSecondaryAction={handler}
      />,
    );
    const btn = screen.getByRole('button', { name: 'Clear Filters' });
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('renders an icon when provided', () => {
    render(<EmptyState title="No notes yet" icon={FileText} />);
    // lucide-react renders an svg element
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('uses empty-state class by default', () => {
    const { container } = render(<EmptyState title="No notes yet" />);
    expect(container.firstChild).toHaveClass('empty-state');
  });

  it('uses empty-state-compact class when compact prop is true', () => {
    const { container } = render(<EmptyState title="No notes yet" compact />);
    expect(container.firstChild).toHaveClass('empty-state-compact');
  });

  it('uses btn-sm on action buttons when compact', () => {
    render(<EmptyState title="x" action="Add" onAction={() => {}} compact />);
    expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('btn-sm');
  });

  it('omits action button when no action prop given', () => {
    render(<EmptyState title="No notes yet" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
