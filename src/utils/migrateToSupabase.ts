import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

// Old AsyncStorage data types
interface OldProduct {
  id: string;
  brand: string;
  name: string;
  size: string;
  cost: number;
  image?: string;
  createdAt: string;
}

interface OldCustomer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  wishlist: string[];
  totalPurchases: number;
  lastPurchase?: string;
  createdAt: string;
}

interface OldSale {
  id: string;
  date: string;
  customerName: string;
  products: {
    name: string;
    brand: string;
    quantity: number;
    unitCost: number;
    soldPrice: number;
    amountPaid?: number;
    balance?: number;
  }[];
  totalCost: number;
  totalRevenue: number;
  profit: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  amountPaid: number;
}

export async function migrateToSupabase() {
  const results = {
    products: { migrated: 0, skipped: 0, errors: 0 },
    customers: { migrated: 0, skipped: 0, errors: 0 },
    sales: { migrated: 0, skipped: 0, errors: 0 },
    errors: [] as string[],
  };

  try {
    console.log('🚀 Starting migration from AsyncStorage to Supabase...');

    // ============================================
    // 1. MIGRATE PRODUCTS
    // ============================================
    console.log('\n📦 Migrating products...');
    const productsJson = await AsyncStorage.getItem('@products_catalog');

    if (productsJson && productsJson !== 'null') {
      const oldProducts: OldProduct[] = JSON.parse(productsJson);
      if (oldProducts && oldProducts.length > 0) {
        console.log(`Found ${oldProducts.length} products in AsyncStorage`);

      for (const oldProduct of oldProducts) {
        try {
          // Generate SKU from brand and name
          const sku = `${oldProduct.brand.substring(0, 3).toUpperCase()}-${oldProduct.name.substring(0, 4).toUpperCase()}-${oldProduct.size.replace('ml', '')}`;

          const { error } = await supabase
            .from('products')
            .insert([{
              sku: sku,
              brand: oldProduct.brand,
              name: oldProduct.name,
              size: oldProduct.size,
              cost: oldProduct.cost,
              image_url: oldProduct.image,
              active: true,
            }]);

          if (error) {
            if (error.code === '23505') {
              // Duplicate key - product already exists
              results.products.skipped++;
            } else {
              throw error;
            }
          } else {
            results.products.migrated++;
          }
        } catch (error) {
          console.error(`Error migrating product ${oldProduct.name}:`, error);
          results.products.errors++;
          results.errors.push(`Product ${oldProduct.name}: ${(error as Error).message}`);
        }
      }

        console.log(`✅ Products: ${results.products.migrated} migrated, ${results.products.skipped} skipped, ${results.products.errors} errors`);
      } else {
        console.log('Products array is empty');
      }
    } else {
      console.log('No products found in AsyncStorage');
    }

    // ============================================
    // 2. MIGRATE CUSTOMERS
    // ============================================
    console.log('\n👥 Migrating customers...');
    const customersJson = await AsyncStorage.getItem('@customers_database');

    if (customersJson && customersJson !== 'null') {
      const oldCustomers: OldCustomer[] = JSON.parse(customersJson);
      if (oldCustomers && oldCustomers.length > 0) {
        console.log(`Found ${oldCustomers.length} customers in AsyncStorage`);

      for (const oldCustomer of oldCustomers) {
        try {
          const { error } = await supabase
            .from('customers')
            .insert([{
              name: oldCustomer.name,
              phone: oldCustomer.phone,
              wishlist: oldCustomer.wishlist || [],
              notes: `Migrated from AsyncStorage. Total purchases: ${oldCustomer.totalPurchases}`,
            }]);

          if (error) {
            if (error.code === '23505') {
              results.customers.skipped++;
            } else {
              throw error;
            }
          } else {
            results.customers.migrated++;
          }
        } catch (error) {
          console.error(`Error migrating customer ${oldCustomer.name}:`, error);
          results.customers.errors++;
          results.errors.push(`Customer ${oldCustomer.name}: ${(error as Error).message}`);
        }
      }

        console.log(`✅ Customers: ${results.customers.migrated} migrated, ${results.customers.skipped} skipped, ${results.customers.errors} errors`);
      } else {
        console.log('Customers array is empty');
      }
    } else {
      console.log('No customers found in AsyncStorage');
    }

    // ============================================
    // 3. MIGRATE SALES
    // ============================================
    console.log('\n💰 Migrating sales...');
    const salesJson = await AsyncStorage.getItem('@sales_database');

    if (salesJson && salesJson !== 'null') {
      const oldSales: OldSale[] = JSON.parse(salesJson);
      if (oldSales && oldSales.length > 0) {
        console.log(`Found ${oldSales.length} sales in AsyncStorage`);

      for (const oldSale of oldSales) {
        try {
          // Find or create customer
          let customerId: string | null = null;

          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id')
            .eq('name', oldSale.customerName)
            .single();

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Create customer if not found
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert([{ name: oldSale.customerName }])
              .select('id')
              .single();

            if (customerError) throw customerError;
            customerId = newCustomer?.id;
          }

          if (!customerId) {
            throw new Error('Failed to get customer ID');
          }

          // Calculate payment status
          const paymentStatus = oldSale.paymentStatus === 'pending' ? 'layaway' : oldSale.paymentStatus;

          // Create sale
          const { data: newSale, error: saleError } = await supabase
            .from('sales')
            .insert([{
              customer_id: customerId,
              sale_date: oldSale.date,
              total_amount: oldSale.totalRevenue,
              amount_paid: oldSale.amountPaid,
              outstanding_balance: oldSale.totalRevenue - oldSale.amountPaid,
              payment_status: paymentStatus,
              notes: `Migrated from AsyncStorage. Original profit: $${oldSale.profit}`,
            }])
            .select('id')
            .single();

          if (saleError) throw saleError;

          // Create sale items
          for (const product of oldSale.products) {
            // Find product in Supabase
            const { data: productData } = await supabase
              .from('products')
              .select('id')
              .eq('brand', product.brand)
              .eq('name', product.name)
              .single();

            if (productData) {
              await supabase
                .from('sale_items')
                .insert([{
                  sale_id: newSale.id,
                  product_id: productData.id,
                  quantity: product.quantity,
                  unit_price: product.soldPrice,
                  line_total: product.quantity * product.soldPrice,
                }]);
            } else {
              console.warn(`Product not found: ${product.brand} ${product.name}`);
            }
          }

          results.sales.migrated++;
        } catch (error) {
          console.error(`Error migrating sale:`, error);
          results.sales.errors++;
          results.errors.push(`Sale from ${oldSale.date}: ${(error as Error).message}`);
        }
      }

        console.log(`✅ Sales: ${results.sales.migrated} migrated, ${results.sales.skipped} skipped, ${results.sales.errors} errors`);
      } else {
        console.log('Sales array is empty');
      }
    } else {
      console.log('No sales found in AsyncStorage');
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Products: ${results.products.migrated} migrated, ${results.products.skipped} already existed`);
    console.log(`Customers: ${results.customers.migrated} migrated, ${results.customers.skipped} already existed`);
    console.log(`Sales: ${results.sales.migrated} migrated`);

    if (results.errors.length > 0) {
      console.log(`\n⚠️  ${results.errors.length} errors occurred:`);
      results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✨ Migration completed successfully with no errors!');
    }

    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    results.errors.push(`Fatal error: ${(error as Error).message}`);
  }

  return results;
}

// Function to backup AsyncStorage data before migration
export async function backupAsyncStorageData() {
  try {
    const products = await AsyncStorage.getItem('@products_catalog');
    const customers = await AsyncStorage.getItem('@customers_database');
    const sales = await AsyncStorage.getItem('@sales_database');

    const backup = {
      timestamp: new Date().toISOString(),
      products: products ? JSON.parse(products) : null,
      customers: customers ? JSON.parse(customers) : null,
      sales: sales ? JSON.parse(sales) : null,
    };

    // Save backup to AsyncStorage with timestamp
    await AsyncStorage.setItem(
      `@migration_backup_${Date.now()}`,
      JSON.stringify(backup)
    );

    console.log('✅ Backup created successfully');
    return backup;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  }
}
