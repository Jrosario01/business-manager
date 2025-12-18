-- Add cost field to products table
-- This represents the typical/default wholesale cost in USD

ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN products.cost IS 'Default wholesale cost in USD (reference price)';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'cost';
