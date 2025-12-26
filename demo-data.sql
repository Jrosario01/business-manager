-- =====================================================
-- DEMO DATA SEED SCRIPT
-- Run this in Supabase SQL Editor AFTER demo-tables-setup.sql
-- =====================================================

-- This script populates demo tables with realistic sample data
-- for the demo account to explore the application

-- =====================================================
-- 1. DEMO PRODUCTS (17 products)
-- =====================================================

INSERT INTO demo_products (sku, brand, name, size, cost, sale_price, active) VALUES
-- Lattafa (4 products)
('LAT-ASAD-100', 'Lattafa', 'Asad', '100ml', 25, 45, true),
('LAT-BADE-100', 'Lattafa', 'Bade Al Oud', '100ml', 30, 55, true),
('LAT-KHAM-100', 'Lattafa', 'Khamrah', '100ml', 32, 60, true),
('LAT-RAGH-100', 'Lattafa', 'Raghba', '100ml', 28, 50, true),

-- Armaf (3 products)
('ARM-CDNI-105', 'Armaf', 'Club De Nuit Intense', '105ml', 35, 65, true),
('ARM-HUNT-100', 'Armaf', 'Hunter Intense', '100ml', 30, 55, true),
('ARM-TRES-100', 'Armaf', 'Tres Nuit', '100ml', 28, 52, true),

-- Rasasi (3 products)
('RAS-HAWA-100', 'Rasasi', 'Hawas', '100ml', 32, 60, true),
('RAS-FATT-50', 'Rasasi', 'Fattan', '50ml', 27, 50, true),
('RAS-LAYU-75', 'Rasasi', 'La Yuqawam', '75ml', 35, 65, true),

-- Al Haramain (2 products)
('ALH-LAVE-100', 'Al Haramain', 'L''Aventure', '100ml', 30, 55, true),
('ALH-AMBO-60', 'Al Haramain', 'Amber Oud', '60ml', 35, 65, true),

-- Afnan (2 products)
('AFN-SUPR-100', 'Afnan', 'Supremacy Silver', '100ml', 29, 54, true),
('AFN-9PM-100', 'Afnan', '9PM', '100ml', 26, 48, true),

-- Swiss Arabian (2 products)
('SWI-SHAO-75', 'Swiss Arabian', 'Shaghaf Oud', '75ml', 38, 70, true),
('SWI-CASA-100', 'Swiss Arabian', 'Casablanca', '100ml', 32, 60, true),

-- Zimaya (1 product)
('ZIM-SHAR-100', 'Zimaya', 'Sharaf', '100ml', 31, 58, true)

ON CONFLICT (sku) DO NOTHING;

-- =====================================================
-- 2. DEMO CUSTOMERS (5 customers)
-- =====================================================

INSERT INTO demo_customers (name, phone, email, notes) VALUES
('Maria Garcia', '809-555-0101', 'maria.garcia@email.com', 'Regular customer - prefers floral scents'),
('Carlos Rodriguez', '809-555-0102', 'carlos.r@email.com', 'Monthly buyer - wholesale inquiries'),
('Ana Martinez', '809-555-0103', 'ana.martinez@email.com', 'VIP - luxury brands only'),
('Juan Perez', '809-555-0104', 'juan.perez@email.com', 'Bulk orders for gift shop'),
('Sofia Hernandez', '809-555-0105', 'sofia.h@email.com', 'First-time customer - interested in Lattafa')

ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. DEMO SHIPMENT (1 shipment with 12 products)
-- =====================================================

-- Insert shipment (using exchange rate of 58.5 DOP per USD as example)
INSERT INTO demo_shipments (
  shipment_number,
  status,
  shipping_cost,
  total_cost,
  total_revenue,
  net_profit,
  your_share,
  partner_share,
  exchange_rate_used,
  notes
) VALUES (
  'SHIP-DEMO-001',
  'delivered',
  150,  -- $150 shipping cost
  0,    -- Will be calculated from items
  0,    -- Will be updated from sales
  0,    -- Will be calculated
  0,    -- Will be calculated
  0,    -- Will be calculated
  58.5, -- USD to DOP exchange rate
  'Demo shipment for testing purposes'
)
ON CONFLICT DO NOTHING;

