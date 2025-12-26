-- Fix SECURITY DEFINER views by recreating them with SECURITY INVOKER
-- This ensures views use the permissions of the querying user, not the view creator
-- Issue: Supabase linter flagged these views as security risks

-- =====================================================
-- 1. Fix consolidated_inventory view
-- =====================================================

DROP VIEW IF EXISTS consolidated_inventory;

CREATE VIEW consolidated_inventory
WITH (security_invoker = true) AS
SELECT
  p.id as product_id,
  p.brand,
  p.name,
  p.size,
  p.image_url,
  SUM(si.remaining_inventory) as total_quantity,
  SUM(si.remaining_inventory * si.unit_cost) as total_value,
  COUNT(DISTINCT si.shipment_id) as shipment_count
FROM products p
LEFT JOIN shipment_items si ON si.product_id = p.id
WHERE p.active = true
GROUP BY p.id, p.brand, p.name, p.size, p.image_url;

-- =====================================================
-- 2. Fix shipment_performance view
-- =====================================================

DROP VIEW IF EXISTS shipment_performance;

CREATE VIEW shipment_performance
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.shipment_number,
  s.delivered_date,
  s.status,
  s.shipping_cost,
  COALESCE(s.additional_costs, 0) as additional_costs,
  COALESCE(SUM(si.quantity * si.unit_cost), 0) as product_costs,
  (COALESCE(SUM(si.quantity * si.unit_cost), 0) + s.shipping_cost + COALESCE(s.additional_costs, 0)) as total_investment,
  s.total_revenue,
  s.net_profit,
  CASE
    WHEN (COALESCE(SUM(si.quantity * si.unit_cost), 0) + s.shipping_cost + COALESCE(s.additional_costs, 0)) > 0
    THEN (s.net_profit / (COALESCE(SUM(si.quantity * si.unit_cost), 0) + s.shipping_cost + COALESCE(s.additional_costs, 0))) * 100
    ELSE 0
  END as roi_percentage,
  COUNT(DISTINCT si.product_id) as product_count,
  SUM(si.quantity) as total_items
FROM shipments s
LEFT JOIN shipment_items si ON si.shipment_id = s.id
GROUP BY s.id, s.shipment_number, s.delivered_date, s.status, s.shipping_cost, s.additional_costs, s.total_revenue, s.net_profit;

-- =====================================================
-- 3. Fix demo_consolidated_inventory view
-- =====================================================

DROP VIEW IF EXISTS demo_consolidated_inventory;

CREATE VIEW demo_consolidated_inventory
WITH (security_invoker = true) AS
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
-- Verify the fix
-- =====================================================

-- Check that views no longer have security_definer
SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('consolidated_inventory', 'shipment_performance', 'demo_consolidated_inventory');

-- This should now show that views use security_invoker instead of security_definer
