import { isDemoAccount } from './isDemoAccount';

/**
 * Returns the appropriate table name based on whether the user is a demo account.
 * Demo users interact with demo_* tables, while real users use production tables.
 *
 * @param baseTable - The base table name (e.g., 'products', 'customers')
 * @returns The full table name ('demo_products' for demo users, 'products' for real users)
 */
export const getTableName = (baseTable: string): string => {
  return isDemoAccount() ? `demo_${baseTable}` : baseTable;
};
