import React, { useState } from 'react';
import '../../styles/DataCorrectionTable.css';

/**
 * DataCorrectionTable Component
 * Displays validation issues with inline editing capability
 */
function DataCorrectionTable({ issues, onUpdate, onRowSelect }) {
  const [selectedRows, setSelectedRows] = useState(new Set());

  const handleCellChange = (rowIndex, field, newValue) => {
    if (onUpdate) {
      onUpdate(rowIndex, field, newValue);
    }
  };

  const handleRowSelect = (rowIndex, isSelected) => {
    const newSelected = new Set(selectedRows);
    if (isSelected) {
      newSelected.add(rowIndex);
    } else {
      newSelected.delete(rowIndex);
    }
    setSelectedRows(newSelected);

    if (onRowSelect) {
      onRowSelect(rowIndex, isSelected);
    }
  };

  if (issues.length === 0) {
    return (
      <div className="data-correction-table-empty">
        <p>No data quality issues found!</p>
      </div>
    );
  }

  return (
    <div className="data-correction-table-container">
      <table className="data-correction-table">
        <thead>
          <tr>
            <th>
              <input type="checkbox" aria-label="Select all" />
            </th>
            <th>Issue</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((item) => {
            const { rowIndex, contact, issues: contactIssues } = item;
            const issueText = contactIssues.map(i => i.message).join(', ');

            return (
              <tr key={rowIndex} className={selectedRows.has(rowIndex) ? 'selected' : ''}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={(e) => handleRowSelect(rowIndex, e.target.checked)}
                    aria-label={`Select row ${rowIndex}`}
                  />
                </td>
                <td className="issue-cell">{issueText}</td>
                <td>
                  <input
                    type="text"
                    value={contact.Name || ''}
                    onChange={(e) => handleCellChange(rowIndex, 'Name', e.target.value)}
                    onBlur={(e) => handleCellChange(rowIndex, 'Name', e.target.value)}
                    className="editable-cell"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={contact.Email || ''}
                    onChange={(e) => handleCellChange(rowIndex, 'Email', e.target.value)}
                    onBlur={(e) => handleCellChange(rowIndex, 'Email', e.target.value)}
                    className="editable-cell"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={contact.Phone || ''}
                    onChange={(e) => handleCellChange(rowIndex, 'Phone', e.target.value)}
                    onBlur={(e) => handleCellChange(rowIndex, 'Phone', e.target.value)}
                    className="editable-cell"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DataCorrectionTable;
