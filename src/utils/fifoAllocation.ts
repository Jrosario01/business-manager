import { supabase } from '../config/supabase';

/**
 * FIFO Allocation Result
 */
export interface AllocationResult {
  success: boolean;
  allocations: ShipmentAllocation[];
  totalCost: number;
  errorMessage?: string;
}

/**
 * Shipment Allocation - tracks which shipment items were used
 */
export interface ShipmentAllocation {
  shipmentItemId: string;
  quantity: number;
  unitCost: number;
}

/**
 * Available Inventory Item (from database)
 */
interface AvailableInventoryItem {
  shipment_item_id: string;
  shipment_id: string;
  shipment_date: string;
  remaining_quantity: number;
  unit_cost: number;
}

/**
 * Allocate product using FIFO (First In, First Out) algorithm
 *
 * This function finds available inventory for a product and allocates
 * the requested quantity from the oldest shipments first.
 *
 * @param brand - Product brand
 * @param name - Product name
 * @param size - Product size
 * @param quantityNeeded - How many units needed
 * @returns AllocationResult with success status and allocations
 */
export async function allocateProductFIFO(
  brand: string,
  name: string,
  size: string,
  quantityNeeded: number
): Promise<AllocationResult> {
  try {
    // Step 1: Get available inventory sorted by FIFO (oldest first)
    const { data: availableInventory, error } = await supabase
      .rpc('get_available_inventory', {
        p_brand: brand,
        p_name: name,
        p_size: size,
      });

    if (error) {
      console.error('Error getting available inventory:', error);
      return {
        success: false,
        allocations: [],
        totalCost: 0,
        errorMessage: `Database error: ${error.message}`,
      };
    }

    if (!availableInventory || availableInventory.length === 0) {
      return {
        success: false,
        allocations: [],
        totalCost: 0,
        errorMessage: `No inventory available for ${brand} ${name} ${size}`,
      };
    }

    // Step 2: Allocate from oldest shipments first
    const allocations: ShipmentAllocation[] = [];
    let remainingToAllocate = quantityNeeded;
    let totalCost = 0;

    for (const item of availableInventory as AvailableInventoryItem[]) {
      if (remainingToAllocate <= 0) break;

      const available = item.remaining_quantity;
      const toTake = Math.min(available, remainingToAllocate);

      allocations.push({
        shipmentItemId: item.shipment_item_id,
        quantity: toTake,
        unitCost: parseFloat(item.unit_cost.toString()),
      });

      totalCost += toTake * parseFloat(item.unit_cost.toString());
      remainingToAllocate -= toTake;
    }

    // Step 3: Validate complete allocation
    if (remainingToAllocate > 0) {
      const totalAvailable = (availableInventory as AvailableInventoryItem[])
        .reduce((sum, item) => sum + item.remaining_quantity, 0);

      return {
        success: false,
        allocations: [],
        totalCost: 0,
        errorMessage: `Insufficient inventory for ${brand} ${name} ${size}. Need ${quantityNeeded}, only ${totalAvailable} available.`,
      };
    }

    // Step 4: Return successful allocation
    return {
      success: true,
      allocations,
      totalCost,
    };
  } catch (error) {
    console.error('Error in allocateProductFIFO:', error);
    return {
      success: false,
      allocations: [],
      totalCost: 0,
      errorMessage: `Unexpected error: ${(error as Error).message}`,
    };
  }
}

/**
 * Apply allocations to database (update inventory and create allocation records)
 *
 * @param saleItemId - The sale_item ID to link allocations to
 * @param allocations - The allocations to apply
 * @returns Success status
 */
export async function applyAllocations(
  saleItemId: string,
  allocations: ShipmentAllocation[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Create allocation records
    const allocationRecords = allocations.map(alloc => ({
      sale_item_id: saleItemId,
      shipment_item_id: alloc.shipmentItemId,
      quantity: alloc.quantity,
      unit_cost: alloc.unitCost,
    }));

    const { error: insertError } = await supabase
      .from('sale_item_allocations')
      .insert(allocationRecords);

    if (insertError) {
      console.error('Error inserting allocations:', insertError);
      return { success: false, error: insertError.message };
    }

    // Step 2: Update shipment_items remaining_inventory
    for (const alloc of allocations) {
      // Get current remaining_inventory
      const { data: currentItem, error: fetchError } = await supabase
        .from('shipment_items')
        .select('remaining_inventory')
        .eq('id', alloc.shipmentItemId)
        .single();

      if (fetchError || !currentItem) {
        console.error('Error fetching shipment item:', fetchError);
        return { success: false, error: fetchError?.message || 'Item not found' };
      }

      // Decrement inventory
      const newRemaining = currentItem.remaining_inventory - alloc.quantity;

      const { error: updateError } = await supabase
        .from('shipment_items')
        .update({ remaining_inventory: newRemaining })
        .eq('id', alloc.shipmentItemId);

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        // Note: In production, you'd want to rollback previous allocations here
        return { success: false, error: updateError.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error applying allocations:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Batch allocate multiple products for a sale
 *
 * @param products - Array of products to allocate
 * @returns Results for each product
 */
export async function batchAllocateProducts(
  products: Array<{
    brand: string;
    name: string;
    size: string;
    quantity: number;
  }>
): Promise<{
  success: boolean;
  results: AllocationResult[];
  totalCost: number;
  errorMessages: string[];
}> {
  const results: AllocationResult[] = [];
  const errorMessages: string[] = [];
  let totalCost = 0;

  for (const product of products) {
    const result = await allocateProductFIFO(
      product.brand,
      product.name,
      product.size,
      product.quantity
    );

    results.push(result);

    if (!result.success) {
      errorMessages.push(result.errorMessage || 'Unknown error');
    } else {
      totalCost += result.totalCost;
    }
  }

  return {
    success: errorMessages.length === 0,
    results,
    totalCost,
    errorMessages,
  };
}
