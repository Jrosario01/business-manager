-- Add cost column to products table
-- Run this in Supabase SQL Editor

ALTER TABLE products
ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2) DEFAULT 0;

-- Add a comment explaining the field
COMMENT ON COLUMN products.cost IS 'Standard cost per unit for this product (can be updated)';
