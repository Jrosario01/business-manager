import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { useCustomersStore } from './customersStore';
import { allocateProductFIFO, applyAllocations, AllocationResult } from '../utils/fifoAllocation';

/**
 * Update shipment totals (revenue and profit) after a sale
 */
async function updateShipmentTotals(
  allocationResults: Array<{
    product: any;
    productId: string;
    allocation: AllocationResult;
  }>
) {
  // Group allocations by shipment
  const shipmentUpdates: Map<string, { revenue: number; cost: number }> = new Map();

  for (const result of allocationResults) {
    const { product, allocation } = result;

    for (const alloc of allocation.allocations) {
      // Get shipment_id from shipment_item
      const { data: shipmentItem } = await supabase
        .from('shipment_items')
        .select('shipment_id')
        .eq('id', alloc.shipmentItemId)
        .single();

      if (shipmentItem) {
        const existing = shipmentUpdates.get(shipmentItem.shipment_id) || { revenue: 0, cost: 0 };
        shipmentUpdates.set(shipmentItem.shipment_id, {
          revenue: existing.revenue + (alloc.quantity * product.soldPrice),
          cost: existing.cost + (alloc.quantity * alloc.unitCost),
        });
      }
    }
  }

  // Update each shipment
  for (const [shipmentId, totals] of shipmentUpdates.entries()) {
    // Get current totals
    const { data: shipment } = await supabase
      .from('shipments')
      .select('total_revenue, net_profit')
      .eq('id', shipmentId)
      .single();

    if (shipment) {
      const newRevenue = (shipment.total_revenue || 0) + totals.revenue;
      const newProfit = newRevenue - totals.cost; // Simplified profit calculation

      await supabase
        .from('shipments')
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
  totalCost: number;  // Calculated from products
  totalRevenue: number;
  profit: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  amountPaid: number;
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
      // Load sales with customer and sale items
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          customer:customers(name),
          sale_items(*)
        `)
        .order('sale_date', { ascending: false });

      if (salesError) throw salesError;

      // Transform Supabase data to app format
      const transformedSales: Sale[] = await Promise.all((salesData || []).map(async (sale: any) => {
        const saleItems = sale.sale_items || [];

        // Get product details and cost from allocations
        const products: SaleProduct[] = await Promise.all(saleItems.map(async (item: any) => {
          const { data: product } = await supabase
            .from('products')
            .select('brand, name, size')
            .eq('id', item.product_id)
            .single();

          // Get allocations for this sale item to calculate actual unit cost
          const { data: allocations } = await supabase
            .from('sale_item_allocations')
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

          return {
            brand: product?.brand || '',
            name: product?.name || '',
            size: product?.size || '',
            quantity: item.quantity,
            unitCost: avgUnitCost,
            soldPrice: item.unit_price,
            amountPaid: 0,  // TODO: Calculate per-product payment
            balance: 0,
          };
        }));

        const totalCost = products.reduce((sum, p) => sum + (p.unitCost * p.quantity), 0);
        const totalRevenue = sale.total_amount;
        const profit = totalRevenue - totalCost;

        return {
          id: sale.id,
          date: sale.sale_date,
          customerName: sale.customer?.name || 'Unknown Customer',
          customerId: sale.customer_id,
          products,
          totalCost,
          totalRevenue,
          profit,
          paymentStatus: sale.payment_status === 'layaway' ? 'pending' : sale.payment_status,
          amountPaid: sale.amount_paid,
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
          .from('products')
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

      // 3. Calculate totals
      const totalRevenue = sale.totalRevenue;
      const totalAmount = totalRevenue;
      const outstandingBalance = totalAmount - sale.amountPaid;
      const paymentStatus: 'paid' | 'partial' | 'layaway' =
        sale.amountPaid >= totalAmount ? 'paid' :
        sale.amountPaid > 0 ? 'partial' : 'layaway';

      // 4. Create sale record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_id: customer.id,
          sale_date: sale.date,
          total_amount: totalAmount,
          amount_paid: sale.amountPaid,
          outstanding_balance: outstandingBalance,
          payment_status: paymentStatus,
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // 5. Create sale items and apply allocations
      for (const result of allocationResults) {
        const { product, productId, allocation } = result;

        // Create sale item
        const { data: saleItemData, error: itemError } = await supabase
          .from('sale_items')
          .insert([{
            sale_id: saleData.id,
            product_id: productId,
            quantity: product.quantity,
            unit_price: product.soldPrice,
            line_total: product.quantity * product.soldPrice,
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
      await updateShipmentTotals(allocationResults);

      // 7. Reload sales to get the updated list
      await get().loadSales();

    } catch (error) {
      console.error('Error adding sale:', error);
      set({ error: (error as Error).message });
      throw error; // Re-throw to show error to user
    }
  },

  updateSale: async (id, saleUpdate) => {
    set({ error: null });
    try {
      // For now, only support updating payment information
      if (saleUpdate.amountPaid !== undefined) {
        const sale = get().sales.find(s => s.id === id);
        if (!sale) return;

        const outstandingBalance = sale.totalRevenue - saleUpdate.amountPaid;
        const paymentStatus: 'paid' | 'partial' | 'layaway' =
          saleUpdate.amountPaid >= sale.totalRevenue ? 'paid' :
          saleUpdate.amountPaid > 0 ? 'partial' : 'layaway';

        const { error } = await supabase
          .from('sales')
          .update({
            amount_paid: saleUpdate.amountPaid,
            outstanding_balance: outstandingBalance,
            payment_status: paymentStatus,
          })
          .eq('id', id);

        if (error) throw error;

        // Reload sales
        await get().loadSales();
      }
    } catch (error) {
      console.error('Error updating sale:', error);
      set({ error: (error as Error).message });
    }
  },

  deleteSale: async (id) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('sales')
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
