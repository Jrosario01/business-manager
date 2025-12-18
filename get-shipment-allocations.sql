-- Function to get all sales allocations for a specific shipment
-- This returns detailed data about which sales used products from this shipment
-- and how much revenue/payment should be attributed to this shipment

-- Drop existing function first
DROP FUNCTION IF EXISTS get_shipment_sales_with_allocations(uuid);

CREATE OR REPLACE FUNCTION get_shipment_sales_with_allocations(p_shipment_id UUID)
RETURNS TABLE (
  sale_id UUID,
  sale_date DATE,
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as sale_id,
    s.sale_date,
    s.total_amount as sale_total_amount,
    s.amount_paid as sale_amount_paid,
    s.currency as sale_currency,
    s.exchange_rate_used as sale_exchange_rate,
    si.id as sale_item_id,
    si.product_id,
    si.quantity as sale_item_quantity,
    si.unit_price as sale_item_unit_price,
    si.amount_paid as sale_item_amount_paid,
    sia.quantity as allocation_quantity,
    sia.unit_cost as allocation_unit_cost
  FROM sale_item_allocations sia
  JOIN sale_items si ON sia.sale_item_id = si.id
  JOIN sales s ON si.sale_id = s.id
  JOIN shipment_items shpi ON sia.shipment_item_id = shpi.id
  WHERE shpi.shipment_id = p_shipment_id
  ORDER BY s.sale_date DESC;
END;
$$ LANGUAGE plpgsql;
