-- Fix RLS Performance Issues
-- This optimizes RLS policies by wrapping auth functions with SELECT
-- This makes auth.uid() and auth.role() evaluate ONCE instead of per-row
-- Safe change - improves performance without changing permissions or data

-- =====================================================
-- PRODUCTION TABLES
-- =====================================================

-- Profiles (2 policies)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Products (4 policies)
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;
CREATE POLICY "Authenticated users can view products" ON products
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
CREATE POLICY "Authenticated users can insert products" ON products
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
CREATE POLICY "Authenticated users can update products" ON products
  FOR UPDATE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;
CREATE POLICY "Authenticated users can delete products" ON products
  FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Suppliers (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access suppliers" ON suppliers;
CREATE POLICY "Authenticated users can access suppliers" ON suppliers
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Shipments (4 policies)
DROP POLICY IF EXISTS "Authenticated users can view shipments" ON shipments;
CREATE POLICY "Authenticated users can view shipments" ON shipments
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert shipments" ON shipments;
CREATE POLICY "Authenticated users can insert shipments" ON shipments
  FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update shipments" ON shipments;
CREATE POLICY "Authenticated users can update shipments" ON shipments
  FOR UPDATE USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete shipments" ON shipments;
CREATE POLICY "Authenticated users can delete shipments" ON shipments
  FOR DELETE USING ((select auth.role()) = 'authenticated');

-- Shipment Items (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access shipment_items" ON shipment_items;
CREATE POLICY "Authenticated users can access shipment_items" ON shipment_items
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Customers (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access customers" ON customers;
CREATE POLICY "Authenticated users can access customers" ON customers
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Sales (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access sales" ON sales;
CREATE POLICY "Authenticated users can access sales" ON sales
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Sale Items (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access sale_items" ON sale_items;
CREATE POLICY "Authenticated users can access sale_items" ON sale_items
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Payments (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access payments" ON payments;
CREATE POLICY "Authenticated users can access payments" ON payments
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Returns (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access returns" ON returns;
CREATE POLICY "Authenticated users can access returns" ON returns
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Sale Item Allocations (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access sale_item_allocations" ON sale_item_allocations;
CREATE POLICY "Authenticated users can access sale_item_allocations" ON sale_item_allocations
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Inventory Adjustments (1 policy)
DROP POLICY IF EXISTS "Authenticated users can access inventory_adjustments" ON inventory_adjustments;
CREATE POLICY "Authenticated users can access inventory_adjustments" ON inventory_adjustments
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- =====================================================
-- DEMO TABLES
-- =====================================================

-- Demo Products
DROP POLICY IF EXISTS "Allow all for demo_products" ON demo_products;
CREATE POLICY "Allow all for demo_products" ON demo_products
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Demo Customers
DROP POLICY IF EXISTS "Allow all for demo_customers" ON demo_customers;
CREATE POLICY "Allow all for demo_customers" ON demo_customers
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Demo Shipments
DROP POLICY IF EXISTS "Allow all for demo_shipments" ON demo_shipments;
CREATE POLICY "Allow all for demo_shipments" ON demo_shipments
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Demo Shipment Items
DROP POLICY IF EXISTS "Allow all for demo_shipment_items" ON demo_shipment_items;
CREATE POLICY "Allow all for demo_shipment_items" ON demo_shipment_items
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Demo Sales
DROP POLICY IF EXISTS "Allow all for demo_sales" ON demo_sales;
CREATE POLICY "Allow all for demo_sales" ON demo_sales
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Demo Sale Items
DROP POLICY IF EXISTS "Allow all for demo_sale_items" ON demo_sale_items;
CREATE POLICY "Allow all for demo_sale_items" ON demo_sale_items
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- Demo Sale Item Allocations
DROP POLICY IF EXISTS "Allow all for demo_sale_item_allocations" ON demo_sale_item_allocations;
CREATE POLICY "Allow all for demo_sale_item_allocations" ON demo_sale_item_allocations
  FOR ALL USING ((select auth.role()) = 'authenticated');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check that policies are now optimized
-- You should see "(SELECT auth.uid())" or "(SELECT auth.role())" in the definitions
SELECT
  schemaname,
  tablename,
  policyname,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- All done! Your queries should now be faster, especially when loading lots of data.
