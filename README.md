# Business Manager App

A React Native mobile application for managing shipment-based small business operations, built with Expo, TypeScript, and Supabase.

## Features

- 📦 **Shipment Management** - Create and track shipments with costs and revenue
- 📋 **Inventory Tracking** - Monitor stock levels across shipments
- 💰 **Sales Recording** - Record sales with layaway/partial payment support
- 👥 **Customer Management** - Track customer purchases and balances
- 📊 **Reports & Analytics** - Dashboard with business metrics
- 🔐 **Authentication** - Secure login with Supabase Auth

## Tech Stack

- **Frontend**: React Native (Expo) with TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Forms**: react-hook-form
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (for testing)
- Supabase account (free tier works)

## Setup Instructions

### 1. Install Dependencies

```bash
cd business-manager
npm install
```

### 2. Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish setting up (~2 minutes)
3. Go to Project Settings > API
4. Copy your project URL and anon/public key

### 3. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and add your Supabase credentials
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Set Up Database Schema

Run this SQL in your Supabase SQL Editor (https://app.supabase.com/project/_/sql/new):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('owner', 'partner', 'admin')) DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  size TEXT,
  fragrance_notes TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shipments table
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_number TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('preparing', 'shipped', 'delivered', 'settled')) DEFAULT 'preparing',
  shipped_date DATE,
  delivered_date DATE,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  net_profit DECIMAL(10,2) DEFAULT 0,
  your_share DECIMAL(10,2) DEFAULT 0,
  partner_share DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shipment items table
CREATE TABLE shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  remaining_inventory INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  birthday DATE,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES shipments(id),
  customer_id UUID REFERENCES customers(id),
  sale_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  outstanding_balance DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('paid', 'partial', 'layaway')) DEFAULT 'paid',
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sale items table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (authenticated users can access their own data)
-- You can make these more restrictive based on your needs

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view products" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update products" ON products FOR UPDATE USING (auth.role() = 'authenticated');

-- Add similar policies for other tables...
CREATE POLICY "Authenticated users can access shipments" ON shipments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access shipment_items" ON shipment_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access customers" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access sales" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access sale_items" ON sale_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access payments" ON payments FOR ALL USING (auth.role() = 'authenticated');
```

## Running the App

### On Android

```bash
npm run android
```

### On iOS (Mac only)

```bash
npm run ios
```

### On Web

```bash
npm run web
```

### Using Expo Go (Recommended for Development)

1. Install Expo Go app on your phone:
   - Android: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Start the development server:
```bash
npm start
```

3. Scan the QR code with:
   - Android: Expo Go app
   - iOS: Camera app (it will open Expo Go)

## Project Structure

```
business-manager/
├── src/
│   ├── components/      # Reusable UI components
│   ├── screens/         # Screen components
│   │   ├── AuthScreen.tsx
│   │   ├── ShipmentsListScreen.tsx
│   │   ├── InventoryScreen.tsx
│   │   ├── SalesScreen.tsx
│   │   ├── CustomersScreen.tsx
│   │   └── DashboardScreen.tsx
│   ├── navigation/      # Navigation setup
│   │   └── TabNavigator.tsx
│   ├── services/        # API and business logic
│   ├── store/           # Zustand state management
│   │   └── authStore.ts
│   ├── types/           # TypeScript types
│   │   ├── index.ts
│   │   └── navigation.ts
│   ├── utils/           # Utility functions
│   └── config/          # Configuration files
│       └── supabase.ts
├── assets/              # Images, fonts, etc.
├── App.tsx             # Root component
├── package.json
└── tsconfig.json
```

## Development Workflow

### 1. Create a New Feature

```bash
# Create a new branch
git checkout -b feature/your-feature-name

# Make your changes
# Test on your device

# Commit and push
git add .
git commit -m "Add your feature"
git push origin feature/your-feature-name
```

### 2. Testing on Device

The app will automatically reload when you save files. If you encounter issues:

```bash
# Clear cache and restart
npm start -- --clear
```

### 3. Debugging

- Use `console.log()` for basic debugging
- Errors will show in the Expo Go app
- Check the terminal for build errors

## Next Steps

### Immediate (MVP)
- [ ] Complete Shipments module (create, detail, edit)
- [ ] Build Inventory tracking
- [ ] Implement Sales recording
- [ ] Add Customer management
- [ ] Create basic dashboard

### Phase 2
- [ ] Receipt generation
- [ ] Payment tracking
- [ ] Returns processing
- [ ] Enhanced reporting
- [ ] Low stock alerts

### Phase 3
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Offline support
- [ ] Push notifications
- [ ] Data export features

## Troubleshooting

### "Unable to resolve module"
```bash
npm install
npm start -- --clear
```

### Supabase connection issues
- Check your .env file has correct credentials
- Verify Supabase project is running
- Check Row Level Security policies

### Expo Go won't connect
- Ensure phone and computer are on same WiFi
- Try tunnel mode: `npm start -- --tunnel`
- Restart Expo Go app

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Supabase Documentation](https://supabase.com/docs)
- [React Navigation](https://reactnavigation.org/docs/getting-started)

## License

Private project - All rights reserved