-- Insert shipment items (12 products from the 17 available)
WITH shipment AS (
  SELECT id FROM demo_shipments WHERE shipment_number = 'SHIP-DEMO-001' LIMIT 1
)
INSERT INTO demo_shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
SELECT
  shipment.id,
  p.id,
  CASE
    WHEN p.brand = 'Lattafa' THEN 3  -- 3 units each for Lattafa (4 products = 12 units)
    WHEN p.brand = 'Armaf' THEN 2    -- 2 units each for Armaf (3 products = 6 units)
    WHEN p.brand = 'Rasasi' THEN 2   -- 2 units each for Rasasi (3 products = 6 units)
    WHEN p.brand = 'Al Haramain' THEN 1  -- 1 unit each for Al Haramain (2 products = 2 units)
  END AS quantity,
  p.cost AS unit_cost,
  CASE
    WHEN p.brand = 'Lattafa' THEN 2  -- 2 remaining (1 sold)
    WHEN p.brand = 'Armaf' THEN 1    -- 1 remaining (1 sold)
    WHEN p.brand = 'Rasasi' THEN 2   -- 2 remaining (none sold yet)
    WHEN p.brand = 'Al Haramain' THEN 0  -- 0 remaining (1 sold)
  END AS remaining_inventory
FROM demo_products p
CROSS JOIN shipment
WHERE p.brand IN ('Lattafa', 'Armaf', 'Rasasi', 'Al Haramain')
ON CONFLICT DO NOTHING;

-- Update shipment total_cost based on items
UPDATE demo_shipments
SET total_cost = (
  SELECT COALESCE(SUM(quantity * unit_cost), 0) + shipping_cost
  FROM demo_shipment_items
  WHERE shipment_id = demo_shipments.id
)
WHERE shipment_number = 'SHIP-DEMO-001';

-- =====================================================
-- 4. DEMO SALES (3 sales with PAID or PARTIAL status)
-- =====================================================

-- Sale 1: Maria Garcia - PAID (2 items)
WITH customer AS (
  SELECT id FROM demo_customers WHERE name = 'Maria Garcia' LIMIT 1
), sale AS (
  INSERT INTO demo_sales (
    customer_id,
    sale_date,
    total_amount,
    amount_paid,
    outstanding_balance,
    payment_status,
    currency,
    exchange_rate_used
  )
  SELECT
    id,
    NOW() - INTERVAL '5 days',  -- 5 days ago
    5200,  -- Total: 2800 + 2400 DOP (Asad 2800 + Khamrah 2400)
    5200,  -- Fully paid
    0,
    'paid',
    'DOP',
    58.5
  FROM customer
  RETURNING id
)
-- Insert sale items for Sale 1
INSERT INTO demo_sale_items (sale_id, product_id, quantity, unit_price, line_total, amount_paid)
SELECT
  sale.id,
  p.id,
  1,  -- 1 unit each
  CASE
    WHEN p.name = 'Asad' THEN 2800  -- 48 USD * 58.5 rate
    WHEN p.name = 'Khamrah' THEN 2400  -- 41 USD * 58.5 rate
  END AS unit_price,
  CASE
    WHEN p.name = 'Asad' THEN 2800
    WHEN p.name = 'Khamrah' THEN 2400
  END AS line_total,
  CASE
    WHEN p.name = 'Asad' THEN 2800
    WHEN p.name = 'Khamrah' THEN 2400
  END AS amount_paid
FROM demo_products p
CROSS JOIN sale
WHERE p.name IN ('Asad', 'Khamrah')
ON CONFLICT DO NOTHING;

