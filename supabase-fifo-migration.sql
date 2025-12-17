-- FIFO Shipment Tracking Migration
-- Run this AFTER the main schema (supabase-schema.sql)
-- This adds support for FIFO allocation tracking

-- ============================================
-- NEW TABLES FOR FIFO TRACKING
-- ============================================

-- Sale Item Allocations (tracks which shipment items were used for each sale)
CREATE TABLE IF NOT EXISTS sale_item_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_item_id UUID REFERENCES sale_items(id) ON DELETE CASCADE,
  shipment_item_id UUID REFERENCES shipment_items(id),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Inventory Adjustments (manual corrections to inventory)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_item_id UUID REFERENCES shipment_items(id) ON DELETE CASCADE,
  adjustment_type TEXT CHECK (adjustment_type IN ('add', 'subtract')) NOT NULL,
  quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  adjusted_by UUID REFERENCES profiles(id),
  adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT positive_adjustment_quantity CHECK (quantity > 0)
);

-- ============================================
-- SCHEMA MODIFICATIONS
-- ============================================

-- Add brand field to products table (if not exists)
-- This helps with matching products across shipments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='products' AND column_name='brand') THEN
    ALTER TABLE products ADD COLUMN brand TEXT;
  END IF;
END $$;

-- Add additional_costs to shipments table (shipping, customs, etc.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='shipments' AND column_name='additional_costs') THEN
    ALTER TABLE shipments ADD COLUMN additional_costs DECIMAL(10,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sale_item_allocations_sale_item
  ON sale_item_allocations(sale_item_id);

CREATE INDEX IF NOT EXISTS idx_sale_item_allocations_shipment_item
  ON sale_item_allocations(shipment_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_shipment_item
  ON inventory_adjustments(shipment_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_date
  ON inventory_adjustments(adjustment_date DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sale_item_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access sale_item_allocations"
  ON sale_item_allocations FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can access inventory_adjustments"
  ON inventory_adjustments FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get available inventory for a product (by brand, name, size)
CREATE OR REPLACE FUNCTION get_available_inventory(
  p_brand TEXT,
  p_name TEXT,
  p_size TEXT
)
RETURNS TABLE (
  shipment_item_id UUID,
  shipment_id UUID,
  shipment_date DATE,
  remaining_quantity INTEGER,
  unit_cost DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.id as shipment_item_id,
    si.shipment_id,
    s.delivered_date as shipment_date,
    si.remaining_inventory as remaining_quantity,
    si.unit_cost
  FROM shipment_items si
  JOIN shipments s ON s.id = si.shipment_id
  JOIN products p ON p.id = si.product_id
  WHERE p.brand = p_brand
    AND p.name = p_name
    AND p.size = p_size
    AND si.remaining_inventory > 0
  ORDER BY s.delivered_date ASC, s.created_at ASC;  -- FIFO: oldest first
END;
$$ LANGUAGE plpgsql;

-- Function to update remaining inventory after a sale
CREATE OR REPLACE FUNCTION update_inventory_after_sale()
RETURNS TRIGGER AS $$
DECLARE
  allocation RECORD;
BEGIN
  -- For each allocation, decrease the remaining inventory
  FOR allocation IN
    SELECT shipment_item_id, quantity
    FROM sale_item_allocations
    WHERE sale_item_id = NEW.id
  LOOP
    UPDATE shipment_items
    SET remaining_inventory = remaining_inventory - allocation.quantity
    WHERE id = allocation.shipment_item_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to restore inventory when a sale is deleted
CREATE OR REPLACE FUNCTION restore_inventory_after_sale_delete()
RETURNS TRIGGER AS $$
DECLARE
  allocation RECORD;
BEGIN
  -- For each allocation, restore the remaining inventory
  FOR allocation IN
    SELECT shipment_item_id, quantity
    FROM sale_item_allocations
    WHERE sale_item_id = OLD.id
  LOOP
    UPDATE shipment_items
    SET remaining_inventory = remaining_inventory + allocation.quantity
    WHERE id = allocation.shipment_item_id;
  END LOOP;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory after adjustment
CREATE OR REPLACE FUNCTION apply_inventory_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.adjustment_type = 'add' THEN
    UPDATE shipment_items
    SET remaining_inventory = remaining_inventory + NEW.quantity
    WHERE id = NEW.shipment_item_id;
  ELSIF NEW.adjustment_type = 'subtract' THEN
    UPDATE shipment_items
    SET remaining_inventory = remaining_inventory - NEW.quantity
    WHERE id = NEW.shipment_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Note: Inventory updates will be handled in application code for better control
-- But these triggers are here as backup/safety

-- Trigger to apply inventory adjustments
CREATE TRIGGER trigger_apply_inventory_adjustment
  AFTER INSERT ON inventory_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION apply_inventory_adjustment();

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View for consolidated inventory (product totals across all shipments)
CREATE OR REPLACE VIEW consolidated_inventory AS
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

-- View for shipment performance
CREATE OR REPLACE VIEW shipment_performance AS
SELECT
  s.id,
  s.shipment_number,
  s.delivered_date,
  s.status,
  s.shipping_cost,
  COALESCE(s.additional_costs, 0) as additional_costs,
  SUM(si.quantity * si.unit_cost) as product_costs,
  (SUM(si.quantity * si.unit_cost) + s.shipping_cost + COALESCE(s.additional_costs, 0)) as total_investment,
  s.total_revenue,
  s.net_profit,
  CASE
    WHEN (SUM(si.quantity * si.unit_cost) + s.shipping_cost + COALESCE(s.additional_costs, 0)) > 0
    THEN (s.net_profit / (SUM(si.quantity * si.unit_cost) + s.shipping_cost + COALESCE(s.additional_costs, 0))) * 100
    ELSE 0
  END as roi_percentage,
  SUM(si.quantity) as total_units,
  SUM(si.remaining_inventory) as remaining_units,
  (SUM(si.quantity) - SUM(si.remaining_inventory)) as sold_units
FROM shipments s
LEFT JOIN shipment_items si ON si.shipment_id = s.id
GROUP BY s.id, s.shipment_number, s.delivered_date, s.status,
         s.shipping_cost, s.additional_costs, s.total_revenue, s.net_profit;

-- ============================================
-- COMPLETED!
-- ============================================

-- Your database now supports FIFO allocation tracking!
-- Next: Update your application code to use these tables
