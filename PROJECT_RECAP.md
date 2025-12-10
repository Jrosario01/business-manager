# Business Manager App - Project Recap

## Project Overview
A React Native/Expo mobile business management application for a perfume wholesale/retail business operating between the US and Dominican Republic. The app tracks inventory, shipments, customers, and sales with a focus on Arabic perfume brands.

## Business Model
- **Shipment-based inventory**: Products are organized by shipments
- **50/50 profit split**: Business model between partners
- **Layaway support**: Customers can make partial payments
- **Geographic focus**: US-Dominican Republic operations
- **Primary products**: Arabic perfume brands (Lattafa, Armaf, Rasasi, Al Haramain, Afnan, etc.)

## Tech Stack
- **Framework**: React Native with Expo (SDK 54 → downgraded to SDK 52 for compatibility)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: React Native StyleSheet (NativeWind removed due to compatibility issues)
- **Navigation**: React Navigation Drawer
- **Development**: Web-first approach (npm run web) due to Expo Go connection issues

## Project Structure
```
business-manager/
├── src/
│   ├── components/
│   │   ├── AddCustomerModal.tsx
│   │   ├── AddProductModal.tsx
│   │   └── CreateShipmentModal.tsx
│   ├── navigation/
│   │   └── DrawerNavigator.tsx
│   ├── screens/
│   │   ├── AuthScreen.tsx
│   │   ├── CatalogScreen.tsx
│   │   ├── CustomersScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── InventoryScreen.tsx
│   │   ├── SalesScreen.tsx (placeholder)
│   │   └── ShipmentsListScreen.tsx (placeholder)
│   ├── services/
│   │   ├── dummyData.ts
│   │   └── supabase.ts
│   └── lib/
│       └── authStore.ts
├── supabase-schema.sql
└── .env
```

## Completed Features

### 1. Authentication
- Email/password login with Supabase
- Auth state management with Zustand
- Secure session handling
- Location: `src/screens/AuthScreen.tsx`, `src/lib/authStore.ts`

### 2. Navigation
- Drawer navigation (hamburger menu)
- Menu items: Inventory, Catalog, Customers, Shipments, Sales, Reports
- Custom drawer content with logout functionality
- Location: `src/navigation/DrawerNavigator.tsx`

### 3. Inventory Screen (COMPLETED)
**Features:**
- Shipment-based organization with sticky section headers
- Each shipment shows as a distinct blue-header section
- Product cards in 2-column grid within each shipment
- Search by brand or product name
- Filter by shipment status (All, Preparing, Shipped, Delivered)
- Real-time stats: product count, shipment count
- Stock indicators with color coding (red <30%, orange 30-70%, green >70%)
- "+ New Shipment" button

**Display Format:**
- Products shown as: "Product Name by Brand" (e.g., "Sauvage by Dior")
- Each card shows: brand, size, unit cost, quantity sold, remaining, total
- Visual stock bar with percentage

**Data Structure:**
- 79 dummy products across 3 shipments
- Products grouped by shipment with status badges
- Shipment statuses: preparing, shipped, delivered, settled

**Location:** `src/screens/InventoryScreen.tsx`

### 4. Create Shipment Modal (COMPLETED)
**Features:**
- Full-screen modal form
- Total shipping cost field (at top)
- Auto-calculated shipping per unit (total shipping ÷ total units)
- Add multiple products in one shipment
- Each product has:
  - Brand (text input)
  - Product Name (text input)
  - Size selector (chips: 30ml, 50ml, 75ml, 100ml, 150ml)
  - Unit Cost ($)
  - Shipping Cost ($ - read-only, auto-calculated)
  - Quantity
- Real-time cost calculations:
  - Product cost per item
  - Shipping cost per item
  - Product total (cost + shipping) × quantity
- Shipment summary with grand total
- Optional notes field
- Remove product button (requires minimum 1 product)
- Cancel without confirmation (just closes and resets)

**Auto-calculations:**
- Shipping per unit updates in real-time as quantities change
- Each product shows its allocated shipping cost
- Grand total = sum of all products + shipping

**Location:** `src/components/CreateShipmentModal.tsx`

### 5. Catalog Screen (COMPLETED)
**Features:**
- Master product database (wholesale price list)
- Products grouped by brand with section headers
- Search by brand or product name
- Stats bar showing total products and brands
- "+ Add Product" button

