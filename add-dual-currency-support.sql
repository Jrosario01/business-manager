-- Add dual currency support to sales table
-- This allows tracking sales in their native currency (DOP)
-- while costs remain in USD

-- Add currency field to sales table (defaults to DOP since sales happen in Dominican Republic)
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'DOP' CHECK (currency IN ('USD', 'DOP'));

-- Add exchange rate field to track the rate used at time of sale
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(10, 4);

-- Add comment explaining the fields
COMMENT ON COLUMN sales.currency IS 'Currency of the sale transaction (USD or DOP)';
COMMENT ON COLUMN sales.exchange_rate_used IS 'Exchange rate (USD to DOP) at time of sale for historical accuracy';

-- Optional: Add suggested retail price in DOP to products table for catalog
ALTER TABLE products
ADD COLUMN IF NOT EXISTS suggested_price_dop NUMERIC(10, 2);

COMMENT ON COLUMN products.suggested_price_dop IS 'Suggested retail price in Dominican Pesos (DOP)';

-- Update existing sales to have default currency and current exchange rate
-- This is for historical data - new sales will set these automatically
UPDATE sales
SET currency = 'DOP',
    exchange_rate_used = 60.0  -- Default rate, adjust as needed
WHERE currency IS NULL;