-- Sale 2: Carlos Rodriguez - PARTIAL (3 items)
WITH customer AS (
  SELECT id FROM demo_customers WHERE name = 'Carlos Rodriguez' LIMIT 1
), sale AS (
  INSERT INTO demo_sales (
    customer_id,
    sale_date,
    total_amount,
    amount_paid,
    outstanding_balance,
    payment_status,
    currency,
    exchange_rate_used
  )
  SELECT
    id,
    NOW() - INTERVAL '3 days',  -- 3 days ago
    8900,  -- Total for 3 products in DOP
    4500,  -- Partial payment
    4400,  -- Outstanding balance
    'partial',
    'DOP',
    58.5
  FROM customer
  RETURNING id
)
-- Insert sale items for Sale 2
INSERT INTO demo_sale_items (sale_id, product_id, quantity, unit_price, line_total, amount_paid)
SELECT
  sale.id,
  p.id,
  1,  -- 1 unit each
  CASE
    WHEN p.name = 'Club De Nuit Intense' THEN 3200  -- 55 USD * 58.5
    WHEN p.name = 'Hunter Intense' THEN 2900  -- 50 USD * 58.5
    WHEN p.name = 'Hawas' THEN 2800  -- 48 USD * 58.5
  END AS unit_price,
  CASE
    WHEN p.name = 'Club De Nuit Intense' THEN 3200
    WHEN p.name = 'Hunter Intense' THEN 2900
    WHEN p.name = 'Hawas' THEN 2800
  END AS line_total,
  CASE
    WHEN p.name = 'Club De Nuit Intense' THEN 3200  -- This one paid
    WHEN p.name = 'Hunter Intense' THEN 1300  -- Partial on this one
    WHEN p.name = 'Hawas' THEN 0  -- Not paid yet
  END AS amount_paid
FROM demo_products p
CROSS JOIN sale
WHERE p.name IN ('Club De Nuit Intense', 'Hunter Intense', 'Hawas')
ON CONFLICT DO NOTHING;

-- Sale 3: Ana Martinez - PAID (2 luxury items)
WITH customer AS (
  SELECT id FROM demo_customers WHERE name = 'Ana Martinez' LIMIT 1
), sale AS (
  INSERT INTO demo_sales (
    customer_id,
    sale_date,
    total_amount,
    amount_paid,
    outstanding_balance,
    payment_status,
    currency,
    exchange_rate_used
  )
  SELECT
    id,
    NOW() - INTERVAL '1 day',  -- 1 day ago
    7600,  -- Total in DOP
    7600,  -- Fully paid
    0,
    'paid',
    'DOP',
    58.5
  FROM customer
  RETURNING id
)
-- Insert sale items for Sale 3
INSERT INTO demo_sale_items (sale_id, product_id, quantity, unit_price, line_total, amount_paid)
SELECT
  sale.id,
  p.id,
  1,  -- 1 unit each
  CASE
    WHEN p.name = 'Amber Oud' THEN 3800  -- 65 USD * 58.5
    WHEN p.name = 'Shaghaf Oud' THEN 3800  -- 65 USD * 58.5
  END AS unit_price,
  CASE
    WHEN p.name = 'Amber Oud' THEN 3800
    WHEN p.name = 'Shaghaf Oud' THEN 3800
  END AS line_total,
  CASE
    WHEN p.name = 'Amber Oud' THEN 3800
    WHEN p.name = 'Shaghaf Oud' THEN 3800
  END AS amount_paid
FROM demo_products p
CROSS JOIN sale
WHERE p.name IN ('Amber Oud', 'Shaghaf Oud')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. CREATE SALE ALLOCATIONS (FIFO)
-- =====================================================

-- Allocate sales to shipment items
-- Sale 1: Maria Garcia - Lattafa Asad (1 unit)
WITH sale_item AS (
  SELECT si.id
  FROM demo_sale_items si
  JOIN demo_sales s ON si.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si.product_id = p.id
  WHERE c.name = 'Maria Garcia' AND p.name = 'Asad'
  LIMIT 1
), shipment_item AS (
  SELECT si.id, si.unit_cost
  FROM demo_shipment_items si
  JOIN demo_products p ON si.product_id = p.id
  WHERE p.name = 'Asad'
  LIMIT 1
)
INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
SELECT
  sale_item.id,
  shipment_item.id,
  1,  -- 1 unit
  shipment_item.unit_cost
FROM sale_item
CROSS JOIN shipment_item
ON CONFLICT DO NOTHING;

-- Sale 1: Maria Garcia - Lattafa Khamrah (1 unit)
WITH sale_item AS (
  SELECT si.id
  FROM demo_sale_items si
  JOIN demo_sales s ON si.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si.product_id = p.id
  WHERE c.name = 'Maria Garcia' AND p.name = 'Khamrah'
  LIMIT 1
), shipment_item AS (
  SELECT si.id, si.unit_cost
  FROM demo_shipment_items si
  JOIN demo_products p ON si.product_id = p.id
  WHERE p.name = 'Khamrah'
  LIMIT 1
)
INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
SELECT
  sale_item.id,
  shipment_item.id,
  1,  -- 1 unit
  shipment_item.unit_cost
