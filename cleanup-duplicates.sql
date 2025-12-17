-- Cleanup script for duplicate data and reset migration
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. REMOVE DUPLICATE CUSTOMERS
-- ============================================

-- Step 1a: Update sales to point to the oldest customer record for each name
UPDATE sales
SET customer_id = (
  SELECT c.id
  FROM customers c
  WHERE c.name = (
    SELECT name FROM customers WHERE id = sales.customer_id
  )
  ORDER BY c.created_at ASC
  LIMIT 1
)
WHERE customer_id IN (
  SELECT c1.id
  FROM customers c1
  JOIN (
    SELECT name, MIN(created_at) as min_created_at
    FROM customers
    GROUP BY name
    HAVING COUNT(*) > 1
  ) c2 ON c1.name = c2.name
  WHERE c1.created_at > c2.min_created_at
);

-- Step 1b: Now delete duplicate customers (keeping oldest by created_at)
DELETE FROM customers
WHERE id IN (
  SELECT c1.id
  FROM customers c1
  JOIN (
    SELECT name, MIN(created_at) as min_created_at
    FROM customers
    GROUP BY name
    HAVING COUNT(*) > 1
  ) c2 ON c1.name = c2.name
  WHERE c1.created_at > c2.min_created_at
);

-- ============================================
-- 2. REMOVE DUPLICATE PRODUCTS
-- ============================================

-- Step 2a: Update sale_items to point to the oldest product record for each (brand, name, size)
UPDATE sale_items
SET product_id = (
  SELECT p.id
  FROM products p
  WHERE p.brand = (SELECT brand FROM products WHERE id = sale_items.product_id)
    AND p.name = (SELECT name FROM products WHERE id = sale_items.product_id)
    AND p.size = (SELECT size FROM products WHERE id = sale_items.product_id)
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE product_id IN (
  SELECT p1.id
  FROM products p1
  JOIN (
    SELECT brand, name, size, MIN(created_at) as min_created_at
    FROM products
    GROUP BY brand, name, size
    HAVING COUNT(*) > 1
  ) p2 ON p1.brand = p2.brand AND p1.name = p2.name AND p1.size = p2.size
  WHERE p1.created_at > p2.min_created_at
);

-- Step 2b: Update shipment_items to point to the oldest product record
UPDATE shipment_items
SET product_id = (
  SELECT p.id
  FROM products p
  WHERE p.brand = (SELECT brand FROM products WHERE id = shipment_items.product_id)
    AND p.name = (SELECT name FROM products WHERE id = shipment_items.product_id)
    AND p.size = (SELECT size FROM products WHERE id = shipment_items.product_id)
  ORDER BY p.created_at ASC
  LIMIT 1
)
WHERE product_id IN (
  SELECT p1.id
  FROM products p1
  JOIN (
    SELECT brand, name, size, MIN(created_at) as min_created_at
    FROM products
    GROUP BY brand, name, size
    HAVING COUNT(*) > 1
  ) p2 ON p1.brand = p2.brand AND p1.name = p2.name AND p1.size = p2.size
  WHERE p1.created_at > p2.min_created_at
);

-- Step 2c: Now delete duplicate products (keeping oldest by created_at)
DELETE FROM products
WHERE id IN (
  SELECT p1.id
  FROM products p1
  JOIN (
    SELECT brand, name, size, MIN(created_at) as min_created_at
    FROM products
    GROUP BY brand, name, size
    HAVING COUNT(*) > 1
  ) p2 ON p1.brand = p2.brand AND p1.name = p2.name AND p1.size = p2.size
  WHERE p1.created_at > p2.min_created_at
);

-- ============================================
-- 3. VERIFY CLEANUP
-- ============================================

-- Check for remaining duplicates
SELECT 'Duplicate Customers:' as check_type, name, COUNT(*) as count
FROM customers
GROUP BY name
HAVING COUNT(*) > 1

UNION ALL

SELECT 'Duplicate Products:' as check_type,
       CONCAT(brand, ' ', name, ' ', size) as name,
       COUNT(*) as count
FROM products
GROUP BY brand, name, size
HAVING COUNT(*) > 1;

-- ============================================
-- 4. SHOW CURRENT COUNTS
-- ============================================

SELECT
  'Summary' as info,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM sales) as sales;
