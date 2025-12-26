-- =====================================================
-- DEMO RPC FUNCTIONS
-- Run this in Supabase SQL Editor AFTER demo-tables-setup.sql
-- =====================================================

-- These RPC functions are demo versions that work with demo_* tables

-- =====================================================
-- 1. Demo Get Available Inventory
-- =====================================================

DROP FUNCTION IF EXISTS demo_get_available_inventory(text, text, text);
CREATE OR REPLACE FUNCTION demo_get_available_inventory(
  p_brand TEXT,
  p_name TEXT,
  p_size TEXT
)
RETURNS TABLE (
  shipment_item_id UUID,
  shipment_id UUID,
  shipment_number TEXT,
  available_quantity INTEGER,
  unit_cost NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id AS shipment_item_id,
    s.id AS shipment_id,
    s.shipment_number,
    si.remaining_inventory AS available_quantity,
    si.unit_cost
  FROM demo_shipment_items si
  JOIN demo_shipments s ON si.shipment_id = s.id
  JOIN demo_products p ON si.product_id = p.id
  WHERE p.brand = p_brand
    AND p.name = p_name
    AND p.size = p_size
    AND si.remaining_inventory > 0
    AND p.active = true
  ORDER BY s.created_at ASC; -- FIFO: oldest shipments first
END;
$$;

-- =====================================================
-- 2. Demo Get Shipment Sales with Allocations
-- =====================================================

DROP FUNCTION IF EXISTS demo_get_shipment_sales_with_allocations(UUID);
CREATE OR REPLACE FUNCTION demo_get_shipment_sales_with_allocations(
  p_shipment_id UUID
)
RETURNS TABLE (
  sale_id UUID,
  sale_date TIMESTAMP WITH TIME ZONE,
  sale_total_amount NUMERIC,
  sale_amount_paid NUMERIC,
  sale_currency TEXT,
  sale_exchange_rate NUMERIC,
  sale_item_id UUID,
  product_id UUID,
  sale_item_quantity INTEGER,
  sale_item_unit_price NUMERIC,
  sale_item_amount_paid NUMERIC,
  allocation_quantity INTEGER,
  allocation_unit_cost NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS sale_id,
    s.sale_date,
    s.total_amount AS sale_total_amount,
    s.amount_paid AS sale_amount_paid,
    s.currency AS sale_currency,
    s.exchange_rate_used AS sale_exchange_rate,
    si.id AS sale_item_id,
    si.product_id,
    si.quantity AS sale_item_quantity,
    si.unit_price AS sale_item_unit_price,
    si.amount_paid AS sale_item_amount_paid,
    a.quantity AS allocation_quantity,
    a.unit_cost AS allocation_unit_cost
  FROM demo_sale_item_allocations a
  JOIN demo_sale_items si ON a.sale_item_id = si.id
  JOIN demo_sales s ON si.sale_id = s.id
  JOIN demo_shipment_items shi ON a.shipment_item_id = shi.id
  WHERE shi.shipment_id = p_shipment_id
  ORDER BY s.sale_date DESC, si.id;
END;
$$;

-- =====================================================
-- 3. Grant Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION demo_get_available_inventory(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION demo_get_shipment_sales_with_allocations(UUID) TO authenticated;

-- =====================================================
-- DEMO RPC FUNCTIONS COMPLETE
-- =====================================================

-- These functions are now available for demo accounts
-- Next: Update the app to use these functions when isDemoAccount() is true