FROM sale_item
CROSS JOIN shipment_item
ON CONFLICT DO NOTHING;

-- Sale 2: Carlos Rodriguez - Armaf Club De Nuit Intense (1 unit)
WITH sale_item AS (
  SELECT si.id
  FROM demo_sale_items si
  JOIN demo_sales s ON si.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si.product_id = p.id
  WHERE c.name = 'Carlos Rodriguez' AND p.name = 'Club De Nuit Intense'
  LIMIT 1
), shipment_item AS (
  SELECT si.id, si.unit_cost
  FROM demo_shipment_items si
  JOIN demo_products p ON si.product_id = p.id
  WHERE p.name = 'Club De Nuit Intense'
  LIMIT 1
)
INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
SELECT
  sale_item.id,
  shipment_item.id,
  1,  -- 1 unit
  shipment_item.unit_cost
FROM sale_item
CROSS JOIN shipment_item
ON CONFLICT DO NOTHING;

-- Sale 2: Carlos Rodriguez - Armaf Hunter Intense (1 unit)
WITH sale_item AS (
  SELECT si.id
  FROM demo_sale_items si
  JOIN demo_sales s ON si.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si.product_id = p.id
  WHERE c.name = 'Carlos Rodriguez' AND p.name = 'Hunter Intense'
  LIMIT 1
), shipment_item AS (
  SELECT si.id, si.unit_cost
  FROM demo_shipment_items si
  JOIN demo_products p ON si.product_id = p.id
  WHERE p.name = 'Hunter Intense'
  LIMIT 1
)
INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
SELECT
  sale_item.id,
  shipment_item.id,
  1,  -- 1 unit
  shipment_item.unit_cost
FROM sale_item
CROSS JOIN shipment_item
ON CONFLICT DO NOTHING;

-- Sale 3: Ana Martinez - Al Haramain Amber Oud (1 unit)
WITH sale_item AS (
  SELECT si.id
  FROM demo_sale_items si
  JOIN demo_sales s ON si.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si.product_id = p.id
  WHERE c.name = 'Ana Martinez' AND p.name = 'Amber Oud'
  LIMIT 1
), shipment_item AS (
  SELECT si.id, si.unit_cost
  FROM demo_shipment_items si
  JOIN demo_products p ON si.product_id = p.id
  WHERE p.name = 'Amber Oud'
  LIMIT 1
)
INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
SELECT
  sale_item.id,
  shipment_item.id,
  1,  -- 1 unit
  shipment_item.unit_cost
FROM sale_item
CROSS JOIN shipment_item
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. UPDATE SHIPMENT REVENUE AND PROFIT
-- =====================================================

-- Update shipment revenue based on sales allocations
WITH revenue_calc AS (
  SELECT
    sh.id,
    COALESCE(SUM(
      CASE
        WHEN s.currency = 'DOP' THEN (a.quantity * si.unit_price) / s.exchange_rate_used
        ELSE a.quantity * si.unit_price
      END
    ), 0) AS total_revenue
  FROM demo_shipments sh
  LEFT JOIN demo_shipment_items shi ON shi.shipment_id = sh.id
  LEFT JOIN demo_sale_item_allocations a ON a.shipment_item_id = shi.id
  LEFT JOIN demo_sale_items si ON a.sale_item_id = si.id
  LEFT JOIN demo_sales s ON si.sale_id = s.id
  WHERE sh.shipment_number = 'SHIP-DEMO-001'
  GROUP BY sh.id
)
UPDATE demo_shipments sh
SET
  total_revenue = revenue_calc.total_revenue,
  net_profit = revenue_calc.total_revenue - sh.total_cost,
  your_share = (revenue_calc.total_revenue - sh.total_cost) * 0.5,  -- 50/50 split
  partner_share = (revenue_calc.total_revenue - sh.total_cost) * 0.5
FROM revenue_calc
WHERE sh.id = revenue_calc.id;

-- =====================================================
-- DEMO DATA SEED COMPLETE
-- =====================================================

-- Summary:
-- ✅ 17 demo products added
-- ✅ 5 demo customers added
-- ✅ 1 demo shipment added with 12 products (26 total units)
-- ✅ 3 demo sales added (2 PAID, 1 PARTIAL)
-- ✅ Sale allocations created for FIFO tracking
-- ✅ Shipment revenue and profit calculated

-- Demo account is now ready to use!
