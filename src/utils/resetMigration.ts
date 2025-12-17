import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Reset the migration flag to allow re-migration
 * Call this from the app if you want to re-run the migration
 */
export async function resetMigrationFlag() {
  try {
    await AsyncStorage.removeItem('@migration_complete');
    console.log('✅ Migration flag reset successfully');
    console.log('💡 Restart the app to trigger re-migration');
    return true;
  } catch (error) {
    console.error('❌ Error resetting migration flag:', error);
    return false;
  }
}

/**
 * Check if migration has been completed
 */
export async function checkMigrationStatus() {
  try {
    const status = await AsyncStorage.getItem('@migration_complete');
    console.log('Migration status:', status === 'true' ? 'Completed' : 'Not completed');
    return status === 'true';
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * View all AsyncStorage data (for debugging)
 */
export async function viewAsyncStorageData() {
  try {
    const products = await AsyncStorage.getItem('@products_catalog');
    const customers = await AsyncStorage.getItem('@customers_database');
    const sales = await AsyncStorage.getItem('@sales_database');

    console.log('📦 Products:', products ? JSON.parse(products).length : 0);
    console.log('👥 Customers:', customers ? JSON.parse(customers).length : 0);
    console.log('💰 Sales:', sales ? JSON.parse(sales).length : 0);

    return {
      products: products ? JSON.parse(products) : null,
      customers: customers ? JSON.parse(customers) : null,
      sales: sales ? JSON.parse(sales) : null,
    };
  } catch (error) {
    console.error('Error viewing AsyncStorage data:', error);
    return null;
  }
}
