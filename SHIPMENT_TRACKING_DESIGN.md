# Shipment Tracking System - Design Specification

## Table of Contents
1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [Data Models](#data-models)
4. [Core Workflows](#core-workflows)
5. [FIFO Allocation Algorithm](#fifo-allocation-algorithm)
6. [UI Structure](#ui-structure)
7. [Implementation Phases](#implementation-phases)
8. [Edge Cases](#edge-cases)
9. [Examples](#examples)

---

## Overview

The shipment tracking system enables tracking of inventory and sales on a per-shipment basis. The system automatically allocates sales from the oldest shipments first (FIFO - First In, First Out) while maintaining accurate profit calculations per shipment.

### Key Features
- Track products by shipment with individual costs
- Automatic FIFO allocation when making sales
- Dual inventory views (consolidated and per-shipment)
- Per-shipment and overall profitability reports
- Manual inventory adjustments with reason tracking
- Cost editing with automatic profit recalculation

---

## Business Requirements

### 1. Automatic FIFO Allocation
- System automatically picks from oldest shipment first
- Example: 5 Dior Sauvage (2 from Shipment 1, 3 from Shipment 2)
  - When 2 are sold → deduct from Shipment 1
  - When 3rd is sold → start deducting from Shipment 2
- No manual shipment selection needed during sales

### 2. Dual Inventory Views
- **General View**: Total inventory across all shipments with breakdown
- **Per-Shipment View**: Individual shipment details with products and stats

### 3. Automatic Overflow
- If one shipment runs out, automatically use next available shipment
- No alerts, seamless continuation

### 4. Dual Reporting
- **Per-Shipment Reports**: Investment, revenue, profit, ROI for each shipment
- **Aggregate Reports**: Combined stats across all shipments

### 5. Product Management
- Add products to shipments from existing catalog OR
- Add new products that get saved to catalog automatically

### 6. Product Matching
- Exact match on: Brand + Name + Size
- Example: "Dior" + "Sauvage" + "100ml" = same product

### 7. Cost Updates
- Allow editing unit costs in shipments
- Automatically recalculate all affected sale profits

### 8. Inventory Adjustments
- Manual adjustment feature for corrections
- Track reason: Damaged, Sample, Gift, Count Correction
- Separate from sales tracking

### 9. No Low Stock Alerts
- Manual monitoring (small scale operation)

---

## Data Models

### 1. Shipment
```typescript
interface Shipment {
  id: string;
  name: string;                    // e.g., "Shipment #1", "January 2024 Shipment"
  date: string;                    // Date received (ISO format)
  additionalCosts: number;         // Shipping, customs, handling fees
  status: 'active' | 'completed'; // Active = has remaining stock
  notes: string;                   // Optional notes
  createdAt: string;              // Creation timestamp
}
```

**Storage Key**: `@shipments_database`

### 2. ShipmentProduct (Inventory Item)
```typescript
interface ShipmentProduct {
  id: string;
  shipmentId: string;              // Links to Shipment
  catalogProductId: string;        // Links to Product in catalog
  quantity: number;                // Original quantity received
  remainingQuantity: number;       // Current stock
  unitCost: number;                // Cost per unit for THIS shipment

  // Denormalized product info for quick access
  brand: string;
  name: string;
  size: string;
  image?: string;

  createdAt: string;
}
```

**Storage Key**: `@shipment_products_database`

**Notes**:
- Each shipment product is a unique inventory item
- Same catalog product can appear in multiple shipments with different costs
- `remainingQuantity` decreases with sales and adjustments

### 3. Modified Sale
```typescript
interface Sale {
  id: string;
  date: string;
  customerName: string;
  products: SaleProduct[];
  totalCost: number;               // Now calculated from actual shipment costs
  totalRevenue: number;
  profit: number;                  // Revenue - actual costs from shipments
  paymentStatus: 'paid' | 'pending' | 'partial';
  amountPaid: number;
}

interface SaleProduct {
  brand: string;
  name: string;
  size: string;
  quantity: number;
  soldPrice: number;               // Price per unit sold at

  // NEW: Shipment tracking
  shipmentAllocations: ShipmentAllocation[];
}

interface ShipmentAllocation {
  shipmentProductId: string;       // Which inventory item was used
  quantity: number;                // How many units from this shipment
  unitCost: number;                // Cost per unit (for profit calculation)
}
```

**Example**:
```javascript
// Sale of 5 Dior Sauvage
{
  products: [{
    brand: "Dior",
    name: "Sauvage",
    size: "100ml",
    quantity: 5,
    soldPrice: 65,
    shipmentAllocations: [
      { shipmentProductId: "sp_1", quantity: 2, unitCost: 45 },
      { shipmentProductId: "sp_2", quantity: 3, unitCost: 50 }
    ]
  }]
}
```

### 4. InventoryAdjustment
```typescript
interface InventoryAdjustment {
  id: string;
  shipmentProductId: string;       // Which inventory item was adjusted
  adjustmentType: 'add' | 'subtract';
  quantity: number;
  reason: string;                  // Damaged, Sample, Gift, Count Correction
  notes?: string;                  // Optional additional details
  date: string;
  createdAt: string;
}
```

**Storage Key**: `@inventory_adjustments_database`

**Use Cases**:
- Product damaged: subtract with reason "Damaged"
- Used as sample: subtract with reason "Sample"
- Gifted to customer: subtract with reason "Gift"
- Count correction: add or subtract with reason "Count Correction"

---

## Core Workflows

### Workflow 1: Creating a Shipment

**Step 1: Enter Shipment Information**
```
Input:
- Name/Number (e.g., "Shipment #1", "January 2024")
- Date Received
- Additional Costs (optional - shipping, customs, etc.)
- Notes (optional)
```

**Step 2: Add Products**

Two modes available:

**Mode A: Select from Existing Catalog**
```
1. Search/browse catalog products
2. Select product
3. Enter quantity received
4. Enter unit cost for this shipment
5. Repeat for all products
```

**Mode B: Add New Product**
```
1. Enter brand, name, size
2. Enter quantity received
3. Enter unit cost
4. Optional: Add product image
5. Product is added to catalog AND shipment
```

**Step 3: Review and Submit**
```
Display:
- All products added
- Total units
- Total investment (sum of product costs + additional costs)

On Submit:
1. Create Shipment record
2. Create ShipmentProduct records (one per product)
3. Add any new products to catalog
4. Navigate to Shipment Details screen
```

### Workflow 2: Making a Sale (FIFO Allocation)

**User Experience (NO CHANGE)**
```
1. Click "New Sale"
2. Select customer (existing or new)
3. Add products from catalog
4. Enter quantity and sale price per product
5. Enter payment details
6. Submit sale
```

**Behind the Scenes (NEW LOGIC)**
```javascript
For each product in the sale:

1. Identify Product
   - Match key: `${brand}_${name}_${size}`

2. Find Available Inventory
   - Query ShipmentProducts where:
     * brand, name, size match
     * remainingQuantity > 0
   - Sort by shipment.date ASC (oldest first)

3. Allocate Quantity (FIFO)
   allocations = []
   remainingToAllocate = quantityNeeded

   for each shipmentProduct in sortedInventory:
     if remainingToAllocate <= 0: break

     available = shipmentProduct.remainingQuantity
     toTake = min(available, remainingToAllocate)

     allocations.push({
       shipmentProductId: shipmentProduct.id,
       quantity: toTake,
       unitCost: shipmentProduct.unitCost
     })

     shipmentProduct.remainingQuantity -= toTake
     remainingToAllocate -= toTake

4. Validate
   - If remainingToAllocate > 0:
     * Alert: "Insufficient inventory for [product]"
     * Don't allow sale

5. Record Sale
   - Save sale with shipmentAllocations
   - Update all affected ShipmentProduct.remainingQuantity
   - Calculate actual profit using unitCosts from allocations
```

**Example Allocation**:
```
Inventory State:
- Shipment 1 (Jan 15): Dior Sauvage 100ml, 2 units @ $45
- Shipment 2 (Feb 1): Dior Sauvage 100ml, 3 units @ $50

Sale: 4× Dior Sauvage 100ml @ $65 each

FIFO Allocation:
1. Take 2 from Shipment 1 (depletes it)
2. Take 2 from Shipment 2 (leaves 1)

Result:
- Sale records: [
    {shipmentProductId: sp1, quantity: 2, unitCost: 45},
    {shipmentProductId: sp2, quantity: 2, unitCost: 50}
  ]
- Revenue: 4 × $65 = $260
- Cost: (2 × $45) + (2 × $50) = $190
- Profit: $260 - $190 = $70

Updated Inventory:
- Shipment 1: 0 remaining
- Shipment 2: 1 remaining
```

### Workflow 3: Viewing Inventory

**View Option 1: General/Consolidated View**

Groups products and shows total across all shipments.

```
Display Format:

📦 Dior Sauvage 100ml
   Total: 5 units
   Value: $235 (at cost)
   Breakdown:
     ├─ Shipment #1 (Jan 15): 2 units @ $45 each
     └─ Shipment #2 (Feb 1): 3 units @ $50 each

📦 Lattafa Qaed 100ml
   Total: 8 units
   Value: $160 (at cost)
   Breakdown:
     └─ Shipment #2 (Feb 1): 8 units @ $20 each

📦 Creed Aventus 100ml
   Total: 0 units
   Value: $0
   Status: Out of stock
```

**Features**:
- Search/filter products
- Sort by: Name, Total Quantity, Value
- Click product → see detailed breakdown
- Shows current inventory value

**View Option 2: Per-Shipment View**

Shows inventory organized by shipment.

```
Display Format:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Shipment #1 - January 2024
Date: Jan 15, 2024 • Active
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Investment: $550
  Products: $500
  Shipping: $50

Revenue: $650 (from 8 sales)
Profit: $100
ROI: 18.2%

Products (3):
• Dior Sauvage 100ml
  Original: 5 | Sold: 3 | Remaining: 2
  Cost: $45 each

• Creed Aventus 100ml
  Original: 3 | Sold: 3 | Remaining: 0
  Cost: $85 each

• Lattafa Qaed 100ml
  Original: 5 | Sold: 2 | Remaining: 3
  Cost: $20 each

[View Details] [View Sales]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Features**:
- Filter: All / Active / Completed shipments
- Sort by: Date, Investment, Profit, ROI
- Click shipment → Shipment Details screen

### Workflow 4: Shipment Details & Editing

**Shipment Details Screen**

```
Display:
1. Header
   - Shipment name
   - Date, Status badge
   - Edit info button

2. Financial Summary Card
   - Investment breakdown
   - Revenue to date
   - Profit
   - ROI percentage
   - Progress bar (sold vs remaining)

3. Products List
   Each product card shows:
   - Product image, name
   - Original qty | Sold | Remaining
   - Unit cost (editable)
   - Revenue generated
   - Actions: Edit Cost, Adjust Inventory

4. Sales History
   - List of sales that used this shipment
   - Click to view sale details

5. Adjustment History (if any)
   - List of manual adjustments made
   - Shows reason and quantity
```

**Editing Unit Cost**:
```
1. User clicks "Edit Cost" on a product
2. Modal shows:
   - Current cost: $45
   - New cost: [input field]
   - Warning: "This will recalculate profit for X sales"
3. User enters new cost and confirms
4. System:
   a. Updates ShipmentProduct.unitCost
   b. Finds all Sales using this shipmentProductId
   c. Recalculates profit for each sale
   d. Updates Sale records
   e. Recalculates shipment totals
   f. Shows success: "Updated cost and recalculated 5 sales"
```

**Manual Inventory Adjustment**:
```
1. User clicks "Adjust Inventory" on a product
2. Modal shows:
   - Current quantity: 5
   - Adjustment: ( ) Add ( ) Subtract
   - Quantity: [input field]
   - Reason: [dropdown]
     * Damaged
     * Sample
     * Gift
     * Count Correction
   - Notes: [optional text area]
3. User fills and confirms
4. System:
   a. Creates InventoryAdjustment record
   b. Updates ShipmentProduct.remainingQuantity
   c. Updates shipment totals
   d. Shows in adjustment history
```

### Workflow 5: Reports & Analytics

**Overall Dashboard**
```
All-Time Stats:
├─ Total Investment: $15,450
├─ Total Revenue: $22,340
├─ Total Profit: $6,890
└─ Average ROI: 44.6%

Active Shipments: 3
Completed Shipments: 7

Current Inventory Value: $3,200 (at cost)

Top Products by Revenue:
1. Dior Sauvage 100ml - $4,520
2. Creed Aventus 100ml - $3,890
3. Lattafa Qaed 100ml - $2,340
```

**Per-Shipment Comparison**
```
Shipment Performance Table:

Name          Date      Investment  Revenue  Profit   ROI
───────────────────────────────────────────────────────
Shipment #1   Jan 15    $550       $650     $100     18%
Shipment #2   Feb 1     $1,200     $1,680   $480     40%
Shipment #3   Feb 20    $890       $1,120   $230     26%
```

---

## FIFO Allocation Algorithm

### Detailed Implementation

```typescript
interface AllocationResult {
  allocations: ShipmentAllocation[];
  totalCost: number;
  success: boolean;
  errorMessage?: string;
}

function allocateProductFIFO(
  brand: string,
  name: string,
  size: string,
  quantityNeeded: number,
  shipmentProducts: ShipmentProduct[]
): AllocationResult {

  // Step 1: Filter matching products with stock
  const matchingProducts = shipmentProducts.filter(sp =>
    sp.brand === brand &&
    sp.name === name &&
    sp.size === size &&
    sp.remainingQuantity > 0
  );

  // Step 2: Sort by shipment date (FIFO)
  const sortedProducts = matchingProducts.sort((a, b) => {
    const shipmentA = getShipment(a.shipmentId);
    const shipmentB = getShipment(b.shipmentId);
    return new Date(shipmentA.date) - new Date(shipmentB.date);
  });

  // Step 3: Allocate from oldest first
  const allocations: ShipmentAllocation[] = [];
  let remainingToAllocate = quantityNeeded;
  let totalCost = 0;

  for (const sp of sortedProducts) {
    if (remainingToAllocate <= 0) break;

    const available = sp.remainingQuantity;
    const toTake = Math.min(available, remainingToAllocate);

    allocations.push({
      shipmentProductId: sp.id,
      quantity: toTake,
      unitCost: sp.unitCost
    });

    totalCost += toTake * sp.unitCost;
    remainingToAllocate -= toTake;
  }

  // Step 4: Validate complete allocation
  if (remainingToAllocate > 0) {
    return {
      allocations: [],
      totalCost: 0,
      success: false,
      errorMessage: `Insufficient inventory. Need ${quantityNeeded}, only ${quantityNeeded - remainingToAllocate} available.`
    };
  }

  return {
    allocations,
    totalCost,
    success: true
  };
}
```

### Edge Cases in Allocation

**Case 1: Exact Match**
```
Need: 5 units
Have: Shipment A with 5 units
Result: Take all 5 from Shipment A
```

**Case 2: Split Across Two Shipments**
```
Need: 5 units
Have: Shipment A (Jan 15) with 2 units
      Shipment B (Feb 1) with 3 units
Result: Take 2 from A, 3 from B
```

**Case 3: Split Across Three+ Shipments**
```
Need: 10 units
Have: Shipment A (Jan 15) with 3 units
      Shipment B (Feb 1) with 4 units
      Shipment C (Feb 20) with 5 units
Result: Take 3 from A, 4 from B, 3 from C
```

**Case 4: Insufficient Inventory**
```
Need: 10 units
Have: Shipment A with 3 units
      Shipment B with 4 units
Total: 7 units
Result: ERROR - Block sale, show message
```

**Case 5: Zero Inventory**
```
Need: 1 unit
Have: No shipments with stock
Result: ERROR - "No inventory available"
```

---

## UI Structure

### Screen Hierarchy

```
App
├── Sales Screen (modified)
│   └── Create Sale Modal (modified - uses FIFO)
│
├── Customers Screen (existing)
│
├── Catalog Screen (modified)
│   ├── Shows total inventory from all shipments
│   └── Click product → Inventory breakdown
│
├── Inventory Screen (modified)
│   ├── Toggle: General View / Per-Shipment View
│   ├── General View → Product list with shipment breakdown
│   └── Per-Shipment View → Shipment list
│
├── Shipments Screen (NEW)
│   ├── List all shipments with stats
│   ├── Filter: All / Active / Completed
│   ├── Create Shipment button
│   └── Click shipment → Shipment Details
│
├── Create Shipment Flow (NEW)
│   ├── Step 1: Shipment Info
│   ├── Step 2: Add Products
│   │   ├── Select from Catalog
│   │   └── Add New Product
│   └── Step 3: Review & Submit
│
├── Shipment Details Screen (NEW)
│   ├── Financial summary
│   ├── Products list
│   │   ├── Edit cost
│   │   └── Adjust inventory
│   ├── Sales history
│   └── Adjustment history
│
└── Reports Screen (NEW/Enhanced)
    ├── Overall Dashboard
    ├── Shipment Comparison
    └── Product Performance
```

### New Components Needed

**1. CreateShipmentModal**
- Multi-step modal for creating shipments
- Step 1: Info form
- Step 2: Product selection/addition
- Step 3: Review

**2. ShipmentCard**
- Display shipment summary in list
- Shows: Name, date, investment, profit, ROI
- Status badge

**3. ShipmentProductCard**
- Shows product in shipment context
- Displays: Quantities, cost, revenue
- Actions: Edit, Adjust

**4. InventoryAdjustmentModal**
- Form for adjusting inventory
- Add/subtract toggle
- Reason dropdown
- Notes field

**5. EditCostModal**
- Simple form to update unit cost
- Warning about recalculation
- Confirmation

**6. InventoryBreakdownCard**
- Shows product inventory across shipments
- Expandable/collapsible

### Modified Components

**1. CreateSaleModal**
- No UI changes
- Backend integration with FIFO allocation
- Show error if insufficient inventory

**2. CatalogScreen**
- Add inventory counts from shipments
- Show "X units available"

**3. InventoryScreen**
- Add view toggle
- Implement dual view modes

---

## Implementation Phases

### Phase 1: Foundation (Core Infrastructure)

**Goals**:
- Set up data structures
- Implement FIFO algorithm
- Create shipment store

**Tasks**:
1. Create `shipmentsStore.ts`
   - State management for shipments
   - CRUD operations
   - AsyncStorage persistence

2. Create `shipmentProductsStore.ts`
   - State management for inventory items
   - CRUD operations
   - AsyncStorage persistence

3. Create `inventoryAdjustmentsStore.ts`
   - Track manual adjustments
   - AsyncStorage persistence

4. Implement FIFO allocation function
   - `allocateProductFIFO()`
   - Unit tests for edge cases

5. Update `salesStore.ts`
   - Add shipmentAllocations to Sale model
   - Modify addSale to use FIFO
   - Update remainingQuantity after sales

**Deliverables**:
- Working stores with persistence
- FIFO algorithm tested and verified
- Sales integrated with shipment allocation

**Estimated Effort**: Foundation for entire system

---

### Phase 2: Shipment Management

**Goals**:
- Create shipment UI
- Enable adding shipments
- View shipment details

**Tasks**:
1. Create ShipmentsScreen
   - List all shipments
   - Stats summary
   - Filter active/completed
   - Create button

2. Build CreateShipmentModal
   - Multi-step form
   - Step 1: Shipment info
   - Step 2: Add products (from catalog + new)
   - Step 3: Review

3. Create ShipmentDetailsScreen
   - Financial summary
   - Products list
   - Sales using this shipment
   - Edit/delete functionality

4. Build ShipmentCard component
   - Summary display
   - Status badge
   - Click to details

5. Build ShipmentProductCard component
   - Product display in shipment context
   - Quantity tracking
   - Cost display

**Deliverables**:
- Full shipment creation flow
- Shipment list and details screens
- Can add products from catalog
- Can add new products

**Estimated Effort**: Core shipment management

---

### Phase 3: Sales Integration

**Goals**:
- Integrate sales with FIFO
- Test allocation scenarios
- Handle errors gracefully

**Tasks**:
1. Modify CreateSaleModal
   - Integrate FIFO allocation
   - Show inventory availability
   - Handle insufficient stock errors
   - Multi-shipment allocation display

2. Update SalesScreen
   - Show which shipments were used in sale details
   - Display allocation breakdown

3. Test allocation scenarios
   - Single shipment
   - Multiple shipments
   - Insufficient inventory
   - Exact matches

4. Error handling
   - Graceful messages
   - Prevent invalid sales
   - Rollback on failures

**Deliverables**:
- Sales fully integrated with shipments
- Automatic FIFO working
- Proper error handling
- Can view allocation details

**Estimated Effort**: Critical integration

---

### Phase 4: Inventory Views

**Goals**:
- Dual inventory views
- General consolidated view
- Per-shipment view

**Tasks**:
1. Modify InventoryScreen
   - Add view toggle
   - General view implementation
   - Per-shipment view implementation

2. Build InventoryBreakdownCard
   - Shows product across shipments
   - Expandable details
   - Visual grouping

3. Enhance CatalogScreen
   - Show inventory counts
   - Link to inventory breakdown
   - Availability indicators

4. Product matching
   - Ensure exact matching works
   - Test with various products

**Deliverables**:
- Working dual inventory views
- Can see total and breakdown
- Catalog shows availability

**Estimated Effort**: UI-focused phase

---

### Phase 5: Advanced Features

**Goals**:
- Cost editing with recalculation
- Inventory adjustments
- Reports and analytics

**Tasks**:
1. Build EditCostModal
   - Cost editing form
   - Warning display
   - Confirmation

2. Implement cost recalculation
   - Find affected sales
   - Recalculate profits
   - Update all records
   - Transaction handling

3. Build InventoryAdjustmentModal
   - Add/subtract toggle
   - Reason selection
   - Notes field

4. Implement adjustment logic
   - Update quantities
   - Create adjustment records
   - Update shipment totals

5. Create ReportsScreen
   - Overall dashboard
   - Per-shipment comparison
   - Product performance
   - Charts/graphs (optional)

6. Build report components
   - Stats cards
   - Comparison tables
   - Visual indicators

**Deliverables**:
- Can edit costs and recalculate
- Manual adjustment system
- Comprehensive reports
- Analytics dashboard

**Estimated Effort**: Advanced functionality

---

### Phase 6: Polish & Testing

**Goals**:
- Bug fixes
- Performance optimization
- User experience improvements

**Tasks**:
1. Comprehensive testing
   - Test all allocation scenarios
   - Test edge cases
   - Test data integrity

2. Performance optimization
   - Optimize queries
   - Reduce re-renders
   - Lazy loading

3. UI polish
   - Consistent styling
   - Loading states
   - Empty states
   - Error states

4. Documentation
   - Code comments
   - User guide (if needed)

5. Data migration helpers
   - Tools to help migrate paper records
   - Bulk import (if needed)

**Deliverables**:
- Stable, polished system
- Good performance
- Quality user experience

**Estimated Effort**: Quality assurance

---

## Edge Cases

### 1. Sale Spans Multiple Shipments

**Scenario**:
- Customer buys 5 units of Dior Sauvage
- Shipment A has 2 units
- Shipment B has 3 units

**Handling**:
- Automatically split: 2 from A + 3 from B
- Record both allocations
- Calculate profit using respective costs
- Update both shipment quantities

**Implementation**:
```javascript
sale.products[0].shipmentAllocations = [
  { shipmentProductId: "spA_1", quantity: 2, unitCost: 45 },
  { shipmentProductId: "spB_1", quantity: 3, unitCost: 50 }
]

profit = (5 × soldPrice) - (2 × 45 + 3 × 50)
```

### 2. Product Not in Any Shipment

**Scenario**:
- User tries to sell product
- Product exists in catalog
- But no shipments have inventory

**Handling**:
- FIFO allocation returns error
- Show alert: "No inventory available for [product name]"
- Don't allow sale to proceed
- Suggest adding shipment or removing product from sale

### 3. Insufficient Inventory

**Scenario**:
- Customer wants 10 units
- Total available: 7 units (3 in Ship A, 4 in Ship B)

**Handling**:
- FIFO allocation detects shortfall
- Show alert: "Insufficient inventory. Need 10, only 7 available."
- Don't allow sale
- Show breakdown: "3 in Shipment #1, 4 in Shipment #2"

### 4. Cost Editing Ripple Effect

**Scenario**:
- Shipment product cost was $45
- 5 sales used this product
- User edits cost to $50

**Handling**:
```
1. Warn user: "This will recalculate profit for 5 sales"
2. User confirms
3. Update ShipmentProduct.unitCost = 50
4. For each sale using this shipmentProductId:
   - Find allocation with matching shipmentProductId
   - Update unitCost in allocation
   - Recalculate sale.totalCost
   - Recalculate sale.profit
   - Save updated sale
5. Recalculate shipment totals
6. Show success: "Updated cost and recalculated 5 sales"
```

### 5. Inventory Adjustments

**Scenario**:
- 3 units damaged
- Need to adjust inventory down

**Handling**:
```
1. User opens shipment product
2. Clicks "Adjust Inventory"
3. Selects "Subtract", enters "3", reason "Damaged"
4. System:
   - Creates InventoryAdjustment record
   - Updates remainingQuantity: 10 → 7
   - Doesn't create sale record
   - Shows in adjustment history
5. Future sales will see 7 available, not 10
```

### 6. Shipment Status Management

**Scenario**:
- When to mark shipment as "completed"?

**Option A - Automatic**:
- When all products have remainingQuantity = 0
- Automatically mark as completed
- Can manually reopen if needed

**Option B - Manual**:
- User manually marks as completed
- Even if stock remains

**Recommendation**: Automatic with manual override

### 7. Zero-Cost Products

**Scenario**:
- Product received as gift/promotion
- Unit cost = $0

**Handling**:
- Allow $0 unit cost
- Profit = full sale price
- Track normally in shipment

### 8. Negative Inventory (Should Not Happen)

**Scenario**:
- Bug or data corruption causes negative quantity

**Prevention**:
```typescript
// Before allocating
if (remainingQuantity < quantityNeeded) {
  throw new Error("Insufficient inventory");
}

// After updating
if (newRemainingQuantity < 0) {
  throw new Error("Quantity cannot be negative");
  // Rollback transaction
}
```

### 9. Shipment Deletion

**Scenario**:
- User wants to delete shipment
- But sales have used products from it

**Handling**:
- Option A: Don't allow deletion if sales exist
  - Show error: "Cannot delete. 5 sales use this shipment."
- Option B: Allow with warning
  - "This will affect 5 sales. Continue?"
  - Keep shipment data but mark as deleted
  - Sales still reference it

**Recommendation**: Don't allow deletion (Option A)

### 10. Duplicate Product Entry

**Scenario**:
- Adding to shipment
- Same product added twice in one form

**Handling**:
- Detect duplicate during submission
- Show warning: "Dior Sauvage 100ml already added"
- Offer to merge or keep separate

### 11. Product Matching Edge Cases

**Scenario**:
- "Dior Sauvage" vs "Dior Sauvage EDT"
- Same product or different?

**Handling**:
- Exact match only: Brand + Name + Size
- "Dior Sauvage 100ml" ≠ "Dior Sauvage EDT 100ml"
- User must ensure consistency
- Case-insensitive matching optional

### 12. Historical Data Migration

**Scenario**:
- Existing sales before shipment system
- How to handle?

**Options**:
1. Create default "Legacy Shipment"
   - Estimate costs
   - Allocate all old sales to it

2. Leave old sales as-is
   - New sales use shipments
   - Old sales don't have allocations
   - Reports separate old/new

3. Manual entry of past shipments
   - User enters historical shipments
   - Manually allocate old sales

**Recommendation**: Option 2 (cleanest break)

---

## Examples

### Example 1: Complete Shipment Flow

**Creating Shipment**:
```
Step 1 - Shipment Info:
Name: "February 2024 Shipment"
Date: Feb 1, 2024
Additional Costs: $75 (shipping)
Notes: "Supplier: ABC Perfumes"

Step 2 - Add Products:

From Catalog:
1. Dior Sauvage 100ml
   Quantity: 5 units
   Unit Cost: $45

2. Creed Aventus 100ml
   Quantity: 3 units
   Unit Cost: $85

New Product:
3. Lattafa Qaed 100ml (new to catalog)
   Quantity: 10 units
   Unit Cost: $20
   Image: [uploaded]

Step 3 - Review:
Total Products: 3
Total Units: 18
Product Costs: (5×45) + (3×85) + (10×20) = $680
Additional Costs: $75
Total Investment: $755

[Submit]
```

**Result**:
- Shipment created with ID: ship_001
- 3 ShipmentProducts created:
  - sp_001: Dior Sauvage, 5 units, $45 each
  - sp_002: Creed Aventus, 3 units, $85 each
  - sp_003: Lattafa Qaed, 10 units, $20 each
- Lattafa Qaed added to catalog
- All remainingQuantity = quantity initially

### Example 2: Sale with FIFO Allocation

**Inventory State**:
```
Dior Sauvage 100ml:
- Shipment #1 (Jan 15): 2 units @ $45
- Shipment #2 (Feb 1): 5 units @ $45
Total: 7 units
```

**Sale**:
```
Customer: Maria Rodriguez
Date: Feb 10, 2024
Product: Dior Sauvage 100ml
Quantity: 4 units
Sale Price: $65 per unit
Payment: Full ($260)
```

**FIFO Allocation Process**:
```
1. Find matching inventory:
   - sp_001 (Ship #1, Jan 15): 2 units @ $45
   - sp_004 (Ship #2, Feb 1): 5 units @ $45

2. Allocate oldest first:
   - Take 2 from sp_001 (depletes Shipment #1)
   - Take 2 from sp_004 (leaves 3 in Shipment #2)

3. Create sale record:
   sale_001 = {
     customer: "Maria Rodriguez",
     date: "2024-02-10",
     products: [{
       brand: "Dior",
       name: "Sauvage",
       size: "100ml",
       quantity: 4,
       soldPrice: 65,
       shipmentAllocations: [
         { shipmentProductId: "sp_001", quantity: 2, unitCost: 45 },
         { shipmentProductId: "sp_004", quantity: 2, unitCost: 45 }
       ]
     }],
     totalCost: (2×45) + (2×45) = 180,
     totalRevenue: 4×65 = 260,
     profit: 260 - 180 = 80,
     paymentStatus: "paid",
     amountPaid: 260
   }

4. Update inventory:
   - sp_001.remainingQuantity: 2 → 0
   - sp_004.remainingQuantity: 5 → 3
```

**Updated Inventory**:
```
Dior Sauvage 100ml:
- Shipment #1 (Jan 15): 0 units @ $45 (sold out)
- Shipment #2 (Feb 1): 3 units @ $45
Total: 3 units
```

### Example 3: Cost Edit with Recalculation

**Initial State**:
```
Shipment #1:
- Product: Lattafa Qaed 100ml
- Unit Cost: $20
- Used in 3 sales:
  - sale_001: 2 units
  - sale_002: 3 units
  - sale_003: 1 unit
```

**User Action**:
```
User edits cost from $20 to $22
```

**Recalculation**:
```
1. Update shipment product:
   sp_003.unitCost: 20 → 22

2. Find affected sales (3 found)

3. For sale_001:
   Old: cost = 2×20 = $40, profit = $130 - $40 = $90
   New: cost = 2×22 = $44, profit = $130 - $44 = $86
   Update allocation: unitCost = 22
   Update sale: totalCost, profit

4. For sale_002:
   Old: cost = 3×20 = $60, profit = $195 - $60 = $135
   New: cost = 3×22 = $66, profit = $195 - $66 = $129
   Update allocation: unitCost = 22
   Update sale: totalCost, profit

5. For sale_003:
   Old: cost = 1×20 = $20, profit = $65 - $20 = $45
   New: cost = 1×22 = $22, profit = $65 - $22 = $43
   Update allocation: unitCost = 22
   Update sale: totalCost, profit

6. Recalculate Shipment #1 totals:
   Revenue: unchanged
   Cost: (6 units × $22) + additional costs
   Profit: adjusted

7. Show message:
   "Cost updated to $22. Recalculated 3 sales."
```

### Example 4: Inventory Adjustment

**Scenario**:
```
Shipment #2 - Creed Aventus 100ml
Current: 5 units remaining
Issue: 2 bottles discovered damaged
```

**Adjustment**:
```
1. User opens sp_005 (Creed Aventus in Ship #2)

2. Clicks "Adjust Inventory"

3. Fills form:
   Adjustment Type: Subtract
   Quantity: 2
   Reason: Damaged
   Notes: "Leaked during storage, caps broken"

4. Submits

5. System creates:
   adjustment_001 = {
     id: "adj_001",
     shipmentProductId: "sp_005",
     adjustmentType: "subtract",
     quantity: 2,
     reason: "Damaged",
     notes: "Leaked during storage, caps broken",
     date: "2024-02-15",
     createdAt: "2024-02-15T10:30:00Z"
   }

6. Updates inventory:
   sp_005.remainingQuantity: 5 → 3

7. Shows in adjustment history:
   "Feb 15: Subtracted 2 units - Damaged
   (Leaked during storage, caps broken)"
```

**Impact**:
```
Future sales:
- Only 3 units available now (not 5)
- FIFO will allocate from these 3

Shipment totals:
- Investment: unchanged (still paid for 5)
- Expected revenue: reduced
- Actual revenue: from 3 units sold
```

### Example 5: Multi-Shipment Report

**Shipment Comparison**:
```
┌─────────────┬────────────┬────────────┬─────────┬────────┬──────┐
│ Shipment    │ Date       │ Investment │ Revenue │ Profit │ ROI  │
├─────────────┼────────────┼────────────┼─────────┼────────┼──────┤
│ Shipment #1 │ Jan 15 '24 │ $550       │ $735    │ $185   │ 34%  │
│ Shipment #2 │ Feb 1 '24  │ $755       │ $980    │ $225   │ 30%  │
│ Shipment #3 │ Feb 20 '24 │ $620       │ $412    │ -$208  │ -34% │
├─────────────┼────────────┼────────────┼─────────┼────────┼──────┤
│ TOTAL       │            │ $1,925     │ $2,127  │ $202   │ 10%  │
└─────────────┴────────────┴────────────┴─────────┴────────┴──────┘

Notes:
- Shipment #1: Completed (all sold)
- Shipment #2: Active (3 products remaining)
- Shipment #3: Active, slow moving (needs attention)

Top Performers:
1. Dior Sauvage 100ml: $520 revenue, $180 profit
2. Lattafa Qaed 100ml: $450 revenue, $210 profit
3. Creed Aventus 100ml: $340 revenue, $85 profit
```

---

## Technical Notes

### Data Consistency
- All updates within shipment allocation must be atomic
- If allocation fails, rollback all changes
- Use transactions where possible

### Performance Considerations
- Index shipmentProducts by (brand, name, size) for fast queries
- Cache shipment totals, recalculate on changes
- Lazy load sales history in shipment details

### Storage Keys
```
@shipments_database
@shipment_products_database
@inventory_adjustments_database
@sales_database (existing, modified)
@products_database (existing, unchanged)
@customers_database (existing, unchanged)
```

### State Management
- Use Zustand for all stores
- AsyncStorage for persistence
- Keep stores independent when possible
- FIFO allocation can be utility function

---

## Future Enhancements (Not in Initial Scope)

1. **Bulk Import**
   - CSV import for shipments
   - Migrate paper records faster

2. **Low Stock Alerts**
   - Per-product thresholds
   - Notifications

3. **Supplier Management**
   - Track suppliers
   - Link shipments to suppliers
   - Supplier performance

4. **Expected vs Actual**
   - Track expected delivery dates
   - Compare expected vs actual costs

5. **Barcode Scanning**
   - Scan products when receiving shipment
   - Scan during sales

6. **Advanced Reports**
   - Time-series profit trends
   - Seasonal analysis
   - Customer purchase patterns by shipment

7. **Multi-Currency**
   - Support different currencies
   - Exchange rate tracking

8. **Return/Exchange Handling**
   - Reverse allocations
   - Return to shipment stock

---

## Questions & Decisions Log

### Decisions Made:
1. ✅ FIFO allocation (automatic, oldest first)
2. ✅ Both general and per-shipment inventory views
3. ✅ Auto overflow to next shipment
4. ✅ Dual reporting (per-shipment and aggregate)
5. ✅ Both catalog selection and new product addition
6. ✅ Exact match on brand+name+size
7. ✅ Allow cost editing with recalculation
8. ✅ Add inventory adjustment feature
9. ✅ No low stock alerts (manual monitoring)

### Questions to Revisit:
- Shipment deletion policy?
- Historical sales handling?
- Automatic shipment completion threshold?

---

## Glossary

**Shipment**: A batch of products received at a specific date with associated costs

**ShipmentProduct**: An individual product within a shipment, tracking quantity and cost

**FIFO**: First In, First Out - allocation method that uses oldest inventory first

**Allocation**: The assignment of sale quantities to specific shipment products

**Remaining Quantity**: Current stock available for a shipment product

**Unit Cost**: Cost per unit for a specific product in a specific shipment

**Inventory Adjustment**: Manual correction to inventory quantity with tracked reason

**Shipment Status**:
- Active: Has remaining stock available
- Completed: All products sold or depleted

**ROI**: Return on Investment - (Profit / Investment) × 100%

---

## Document Info

**Version**: 1.0
**Created**: 2024
**Last Updated**: 2024
**Status**: Design Specification - Ready for Implementation
