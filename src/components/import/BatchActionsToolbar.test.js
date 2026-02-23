import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import BatchActionsToolbar from './BatchActionsToolbar';

describe('BatchActionsToolbar', () => {
  test('renders batch action buttons', () => {
    render(<BatchActionsToolbar selectedCount={2} onFormatPhones={() => {}} onExcludeSelected={() => {}} />);

    expect(screen.getByText(/format.*phone/i)).toBeInTheDocument();
    expect(screen.getByText(/exclude.*selected/i)).toBeInTheDocument();
  });

  test('shows selected count', () => {
    render(<BatchActionsToolbar selectedCount={5} onFormatPhones={() => {}} onExcludeSelected={() => {}} />);

    expect(screen.getByText(/5.*selected/i)).toBeInTheDocument();
  });

  test('calls onFormatPhones when button clicked', () => {
    const mockFormatPhones = vi.fn();
    render(<BatchActionsToolbar selectedCount={2} onFormatPhones={mockFormatPhones} onExcludeSelected={() => {}} />);

    const formatButton = screen.getByText(/format.*phone/i);
    fireEvent.click(formatButton);

    expect(mockFormatPhones).toHaveBeenCalled();
  });

  test('calls onExcludeSelected when button clicked', () => {
    const mockExclude = vi.fn();
    render(<BatchActionsToolbar selectedCount={2} onFormatPhones={() => {}} onExcludeSelected={mockExclude} />);

    const excludeButton = screen.getByText(/exclude.*selected/i);
    fireEvent.click(excludeButton);

    expect(mockExclude).toHaveBeenCalled();
  });

  test('disables buttons when no rows selected', () => {
    render(<BatchActionsToolbar selectedCount={0} onFormatPhones={() => {}} onExcludeSelected={() => {}} />);

    const formatButton = screen.getByText(/format.*phone/i);
    const excludeButton = screen.getByText(/exclude.*selected/i);

    expect(formatButton).toBeDisabled();
    expect(excludeButton).toBeDisabled();
  });

  test('enables buttons when rows are selected', () => {
    render(<BatchActionsToolbar selectedCount={3} onFormatPhones={() => {}} onExcludeSelected={() => {}} />);

    const formatButton = screen.getByText(/format.*phone/i);
    const excludeButton = screen.getByText(/exclude.*selected/i);

    expect(formatButton).not.toBeDisabled();
    expect(excludeButton).not.toBeDisabled();
  });
});
