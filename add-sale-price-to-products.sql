-- Add sale_price column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10, 2) DEFAULT 0;

-- Update existing products with a default sale price (you can adjust this)
-- For example, set sale price to 2x the cost as a starting point
UPDATE products
SET sale_price = cost * 2
WHERE sale_price = 0 OR sale_price IS NULL;
