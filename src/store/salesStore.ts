import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useCustomersStore } from './customersStore';
import { useExchangeRateStore } from './exchangeRateStore';
import { allocateProductFIFO, applyAllocations, AllocationResult } from '../utils/fifoAllocation';
import { getTableName } from '../utils/getTableName';
import { isDemoAccount } from '../utils/isDemoAccount';

/**
 * Update shipment totals (revenue and profit) after a sale
 * Note: Shipments track in USD, but sales happen in DOP
 * We convert DOP revenue to USD using the exchange rate
 */
async function updateShipmentTotals(
  allocationResults: Array<{
    product: any;
    productId: string;
    allocation: AllocationResult;
  }>,
  saleCurrency: 'USD' | 'DOP',
  exchangeRateUsed: number
) {
  // Group allocations by shipment
  const shipmentUpdates: Map<string, { revenue: number; cost: number }> = new Map();

  for (const result of allocationResults) {
    const { product, allocation } = result;

    for (const alloc of allocation.allocations) {
      // Get shipment_id from shipment_item
      const { data: shipmentItem } = await supabase
        .from(getTableName('shipment_items'))
        .select('shipment_id')
        .eq('id', alloc.shipmentItemId)
        .single();

      if (shipmentItem) {
        const existing = shipmentUpdates.get(shipmentItem.shipment_id) || { revenue: 0, cost: 0 };

        // Convert revenue to USD if sale was in DOP
        let revenueInUSD = alloc.quantity * product.soldPrice;
        if (saleCurrency === 'DOP') {
          revenueInUSD = revenueInUSD / exchangeRateUsed;
        }

        shipmentUpdates.set(shipmentItem.shipment_id, {
          revenue: existing.revenue + revenueInUSD,
          cost: existing.cost + (alloc.quantity * alloc.unitCost),
        });
      }
    }
  }

  // Update each shipment
  for (const [shipmentId, totals] of shipmentUpdates.entries()) {
    // Get current totals
    const { data: shipment } = await supabase
      .from(getTableName('shipments'))
      .select('total_revenue, net_profit, total_cost')
      .eq('id', shipmentId)
      .single();

    if (shipment) {
      const newRevenue = (shipment.total_revenue || 0) + totals.revenue;
      const newProfit = newRevenue - (shipment.total_cost || 0);

      await supabase
        .from(getTableName('shipments'))
        .update({
          total_revenue: newRevenue,
          net_profit: newProfit,
        })
        .eq('id', shipmentId);
    }
  }
}

// Simplified Sale type for display (combines data from multiple tables)
export interface Sale {
  id: string;
  date: string;
  customerName: string;
  customerId?: string;
  products: SaleProduct[];
  totalCost: number;  // Calculated from products (in USD)
  totalRevenue: number;  // In the sale's currency
  profit: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  amountPaid: number;
  currency: 'USD' | 'DOP';  // Currency of the sale
  exchangeRateUsed: number;  // Exchange rate at time of sale
}

export interface SaleProduct {
  name: string;
  brand: string;
  size?: string;
  quantity: number;
  unitCost: number;
  soldPrice: number;
  amountPaid?: number;
  balance?: number;
}

// Supabase sale type (matches database schema)
interface SupabaseSale {
  id: string;
  customer_id?: string;
  sale_date: string;
  total_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  payment_status: 'paid' | 'partial' | 'layaway';
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  currency: 'USD' | 'DOP';
  exchange_rate_used: number;
}

interface SupabaseSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

