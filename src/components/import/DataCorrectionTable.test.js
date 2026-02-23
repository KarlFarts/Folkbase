import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DataCorrectionTable from './DataCorrectionTable';

describe('DataCorrectionTable', () => {
  const sampleIssues = [
    {
      rowIndex: 0,
      contact: { Name: 'John Smith', Email: 'invalid', Phone: '123' },
      issues: [
        { field: 'Email', type: 'error', message: 'Invalid email format', originalValue: 'invalid' },
        { field: 'Phone', type: 'error', message: 'Phone must be 10 digits', originalValue: '123' }
      ]
    },
    {
      rowIndex: 1,
      contact: { Name: '', Email: 'jane@example.com', Phone: '555-123-4567' },
      issues: [
        { field: 'Name', type: 'error', message: 'Name is required', originalValue: '' }
      ]
    }
  ];

  test('renders table with issue rows', () => {
    render(<DataCorrectionTable issues={sampleIssues} onUpdate={() => {}} />);

    expect(screen.getByDisplayValue('John Smith')).toBeInTheDocument();
    expect(screen.getByText(/Invalid email format/)).toBeInTheDocument();
    expect(screen.getByText(/Phone must be 10 digits/)).toBeInTheDocument();
  });

  test('shows row selection checkboxes', () => {
    render(<DataCorrectionTable issues={sampleIssues} onUpdate={() => {}} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  test('calls onUpdate when cell is edited', () => {
    const mockUpdate = vi.fn();
    render(<DataCorrectionTable issues={sampleIssues} onUpdate={mockUpdate} />);

    // Find and click on an editable cell
    const emailInput = screen.getByDisplayValue('invalid');
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.blur(emailInput);

    expect(mockUpdate).toHaveBeenCalled();
  });

  test('displays empty state when no issues', () => {
    render(<DataCorrectionTable issues={[]} onUpdate={() => {}} />);

    expect(screen.getByText(/no data quality issues found/i)).toBeInTheDocument();
  });

  test('allows row selection', () => {
    const mockSelect = vi.fn();
    render(<DataCorrectionTable issues={sampleIssues} onRowSelect={mockSelect} onUpdate={() => {}} />);

    // Get checkboxes (skip the "select all" checkbox in header)
    const checkboxes = screen.getAllByRole('checkbox');
    const firstRowCheckbox = checkboxes[1]; // Index 0 is header checkbox
    fireEvent.click(firstRowCheckbox);

    expect(mockSelect).toHaveBeenCalledWith(0, true);
  });
});
