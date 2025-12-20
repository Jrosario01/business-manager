-- Add exchange_rate_used column to shipments table
-- This stores the USD to DOP exchange rate at the time the shipment was created
-- Critical for accurate profit/loss calculations over time

ALTER TABLE shipments
ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(10, 4) DEFAULT 62.25;

-- Add comment explaining the field
COMMENT ON COLUMN shipments.exchange_rate_used IS 'USD to DOP exchange rate at time of shipment creation. Used for accurate historical cost calculations.';

-- Update existing shipments to have a default rate (you may want to adjust this)
UPDATE shipments
SET exchange_rate_used = 62.25
WHERE exchange_rate_used IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE shipments
ALTER COLUMN exchange_rate_used SET NOT NULL;

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'shipments' AND column_name = 'exchange_rate_used';
