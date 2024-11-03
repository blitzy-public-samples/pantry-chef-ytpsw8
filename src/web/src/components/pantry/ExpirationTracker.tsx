/**
 * HUMAN TASKS:
 * 1. Verify that Tailwind CSS is properly configured for the custom CSS classes
 * 2. Ensure classnames package is installed: npm install classnames@^2.3.0
 * 3. Confirm that the expiration threshold (7 days) aligns with business requirements
 */

import React, { useMemo } from 'react'; // ^18.0.0
import classnames from 'classnames'; // ^2.3.0
import Table from '../common/Table';
import Card from '../common/Card';
import useInventory from '../../hooks/useInventory';
import { calculateDaysUntilExpiration, formatDate } from '../../utils/date';
import { ExpirationAlertType, InventoryItem } from '../../interfaces/inventory.interface';

interface ExpirationTrackerProps {
  className?: string;
  daysThreshold?: number;
}

/**
 * A component that displays and tracks items approaching expiration in the user's pantry inventory
 * Implements requirements:
 * - Digital pantry management with expiration tracking (1.2 Scope/Core Capabilities)
 * - Reduced household food waste through inventory tracking (1.2 Scope/Key Benefits)
 */
export const ExpirationTracker: React.FC<ExpirationTrackerProps> = ({
  className,
  daysThreshold = 7
}) => {
  // Initialize inventory hook with expiration filter
  const { items, loading } = useInventory({
    categories: [],
    locations: [],
    expiringWithinDays: daysThreshold,
    searchTerm: ''
  });

  /**
   * Filter and sort inventory items based on expiration dates
   * Requirement: Food waste reduction through proactive expiration monitoring
   */
  const expiringItems = useMemo(() => {
    return items
      .filter(item => {
        if (!item.expirationDate) return false;
        const daysUntil = calculateDaysUntilExpiration(new Date(item.expirationDate));
        return daysUntil <= daysThreshold || daysUntil < 0;
      })
      .sort((a, b) => {
        const daysA = calculateDaysUntilExpiration(new Date(a.expirationDate));
        const daysB = calculateDaysUntilExpiration(new Date(b.expirationDate));
        return daysA - daysB;
      });
  }, [items, daysThreshold]);

  /**
   * Table column configuration for expiring items
   * Requirement: Digital pantry management with structured data display
   */
  const columns = [
    {
      key: 'name',
      title: 'Item',
      sortable: true,
      render: (value: string, row: InventoryItem) => (
        <div className="flex items-center">
          {row.imageUrl && (
            <img 
              src={row.imageUrl} 
              alt={value} 
              className="w-8 h-8 rounded-full mr-2 object-cover"
            />
          )}
          <span>{value}</span>
        </div>
      )
    },
    {
      key: 'expirationDate',
      title: 'Expires',
      sortable: true,
      render: (value: string) => formatDate(new Date(value), 'MMM dd, yyyy')
    },
    {
      key: 'daysUntilExpiration',
      title: 'Status',
      render: (_: any, row: InventoryItem) => {
        const daysUntil = calculateDaysUntilExpiration(new Date(row.expirationDate));
        const alertType = daysUntil < 0 ? ExpirationAlertType.EXPIRED : ExpirationAlertType.EXPIRES_SOON;
        
        return (
          <span className={classnames({
            'alert-expired': alertType === ExpirationAlertType.EXPIRED,
            'alert-warning': alertType === ExpirationAlertType.EXPIRES_SOON
          })}>
            {daysUntil < 0 
              ? `Expired ${Math.abs(daysUntil)} days ago`
              : daysUntil === 0
                ? 'Expires today'
                : `Expires in ${daysUntil} days`}
          </span>
        );
      }
    },
    {
      key: 'quantity',
      title: 'Quantity',
      render: (value: number, row: InventoryItem) => (
        <span>{`${value} ${row.unit}`}</span>
      )
    },
    {
      key: 'storageLocation',
      title: 'Location',
      sortable: true
    }
  ];

  return (
    <Card 
      className={classnames('expiration-tracker', className)}
      elevation="sm"
      padding="md"
    >
      <h2 className="text-xl font-semibold mb-4">
        Expiring Items
      </h2>
      <Table
        columns={columns}
        data={expiringItems}
        loading={loading}
      />
      {!loading && expiringItems.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No items expiring within {daysThreshold} days
        </div>
      )}
    </Card>
  );
};

export default ExpirationTracker;