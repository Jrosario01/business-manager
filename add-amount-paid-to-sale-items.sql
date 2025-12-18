-- Add amount_paid field to sale_items table to track individual product payments
-- This allows us to track which specific products in a sale have been paid for

ALTER TABLE sale_items
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN sale_items.amount_paid IS 'Amount paid for this specific product line item';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'amount_paid';
