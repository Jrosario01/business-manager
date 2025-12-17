-- Add wishlist column to customers table
-- Run this in Supabase SQL Editor

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS wishlist TEXT[] DEFAULT '{}';

-- Add a comment explaining the field
COMMENT ON COLUMN customers.wishlist IS 'Array of product names the customer is interested in';
