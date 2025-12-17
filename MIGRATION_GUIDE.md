# Migration Guide: AsyncStorage to Supabase

## Overview

This guide covers migrating the Business Manager app from local AsyncStorage to cloud-based Supabase storage, enabling data sharing between multiple users (you and your cousin).

## What Changes

### Before (AsyncStorage)
- Data stored locally on each device
- No data sharing between users
- Fast but isolated

### After (Supabase)
- Data stored in cloud PostgreSQL database
- All authenticated users see the same data
- Requires internet but enables collaboration

## Step 1: Run Database Migrations

### A. Run Main Schema (if not already done)

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to SQL Editor
3. Run the contents of `supabase-schema.sql`

### B. Run FIFO Migration

1. In the same SQL Editor
2. Run the contents of `supabase-fifo-migration.sql`
3. This adds:
   - `sale_item_allocations` table (tracks which shipments were used)
   - `inventory_adjustments` table (manual inventory corrections)
   - Helper functions for FIFO allocation
   - Views for reporting

## Step 2: Data Model Changes

### Current Sale Model (AsyncStorage)
```typescript
{
  id: string;
  date: string;
  customerName: string;  // Direct string
  products: [{
    name: string;        // Direct values
    brand: string;
    quantity: number;
    unitCost: number;
    soldPrice: number;
  }];
  totalCost: number;
  totalRevenue: number;
  profit: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  amountPaid: number;
}
```

### New Sale Model (Supabase)
```typescript
{
  id: UUID;
  sale_date: date;
  customer_id: UUID;     // Foreign key reference
  shipment_id: UUID;     // Optional: for simple sales
  total_amount: decimal;
  amount_paid: decimal;
  outstanding_balance: decimal;
  payment_status: 'paid' | 'partial' | 'layaway';
  payment_method: string;
  notes: string;
  created_by: UUID;
}

// Sale items stored separately
sale_items: [{
  id: UUID;
  sale_id: UUID;
  product_id: UUID;      // Foreign key reference
  quantity: number;
  unit_price: decimal;
  line_total: decimal;
}]

// NEW: Allocation tracking
sale_item_allocations: [{
  sale_item_id: UUID;
  shipment_item_id: UUID;
  quantity: number;
  unit_cost: decimal;
}]
```

## Step 3: Store Migration Order

### 1. Products Store (First - foundation)
- Products must exist before creating sales
- Brand + Name + Size = unique product identifier
- Create `src/store/productsStore.ts`

### 2. Customers Store (Second - for sales)
- Customers referenced by sales
- Create `src/store/customersStore.ts`

### 3. Sales Store (Third - complex)
- Depends on products and customers
- Update `src/store/salesStore.ts` to use Supabase
- Handle sale_items and allocations

### 4. Shipments Store (Fourth - new feature)
- Create `src/store/shipmentsStore.ts`
- FIFO allocation logic
- Inventory tracking

## Step 4: Breaking Changes to Handle

### Products
**Before**: Products embedded in sales
**After**: Products stored separately, referenced by ID

**Migration needed**:
- Extract unique products from existing sales
- Create product records in Supabase
- Map old sales to new product IDs

### Customers
**Before**: Just a string name in sales
**After**: Full customer records with ID

**Migration needed**:
- Extract unique customer names
- Create customer records
- Map old sales to new customer IDs

### Payment Status
**Before**: 'paid' | 'pending' | 'partial'
**After**: 'paid' | 'partial' | 'layaway'

**Change**: 'pending' becomes 'layaway' or 'partial' depending on context

## Step 5: FIFO Allocation Changes

### Simple Sales (Backward Compatible)
For simple sales without shipment tracking:
```typescript
// Just create sale and sale_items as before
// No allocations needed
```

### FIFO Sales (New System)
For sales with shipment tracking:
```typescript
// 1. Get available inventory (FIFO sorted)
const inventory = await getAvailableInventory(brand, name, size);

// 2. Allocate from oldest first
const allocations = allocateFIFO(inventory, quantityNeeded);

// 3. Create sale + sale_items + sale_item_allocations
// 4. Update remaining_inventory in shipment_items
```

## Step 6: UI Changes Needed

### Minimal Changes
Most UI can stay the same! The main changes:

1. **Loading states**: Add loading indicators for Supabase queries
2. **Error handling**: Handle network errors gracefully
3. **Real-time updates**: Optional - can add real-time subscriptions later

### CreateSaleModal
- Add product search/selection (from Supabase products table)
- Add customer search/selection (from Supabase customers table)
- Keep same flow, just different data sources

## Step 7: Migration Process

### Option A: Clean Start (Recommended)
1. Deploy updated app with Supabase
2. Start fresh - no old data migration
3. Users enter new data from now on

**Pros**: Simple, clean, no migration bugs
**Cons**: Lose historical data

### Option B: Data Migration
1. Export data from AsyncStorage
2. Create migration script
3. Import into Supabase
4. Requires mapping products/customers

**Pros**: Keep historical data
**Cons**: Complex, time-consuming, error-prone

### Recommendation
If you have limited sales data, go with **Option A**. You can always manually enter important historical sales if needed.

## Step 8: Testing Checklist

After migration, test these scenarios with both accounts:

- [ ] Both users can sign in
- [ ] User A creates a product, User B can see it
- [ ] User A creates a sale, User B can see it
- [ ] User B creates a customer, User A can see it
- [ ] User A creates a shipment, User B can see it
- [ ] Sales from both users appear in same list
- [ ] Real-time updates work (or refresh to see changes)

## Step 9: Next Steps After Migration

Once everything is on Supabase:

1. **Build Shipment Tracking UI**
   - ShipmentsScreen
   - CreateShipmentModal
   - ShipmentDetailsScreen

2. **Implement FIFO Allocation**
   - Automatic allocation when creating sales
   - Inventory tracking
   - Cost calculation

3. **Add Reports**
   - Per-shipment performance
   - Product performance
   - Overall analytics

## Common Issues

### Issue: "No rows returned"
**Cause**: RLS policies blocking access
**Fix**: Check authentication and RLS policies in Supabase

### Issue: "Foreign key violation"
**Cause**: Trying to create sale before product exists
**Fix**: Create products first, then reference them

### Issue: "Data not syncing"
**Cause**: Still using AsyncStorage in some places
**Fix**: Ensure all stores use Supabase client

### Issue: "Slow performance"
**Cause**: Network latency
**Fix**: Add proper loading states, consider caching

## File Structure After Migration

```
src/
├── store/
│   ├── authStore.ts          (existing - uses Supabase)
│   ├── productsStore.ts      (NEW - Supabase)
│   ├── customersStore.ts     (NEW - Supabase)
│   ├── salesStore.ts         (UPDATED - Supabase)
│   ├── shipmentsStore.ts     (NEW - Supabase)
│   └── shipmentProductsStore.ts  (NEW - Supabase)
├── services/
│   ├── fifoAllocation.ts     (NEW - FIFO logic)
│   └── supabaseHelpers.ts    (NEW - common queries)
└── types/
    ├── index.ts              (existing)
    └── shipment.ts           (NEW - shipment types)
```

## Questions?

Before proceeding, ensure you understand:
1. Why we're migrating (data sharing)
2. What will change (data structure, queries)
3. What stays the same (most UI, user experience)
4. How to test (with both accounts)
