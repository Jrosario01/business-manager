-- =====================================================
-- DEMO TABLES SETUP SCRIPT
-- Run this in Supabase SQL Editor
-- =====================================================

-- This script creates separate demo tables for the demo account
-- Demo users interact ONLY with demo_* tables
-- Real users interact ONLY with production tables
-- This ensures 100% safety - demo data cannot affect real data

-- =====================================================
-- 1. CREATE DEMO TABLES
-- =====================================================

-- Demo Products Table
CREATE TABLE IF NOT EXISTS demo_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  size TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  sale_price NUMERIC,
  description TEXT,
  fragrance_notes TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo Customers Table
CREATE TABLE IF NOT EXISTS demo_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  birthday DATE,
  notes TEXT,
  tags TEXT[],
  wishlist TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo Shipments Table
CREATE TABLE IF NOT EXISTS demo_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_number TEXT NOT NULL,
  status TEXT DEFAULT 'preparing' CHECK (status IN ('preparing', 'shipped', 'delivered', 'settled')),
  shipped_date TIMESTAMP WITH TIME ZONE,
  delivered_date TIMESTAMP WITH TIME ZONE,
  shipping_cost NUMERIC DEFAULT 0,
  additional_costs NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  your_share NUMERIC DEFAULT 0,
  partner_share NUMERIC DEFAULT 0,
  exchange_rate_used NUMERIC NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo Shipment Items Table
CREATE TABLE IF NOT EXISTS demo_shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES demo_shipments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES demo_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC NOT NULL,
  remaining_inventory INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo Sales Table
CREATE TABLE IF NOT EXISTS demo_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES demo_customers(id) ON DELETE SET NULL,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  outstanding_balance NUMERIC DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('paid', 'partial', 'layaway')),
  payment_method TEXT,
  notes TEXT,
  currency TEXT DEFAULT 'DOP',
  exchange_rate_used NUMERIC,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo Sale Items Table
CREATE TABLE IF NOT EXISTS demo_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID REFERENCES demo_sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES demo_products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  line_total NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Demo Sale Item Allocations Table
CREATE TABLE IF NOT EXISTS demo_sale_item_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_item_id UUID REFERENCES demo_sale_items(id) ON DELETE CASCADE,
  shipment_item_id UUID REFERENCES demo_shipment_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_demo_products_brand ON demo_products(brand);
CREATE INDEX IF NOT EXISTS idx_demo_products_active ON demo_products(active);
CREATE INDEX IF NOT EXISTS idx_demo_customers_name ON demo_customers(name);
CREATE INDEX IF NOT EXISTS idx_demo_shipments_status ON demo_shipments(status);
CREATE INDEX IF NOT EXISTS idx_demo_shipment_items_shipment ON demo_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_demo_shipment_items_product ON demo_shipment_items(product_id);
CREATE INDEX IF NOT EXISTS idx_demo_sales_customer ON demo_sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_demo_sales_date ON demo_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_demo_sale_items_sale ON demo_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_demo_sale_items_product ON demo_sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_demo_allocations_sale_item ON demo_sale_item_allocations(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_demo_allocations_shipment_item ON demo_sale_item_allocations(shipment_item_id);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE demo_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_sale_item_allocations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Allow all authenticated users to do everything with demo tables
-- (In production, you might want to restrict this to specific demo users)

-- Demo Products Policies
DROP POLICY IF EXISTS "Allow all for demo_products" ON demo_products;
CREATE POLICY "Allow all for demo_products" ON demo_products
  FOR ALL USING (auth.role() = 'authenticated');

-- Demo Customers Policies
DROP POLICY IF EXISTS "Allow all for demo_customers" ON demo_customers;
CREATE POLICY "Allow all for demo_customers" ON demo_customers
  FOR ALL USING (auth.role() = 'authenticated');

-- Demo Shipments Policies
DROP POLICY IF EXISTS "Allow all for demo_shipments" ON demo_shipments;
CREATE POLICY "Allow all for demo_shipments" ON demo_shipments
  FOR ALL USING (auth.role() = 'authenticated');

-- Demo Shipment Items Policies
DROP POLICY IF EXISTS "Allow all for demo_shipment_items" ON demo_shipment_items;
CREATE POLICY "Allow all for demo_shipment_items" ON demo_shipment_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Demo Sales Policies
DROP POLICY IF EXISTS "Allow all for demo_sales" ON demo_sales;
CREATE POLICY "Allow all for demo_sales" ON demo_sales
  FOR ALL USING (auth.role() = 'authenticated');

-- Demo Sale Items Policies
DROP POLICY IF EXISTS "Allow all for demo_sale_items" ON demo_sale_items;
CREATE POLICY "Allow all for demo_sale_items" ON demo_sale_items
  FOR ALL USING (auth.role() = 'authenticated');

-- Demo Sale Item Allocations Policies
DROP POLICY IF EXISTS "Allow all for demo_sale_item_allocations" ON demo_sale_item_allocations;
CREATE POLICY "Allow all for demo_sale_item_allocations" ON demo_sale_item_allocations
  FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- 5. CREATE CONSOLIDATED INVENTORY VIEW FOR DEMO
-- =====================================================

DROP VIEW IF EXISTS demo_consolidated_inventory;
CREATE VIEW demo_consolidated_inventory AS
SELECT
  p.id,
  p.brand,
  p.name,
  p.size,
  COALESCE(SUM(si.remaining_inventory), 0) AS total_available,
  COALESCE(AVG(si.unit_cost), 0) AS avg_cost
FROM demo_products p
LEFT JOIN demo_shipment_items si ON p.id = si.product_id
WHERE p.active = true
GROUP BY p.id, p.brand, p.name, p.size;

-- =====================================================
-- 6. CREATE TRUNCATE FUNCTION (SAFE DATA CLEANUP)
-- =====================================================

DROP FUNCTION IF EXISTS truncate_demo_tables();
CREATE OR REPLACE FUNCTION truncate_demo_tables()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Truncate in correct order (children first, then parents)
  -- CASCADE will handle foreign key dependencies
  TRUNCATE TABLE demo_sale_item_allocations CASCADE;
  TRUNCATE TABLE demo_sale_items CASCADE;
  TRUNCATE TABLE demo_sales CASCADE;
  TRUNCATE TABLE demo_shipment_items CASCADE;
  TRUNCATE TABLE demo_shipments CASCADE;
  TRUNCATE TABLE demo_customers CASCADE;
  TRUNCATE TABLE demo_products CASCADE;

  RAISE NOTICE 'Demo tables truncated successfully';
END;
$$;

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permission on truncate function to authenticated users
GRANT EXECUTE ON FUNCTION truncate_demo_tables() TO authenticated;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Create demo-data.sql with sample data (separate script)
-- 3. Demo users will automatically use demo_* tables via getTableName()
-- 4. Demo tables will be cleared on logout via truncate_demo_tables()
