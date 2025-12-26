-- FIFO Shipment Tracking Migration (SAFE VERSION)
-- This version checks for existing objects before creating them

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
-- SCHEMA MODIFICATIONS (ADD MISSING COLUMNS)
-- ============================================

-- Add brand field to products table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='products' AND column_name='brand') THEN
    ALTER TABLE products ADD COLUMN brand TEXT;
    RAISE NOTICE 'Added brand column to products table';
  ELSE
    RAISE NOTICE 'Brand column already exists in products table';
  END IF;
END $$;

-- Add additional_costs to shipments table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='shipments' AND column_name='additional_costs') THEN
    ALTER TABLE shipments ADD COLUMN additional_costs DECIMAL(10,2) DEFAULT 0;
    RAISE NOTICE 'Added additional_costs column to shipments table';
  ELSE
    RAISE NOTICE 'Additional_costs column already exists in shipments table';
  END IF;
END $$;

-- ============================================
-- INDEXES (ONLY CREATE IF NOT EXISTS)
-- ============================================

DO $$
BEGIN
  -- Index for sale_item_allocations by sale_item_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sale_item_allocations_sale_item') THEN
    CREATE INDEX idx_sale_item_allocations_sale_item ON sale_item_allocations(sale_item_id);
    RAISE NOTICE 'Created index: idx_sale_item_allocations_sale_item';
  END IF;

  -- Index for sale_item_allocations by shipment_item_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sale_item_allocations_shipment_item') THEN
    CREATE INDEX idx_sale_item_allocations_shipment_item ON sale_item_allocations(shipment_item_id);
    RAISE NOTICE 'Created index: idx_sale_item_allocations_shipment_item';
  END IF;

  -- Index for inventory_adjustments by shipment_item_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_adjustments_shipment_item') THEN
    CREATE INDEX idx_inventory_adjustments_shipment_item ON inventory_adjustments(shipment_item_id);
    RAISE NOTICE 'Created index: idx_inventory_adjustments_shipment_item';
  END IF;

  -- Index for inventory_adjustments by date
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_inventory_adjustments_date') THEN
    CREATE INDEX idx_inventory_adjustments_date ON inventory_adjustments(adjustment_date DESC);
    RAISE NOTICE 'Created index: idx_inventory_adjustments_date';
  END IF;

END $$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sale_item_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DO $$
BEGIN
  -- Sale item allocations policy
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can access sale_item_allocations') THEN
    DROP POLICY "Authenticated users can access sale_item_allocations" ON sale_item_allocations;
  END IF;
  CREATE POLICY "Authenticated users can access sale_item_allocations"
    ON sale_item_allocations FOR ALL USING (auth.role() = 'authenticated');

  -- Inventory adjustments policy
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can access inventory_adjustments') THEN
    DROP POLICY "Authenticated users can access inventory_adjustments" ON inventory_adjustments;
  END IF;
  CREATE POLICY "Authenticated users can access inventory_adjustments"
    ON inventory_adjustments FOR ALL USING (auth.role() = 'authenticated');

  RAISE NOTICE 'RLS policies created successfully';
END $$;

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
    COALESCE(s.delivered_date, s.created_at::date) as shipment_date,
    si.remaining_inventory as remaining_quantity,
    si.unit_cost
  FROM shipment_items si
  JOIN shipments s ON s.id = si.shipment_id
  JOIN products p ON p.id = si.product_id
  WHERE p.brand = p_brand
    AND p.name = p_name
    AND p.size = p_size
    AND si.remaining_inventory > 0
  ORDER BY COALESCE(s.delivered_date, s.created_at::date) ASC, s.created_at ASC;  -- FIFO: oldest first
END;
$$ LANGUAGE plpgsql;

-- Function to apply inventory adjustments
CREATE OR REPLACE FUNCTION apply_inventory_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.adjustment_type = 'add' THEN
    UPDATE shipment_items
    SET remaining_inventory = remaining_inventory + NEW.quantity
    WHERE id = NEW.shipment_item_id;
  ELSIF NEW.adjustment_type = 'subtract' THEN
    UPDATE shipment_items
    SET remaining_inventory = GREATEST(0, remaining_inventory - NEW.quantity)
    WHERE id = NEW.shipment_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Drop trigger if exists, then recreate
DROP TRIGGER IF EXISTS trigger_apply_inventory_adjustment ON inventory_adjustments;

CREATE TRIGGER trigger_apply_inventory_adjustment
  AFTER INSERT ON inventory_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION apply_inventory_adjustment();

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS consolidated_inventory CASCADE;
DROP VIEW IF EXISTS shipment_performance CASCADE;

-- View for consolidated inventory (product totals across all shipments)
-- SECURITY INVOKER ensures view uses permissions of querying user, not view creator
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

-- View for shipment performance
-- SECURITY INVOKER ensures view uses permissions of querying user, not view creator
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
  COALESCE(SUM(si.quantity), 0) as total_units,
  COALESCE(SUM(si.remaining_inventory), 0) as remaining_units,
  COALESCE(SUM(si.quantity) - SUM(si.remaining_inventory), 0) as sold_units
FROM shipments s
LEFT JOIN shipment_items si ON si.shipment_id = s.id
GROUP BY s.id, s.shipment_number, s.delivered_date, s.status,
         s.shipping_cost, s.additional_costs, s.total_revenue, s.net_profit;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check what was created
DO $$
DECLARE
  table_count INTEGER;
  view_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Count new tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('sale_item_allocations', 'inventory_adjustments');

  -- Count views
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('consolidated_inventory', 'shipment_performance');

  -- Count functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN ('get_available_inventory', 'apply_inventory_adjustment');

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created: % of 2', table_count;
  RAISE NOTICE 'Views created: % of 2', view_count;
  RAISE NOTICE 'Functions created: % of 2', function_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Your database is ready for FIFO tracking!';
  RAISE NOTICE '========================================';
END $$;
