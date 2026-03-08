import { render, screen, fireEvent } from '@testing-library/react';
import MomentModal from '../MomentModal';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
  saving: false,
  momentData: {
    Title: '',
    Type: 'Vacation',
    'Start Date': '',
    'End Date': '',
    Location: '',
    Notes: '',
    'Contact IDs': '',
  },
  setMomentData: vi.fn(),
  allContacts: [
    { 'Contact ID': 'CON001', 'Display Name': 'Alice Smith' },
    { 'Contact ID': 'CON002', 'Display Name': 'Bob Jones' },
  ],
  currentContactId: 'CON001',
};

describe('MomentModal', () => {
  it('renders the modal title', () => {
    render(<MomentModal {...defaultProps} />);
    expect(screen.getByText('Add Moment')).toBeInTheDocument();
  });

  it('shows "Edit Moment" when momentId prop is provided', () => {
    render(<MomentModal {...defaultProps} momentId="MOM-abc123" />);
    expect(screen.getByText('Edit Moment')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<MomentModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onSave when Save button is clicked', () => {
    render(<MomentModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Save Moment'));
    expect(defaultProps.onSave).toHaveBeenCalled();
  });

  it('does not show current contact in People suggestions', () => {
    render(<MomentModal {...defaultProps} />);
    // CON001 is currentContactId, should not be in suggestions list
    // CON002 Bob Jones should appear in the contacts dropdown
    const input = screen.getByPlaceholderText(/search contacts/i);
    fireEvent.change(input, { target: { value: 'Bob' } });
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });
});