interface SalesState {
  sales: Sale[];
  isLoading: boolean;
  error: string | null;
  loadSales: () => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
}

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  isLoading: false,
  error: null,

  loadSales: async () => {
    set({ isLoading: true, error: null });
    try {
      const saleItemsTableName = getTableName('sale_items');

      // Load sales with customer and sale items
      const { data: salesData, error: salesError } = await supabase
        .from(getTableName('sales'))
        .select(`
          *,
          customer:${getTableName('customers')}(name),
          ${saleItemsTableName}(*)
        `)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      // Transform Supabase data to app format
      const transformedSales: Sale[] = await Promise.all((salesData || []).map(async (sale: any) => {
        // Access sale items using the correct table name (demo_sale_items or sale_items)
        const saleItems = sale[saleItemsTableName] || sale.sale_items || [];

        // Get product details and cost from allocations
        const products: SaleProduct[] = await Promise.all(saleItems.map(async (item: any) => {
          const { data: product } = await supabase
            .from(getTableName('products'))
            .select('brand, name, size')
            .eq('id', item.product_id)
            .single();

          // Get allocations for this sale item to calculate actual unit cost
          const { data: allocations } = await supabase
            .from(getTableName('sale_item_allocations'))
            .select('quantity, unit_cost')
            .eq('sale_item_id', item.id);

          // Calculate weighted average unit cost from allocations
          let totalCost = 0;
          let totalQty = 0;
          if (allocations && allocations.length > 0) {
            for (const alloc of allocations) {
              totalCost += alloc.quantity * parseFloat(alloc.unit_cost.toString());
              totalQty += alloc.quantity;
            }
          }
          const avgUnitCost = totalQty > 0 ? totalCost / totalQty : 0;

          const productTotal = item.line_total;
          const productPaid = item.amount_paid || 0;
          const productBalance = productTotal - productPaid;

          return {
            brand: product?.brand || '',
            name: product?.name || '',
            size: product?.size || '',
            quantity: item.quantity,
            unitCost: avgUnitCost,
            soldPrice: item.unit_price,
            amountPaid: productPaid,
            balance: productBalance,
          };
        }));

        const productsWithPayment = products;

        const totalCost = productsWithPayment.reduce((sum, p) => sum + (p.unitCost * p.quantity), 0);
        const totalRevenue = sale.total_amount;
        const currency = sale.currency || 'DOP';  // Default to DOP

        // Use stored exchange rate, or fallback to current rate from store
        const { usdToDop } = useExchangeRateStore.getState();
        const exchangeRateUsed = sale.exchange_rate_used || usdToDop;

        // Calculate profit: If sale is in DOP, convert USD cost to DOP first
        let profit: number;
        if (currency === 'DOP') {
          const totalCostInDOP = totalCost * exchangeRateUsed;
          profit = totalRevenue - totalCostInDOP;
        } else {
          profit = totalRevenue - totalCost;
        }

        return {
          id: sale.id,
          date: sale.sale_date,
          customerName: sale.customer?.name || 'Unknown Customer',
          customerId: sale.customer_id,
          products: productsWithPayment,
          totalCost,
          totalRevenue,
          profit,
          paymentStatus: sale.payment_status === 'layaway' ? 'pending' : sale.payment_status,
          amountPaid: sale.amount_paid,
          currency,
          exchangeRateUsed,
        };
      }));

      set({ sales: transformedSales, isLoading: false });
    } catch (error) {
      console.error('Error loading sales:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addSale: async (sale) => {
    set({ error: null });
    try {
      // Demo account limits
      if (isDemoAccount() && get().sales.length >= 30) {
        throw new Error('Demo account limit: Maximum 30 sales');
      }

      // 1. Find or create customer
      const { findOrCreateCustomer } = useCustomersStore.getState();
      const customer = await findOrCreateCustomer(sale.customerName);

      if (!customer) {
        throw new Error('Failed to create customer');
      }

      // 2. FIFO ALLOCATION - Allocate inventory for all products BEFORE creating sale
      const allocationResults: Array<{
        product: typeof sale.products[0];
        productId: string;
        allocation: Awaited<ReturnType<typeof allocateProductFIFO>>;
      }> = [];

      for (const product of sale.products) {
        // Find product in products table
        const { data: productData, error: productError } = await supabase
          .from(getTableName('products'))
          .select('id')
          .eq('brand', product.brand)
          .eq('name', product.name)
          .eq('size', product.size || '')
          .single();

        if (productError || !productData) {
          throw new Error(`Product not found: ${product.brand} ${product.name} ${product.size}`);
        }

        // Allocate inventory using FIFO
        const allocation = await allocateProductFIFO(
          product.brand,
          product.name,
          product.size || '',
          product.quantity
        );

        if (!allocation.success) {
          throw new Error(allocation.errorMessage || 'Allocation failed');
        }

        allocationResults.push({
          product,
          productId: productData.id,
          allocation,
        });
      }

      // 3. Calculate totals and get current exchange rate
      const totalRevenue = sale.totalRevenue;
      const totalAmount = totalRevenue;
      const outstandingBalance = totalAmount - sale.amountPaid;
      const paymentStatus: 'paid' | 'partial' | 'layaway' =
        sale.amountPaid >= totalAmount ? 'paid' :
        sale.amountPaid > 0 ? 'partial' : 'layaway';

      // Get current exchange rate for transaction history
      const { usdToDop } = useExchangeRateStore.getState();
      const currency = sale.currency || 'DOP';  // Default to DOP since sales happen in DR

      // 4. Create sale record
      const { data: saleData, error: saleError } = await supabase
        .from(getTableName('sales'))
        .insert([{
          customer_id: customer.id,
          sale_date: sale.date,
          total_amount: totalAmount,
          amount_paid: sale.amountPaid,
          outstanding_balance: outstandingBalance,
          payment_status: paymentStatus,
          currency: currency,
          exchange_rate_used: usdToDop,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // 5. Create sale items and apply allocations
      for (const result of allocationResults) {
        const { product, productId, allocation } = result;

        // Create sale item with individual product payment
        const { data: saleItemData, error: itemError } = await supabase
          .from(getTableName('sale_items'))
          .insert([{
            sale_id: saleData.id,
            product_id: productId,
            quantity: product.quantity,
            unit_price: product.soldPrice,
            line_total: product.quantity * product.soldPrice,
            amount_paid: product.amountPaid || 0,
          }])
          .select()
          .single();

        if (itemError) {
          throw new Error(`Error creating sale item: ${itemError.message}`);
        }

        // Apply FIFO allocations (create allocation records and update inventory)
        const applyResult = await applyAllocations(saleItemData.id, allocation.allocations);

        if (!applyResult.success) {
          throw new Error(`Error applying allocations: ${applyResult.error}`);
        }
      }

      // 6. Update shipment totals (revenue and profit)
      await updateShipmentTotals(allocationResults, currency, usdToDop);

      // 7. Reload sales to get the updated list
      await get().loadSales();

    } catch (error) {
      set({ error: (error as Error).message });
      throw error; // Re-throw to show error to user
    }
  },

  updateSale: async (id, saleUpdate) => {
    set({ error: null });
    try {
      const sale = get().sales.find(s => s.id === id);
      if (!sale) return;

      // Update individual product payments if provided
      if (saleUpdate.products) {
        // Get sale items from database
        const { data: saleItems } = await supabase
          .from(getTableName('sale_items'))
          .select('id, product_id')
          .eq('sale_id', id);

        if (saleItems) {
          // Update each sale item's amount_paid
          for (let i = 0; i < saleUpdate.products.length; i++) {
            const product = saleUpdate.products[i];
            const saleItem = saleItems[i];

            if (saleItem && product.amountPaid !== undefined) {
              await supabase
                .from(getTableName('sale_items'))
                .update({ amount_paid: product.amountPaid })
                .eq('id', saleItem.id);
            }
          }
        }
      }

      // Update sale-level payment information
      if (saleUpdate.amountPaid !== undefined) {
        const outstandingBalance = sale.totalRevenue - saleUpdate.amountPaid;
        const paymentStatus: 'paid' | 'partial' | 'layaway' =
          saleUpdate.amountPaid >= sale.totalRevenue ? 'paid' :
          saleUpdate.amountPaid > 0 ? 'partial' : 'layaway';

        const { error } = await supabase
          .from(getTableName('sales'))
          .update({
            amount_paid: saleUpdate.amountPaid,
            outstanding_balance: outstandingBalance,
            payment_status: paymentStatus,
          })
          .eq('id', id);

        if (error) throw error;
      }

      // Reload sales
      await get().loadSales();
    } catch (error) {
      console.error('Error updating sale:', error);
      set({ error: (error as Error).message });
    }
  },

  deleteSale: async (id) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from(getTableName('sales'))
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedSales = get().sales.filter(s => s.id !== id);
      set({ sales: updatedSales });
    } catch (error) {
      console.error('Error deleting sale:', error);
      set({ error: (error as Error).message });
    }
  },
}));
