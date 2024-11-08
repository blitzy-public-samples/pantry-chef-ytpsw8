/**
 * HUMAN TASKS:
 * 1. Ensure Tailwind CSS is properly configured with the provided CSS classes
 * 2. Verify that the classnames package is installed (npm install classnames@^2.3.0)
 * 3. Confirm that the theme configuration is properly imported and accessible
 */

import React, { useState } from 'react'; // ^18.0.0
import classnames from 'classnames'; // ^2.3.0
import { palette, spacing, borderRadius } from '../../config/theme';
import Spinner from './Spinner';

/**
 * Interface for defining table column configuration
 * Implements requirements:
 * - Web Dashboard: Structured data display with customizable columns
 */
interface Column {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

/**
 * Props interface for the Table component
 */
interface TableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  onSort?: (key: string, direction: string) => void;
  className?: string;
}

/**
 * Interface for tracking sort state
 */
interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

/**
 * A reusable table component for displaying structured data in the PantryChef web dashboard
 * Implements requirements:
 * - Frontend UI Framework: Material Design implementation
 * - Web Dashboard: Responsive design with structured data display
 * - Inventory Management: Digital pantry management with expiration tracking
 */
export const Table: React.FC<TableProps> = ({
  columns,
  data,
  loading = false,
  onSort,
  className,
}) => {
  // Initialize sort state
  const [sortState, setSortState] = useState<SortState>({
    key: '',
    direction: 'asc'
  });

  // Handle column header click for sorting
  const handleSort = (column: Column) => {
    if (!column.sortable || !onSort) return;

    const newDirection =
      sortState.key === column.key && sortState.direction === 'asc'
        ? 'desc'
        : 'asc';

    setSortState({
      key: column.key,
      direction: newDirection
    });

    onSort(column.key, newDirection);
  };

  // Render sort indicator
  const renderSortIndicator = (column: Column) => {
    if (!column.sortable) return null;

    const isActive = sortState.key === column.key;
    const direction = sortState.direction;

    return (
      <span className="ml-2 inline-block">
        {isActive ? (
          direction === 'asc' ? '↑' : '↓'
        ) : '↕'}
      </span>
    );
  };

  // Render table content based on loading state
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading">
          <Spinner size="lg" color="primary" />
        </div>
      );
    }

    if (!data.length) {
      return (
        <div className="empty">
          No data available
        </div>
      );
    }

    return (
      <table className="table-auto min-w-full divide-y divide-slate-300">
        <thead className="bg-primary-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key}
                className={classnames(
                  `py-3 ${index === 0 ? 'pl-8' : 'pl-0'} ${index === columns.length - 1 ? 'pr-8' : 'pr-0'} text-left`,
                  { sortable: column.sortable }
                )}
                onClick={() => handleSort(column)}
                style={{
                  cursor: column.sortable ? 'pointer' : 'default'
                }}
              >
                {column.title}
                {renderSortIndicator(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-200 bg-white'>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, index) => (
                <td key={`${rowIndex}-${column.key}`} className={`py-3 ${index === 0 ? 'pl-8' : 'pl-0'} ${index === columns.length - 1 ? 'pr-8' : 'pr-0'} text-left`}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className={classnames('table-container', className)}>
      {renderContent()}
    </div>
  );
};

export default Table;