**Product Display:**
- Format: "Product Name by Brand" (e.g., "Asad by Lattafa")
- Shows: brand, product name, unit cost
- Optional product image (placeholder if none)
- Organized in brand sections

**Pre-loaded brands:**
- Lattafa (Asad, Bade Al Oud, Fakhar)
- Armaf (Club De Nuit Intense, Tres Nuit)
- Rasasi (Hawas, Fattan)
- Al Haramain (L'Aventure, Amber Oud)
- Afnan (Supremacy Silver, 9PM)

**Location:** `src/screens/CatalogScreen.tsx`

### 6. Add Product Modal (COMPLETED)
**Features:**
- Image upload FIRST (from device, not URL)
- Base64 image storage for preview
- Brand autocomplete with suggestions:
  - Pulls from existing brands in catalog
  - Shows pre-defined Arabic brands (Lattafa, Armaf, Rasasi, etc.)
  - "➕ Create new brand" option appears if brand doesn't exist
  - New brands automatically saved when product is created
- Simple product name text input (no autocomplete)
- Unit cost field
- Form validation

**Brand autocomplete logic:**
- Shows existing brands + suggested brands
- Filters as you type
- Click to select or create new
- Green badge shows "✓ Existing" for brands already in catalog

**Location:** `src/components/AddProductModal.tsx`

### 7. Customers Screen (COMPLETED)
**Features:**
- Customer list with avatar (initials)
- Phone number as primary identifier (no email)
- Search by name or phone
- Filter buttons: All, Owes Money, Has Wishlist
- Stats bar showing:
  - Total customers
  - Total owed (negative balance = customer owes us)
  - Customers with balance
- "+ Add Customer" button

**Customer Card Display:**
- Name and phone
- "OWES" badge if balance < 0
- Total purchases amount
- Balance owed (if applicable)
- Wishlist items count
- Wishlist products (if any)
- Last purchase date

**Dummy customers:**
- 4 customers with various balances and wishlists
- Dominican phone format: XXX-XXX-XXXX

**Location:** `src/screens/CustomersScreen.tsx`

### 8. Add Customer Modal (COMPLETED)
**Features:**
- Full name input
- Phone number with auto-formatting (XXX-XXX-XXXX)
- Wishlist with autocomplete from catalog
- Search catalog products in real-time
- Format: "Product Name by Brand"
- Click suggestion to add to wishlist
- Remove items from wishlist
- Info note about automatic balance tracking

**Wishlist autocomplete:**
- Pulls directly from catalog products
- Searches brand + name combined
- Prevents duplicate additions
- Shows "No products found" if search yields nothing
- Limits to 10 suggestions

**Location:** `src/components/AddCustomerModal.tsx`

## Database Schema (Supabase)
**Tables:**
- `users` - User authentication and profiles
- `shipments` - Shipment tracking with status
- `products` - Product master list (catalog)
- `shipment_items` - Products in each shipment with quantities/costs
- `customers` - Customer information with phone
- `sales` - Sales transactions
- `sale_items` - Line items for each sale
- `payments` - Payment tracking for layaway

**Relationships:**
- Shipments → Shipment Items → Products
- Sales → Sale Items → Products
- Sales → Customers
- Payments → Sales

**Location:** `supabase-schema.sql`

## Dummy Data
- **Products**: 79 perfumes across 15+ brands
- **Shipments**: 3 shipments (Preparing, Shipped, Delivered)
- **Customers**: 4 customers with balances and wishlists
- **Format**: All products display as "Name by Brand"

**Location:** `src/services/dummyData.ts`

## Known Issues & Workarounds

### Expo Go Connection Issues
**Problem:** "Failed to download remote update" on Android
**Root causes:**
- NativeWind v4 incompatibility with Expo SDK 54
- Version mismatch (Expo Go SDK 52 vs Project SDK 54)
- Invalid React Native components in TabNavigator
- PostCSS/Babel configuration conflicts

**Solution:** Develop on web (npm run web) instead of mobile
- Web works perfectly after fixing babel/NativeWind issues
- Mobile deployment deferred to later via `eas build` or Android emulator

### NativeWind Removed
**Reason:** Compatibility issues with Expo SDK
**Impact:** Using React Native StyleSheet instead
**Note:** All styling is now inline with StyleSheet.create()

### Tab Navigation → Drawer Navigation
**Change:** Switched from bottom tabs to hamburger drawer menu
**Reason:** Better organization for multiple screens
**Implementation:** Custom drawer with header and logout button

## Environment Configuration
```env
EXPO_PUBLIC_SUPABASE_URL=https://gfuczxlwhzinyfzcdwii.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[anon public key]
```

**Supabase Setup:**
- Project created and configured
- User authentication via dashboard (Auth > Users > Add user)
- 429 rate limit workaround: create users directly in dashboard
- Email confirmation toggle used for manual user creation

## Development Commands
```bash
# Start development server (web)
npm run web

# Start for mobile (currently not working)
npm run start

# Install dependencies
npm install

# Clear cache (if needed)
npx expo start -c
```

## Pending Features (Not Yet Implemented)
1. **Shipments Screen** - List all shipments, update status, view details
2. **Sales Screen** - Record sales, customer selection, payment tracking
3. **Reports/Dashboard** - Analytics, profit calculations, inventory reports
4. **Connect to Supabase** - Replace dummy data with real database calls
5. **Create/Edit functionality** - CRUD operations for all entities
6. **Mobile deployment** - Build APK or fix Expo Go issues

## Product Naming Convention
**Format:** "Product Name by Brand"
**Examples:**
- "Sauvage by Dior"
- "Asad by Lattafa"
- "Club De Nuit Intense by Armaf"

**Data structure:** Stored as `{ brand: 'Dior', name: 'Sauvage' }`
**Display logic:** Formatted on render as `${name} by ${brand}`

## Key Design Decisions
1. **Shipment-based inventory**: Products organized by when they arrived
2. **Web-first development**: Due to Expo Go issues
3. **Phone as customer ID**: No email requirement
4. **Auto-calculated shipping**: Divided evenly across all units
5. **Brand autocomplete with create**: Flexible catalog management
6. **Wishlist from catalog**: Ensures data consistency
7. **50/50 profit split**: Built into business logic (not yet implemented)

## Color Scheme
- **Primary Blue**: #007AFF (buttons, headers, active states)
- **Success Green**: #34C759 (add buttons, positive values)
- **Warning Orange**: #FFA500 (preparing status, medium stock)
- **Error Red**: #FF3B30 (owes badge, low stock, delete)
- **Gray**: #8E8E93 (settled status, disabled)
- **Background**: #f5f5f5 (main background)
- **Cards**: white with shadow/elevation

## Status Color Coding
- **Preparing**: Orange (#FFA500)
- **Shipped**: Blue (#007AFF)
- **Delivered**: Green (#34C759)
- **Settled**: Gray (#8E8E93)

## Stock Level Indicators
- **Critical** (<30%): Red
- **Warning** (30-70%): Orange
- **Good** (>70%): Green

## Next Steps for Development
1. Build Shipments list screen
2. Build Sales recording screen
3. Connect all screens to Supabase (replace dummy data)
4. Implement CRUD operations
5. Add profit calculation logic (50/50 split)
6. Implement layaway payment tracking
7. Build Reports/Dashboard with analytics
8. Address mobile deployment (APK build or fix Expo Go)

## Notes for New Development Session
- Project runs on `npm run web` (port 19006)
- All work currently uses dummy data
- Supabase is set up but not connected to UI yet
- Components are fully styled and functional
- Ready to implement database integration
- Mobile deployment is deferred but infrastructure is ready

## File Locations Reference
- Auth: `src/screens/AuthScreen.tsx`, `src/lib/authStore.ts`
- Navigation: `src/navigation/DrawerNavigator.tsx`
- Inventory: `src/screens/InventoryScreen.tsx`
- Catalog: `src/screens/CatalogScreen.tsx`
- Customers: `src/screens/CustomersScreen.tsx`
- Modals: `src/components/`
- Database: `supabase-schema.sql`
- Dummy Data: `src/services/dummyData.ts`
- Supabase Config: `src/services/supabase.ts`

## Contact/Business Context
- **Developer**: JP (full-stack developer, info security background)
- **Location**: New York, working in hospitality while job searching in tech
- **Business**: Perfume business with cousins in Dominican Republic
- **Focus**: Arabic perfume brands, primarily Lattafa, Armaf, Rasasi
- **Model**: Shipment-based, wholesale to retail, layaway support
