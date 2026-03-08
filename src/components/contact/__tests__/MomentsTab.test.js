import { render, screen, fireEvent } from '@testing-library/react';
import MomentsTab from '../MomentsTab';

const sampleMoments = [
  {
    'Moment ID': 'MOM-001',
    Title: 'Beach vacation',
    Type: 'Vacation',
    'Start Date': '2025-06-01',
    'End Date': '2025-06-07',
    Location: 'Florida',
    Notes: 'Had a great time',
    'Contact IDs': 'CON001,CON002',
  },
  {
    'Moment ID': 'MOM-002',
    Title: "Grandma's funeral",
    Type: 'Funeral',
    'Start Date': '2024-11-15',
    'End Date': '',
    Location: 'Chicago',
    Notes: '',
    'Contact IDs': 'CON001',
  },
];

const allContacts = [
  { 'Contact ID': 'CON001', 'Display Name': 'Alice Smith' },
  { 'Contact ID': 'CON002', 'Display Name': 'Bob Jones' },
];

const defaultProps = {
  moments: sampleMoments,
  allContacts,
  currentContactId: 'CON001',
  canWrite: true,
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('MomentsTab', () => {
  it('renders a list of moments', () => {
    render(<MomentsTab {...defaultProps} />);
    expect(screen.getByText('Beach vacation')).toBeInTheDocument();
    expect(screen.getByText("Grandma's funeral")).toBeInTheDocument();
  });

  it('shows empty state when no moments', () => {
    render(<MomentsTab {...defaultProps} moments={[]} />);
    expect(screen.getByText(/no moments logged yet/i)).toBeInTheDocument();
  });

  it('calls onAdd when Add Moment button is clicked', () => {
    render(<MomentsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Moment'));
    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  it('expands a moment on header click to show notes', () => {
    render(<MomentsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('Beach vacation'));
    expect(screen.getByText('Had a great time')).toBeInTheDocument();
  });

  it('calls onEdit when Edit is clicked on an expanded card', () => {
    render(<MomentsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('Beach vacation'));
    fireEvent.click(screen.getAllByText('Edit')[0]);
    expect(defaultProps.onEdit).toHaveBeenCalledWith(sampleMoments[0]);
  });

  it('calls onDelete when Delete is clicked', () => {
    render(<MomentsTab {...defaultProps} />);
    fireEvent.click(screen.getByText('Beach vacation'));
    fireEvent.click(screen.getAllByText('Delete')[0]);
    expect(defaultProps.onDelete).toHaveBeenCalledWith('MOM-001');
  });
});
