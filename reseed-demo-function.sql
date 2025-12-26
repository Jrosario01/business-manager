-- =====================================================
-- RESEED DEMO DATA FUNCTION
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION reseed_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
  ('ZIM-SHAR-100', 'Zimaya', 'Sharaf', '100ml', 31, 58, true);

  -- =====================================================
  -- 2. DEMO CUSTOMERS (5 customers)
  -- =====================================================

  INSERT INTO demo_customers (name, phone, email, notes) VALUES
  ('Maria Garcia', '809-555-0101', 'maria.garcia@email.com', 'Regular customer - prefers floral scents'),
  ('Carlos Rodriguez', '809-555-0102', 'carlos.r@email.com', 'Monthly buyer - wholesale inquiries'),
  ('Ana Martinez', '809-555-0103', 'ana.martinez@email.com', 'VIP - luxury brands only'),
  ('Juan Perez', '809-555-0104', 'juan.perez@email.com', 'Bulk orders for gift shop'),
  ('Sofia Hernandez', '809-555-0105', 'sofia.h@email.com', 'First-time customer - interested in Lattafa');

  -- =====================================================
  -- 3. DEMO SHIPMENT (1 shipment with 12 products)
  -- =====================================================

  -- Insert shipment
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
    150,
    0,
    0,
    0,
    0,
    0,
    58.5,
    'Demo shipment for testing purposes'
  );

  -- Insert shipment items (12 products)
  INSERT INTO demo_shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  SELECT
    (SELECT id FROM demo_shipments WHERE shipment_number = 'SHIP-DEMO-001' LIMIT 1),
    p.id,
    CASE
      WHEN p.brand = 'Lattafa' THEN 3
      WHEN p.brand = 'Armaf' THEN 2
      WHEN p.brand = 'Rasasi' THEN 2
      WHEN p.brand = 'Al Haramain' THEN 1
    END AS quantity,
    p.cost AS unit_cost,
    CASE
      WHEN p.brand = 'Lattafa' THEN 2
      WHEN p.brand = 'Armaf' THEN 1
      WHEN p.brand = 'Rasasi' THEN 2
      WHEN p.brand = 'Al Haramain' THEN 0
    END AS remaining_inventory
  FROM demo_products p
  WHERE p.brand IN ('Lattafa', 'Armaf', 'Rasasi', 'Al Haramain');

  -- Update shipment total_cost
  UPDATE demo_shipments
  SET total_cost = (
    SELECT COALESCE(SUM(quantity * unit_cost), 0) + shipping_cost
    FROM demo_shipment_items
    WHERE shipment_id = demo_shipments.id
  )
  WHERE shipment_number = 'SHIP-DEMO-001';

  -- =====================================================
  -- 4. DEMO SALES (3 sales)
  -- =====================================================

  -- Sale 1: Maria Garcia - PAID
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
      NOW() - INTERVAL '5 days',
      5200,
      5200,
      0,
      'paid',
      'DOP',
      58.5
    FROM customer
    RETURNING id
  )
  INSERT INTO demo_sale_items (sale_id, product_id, quantity, unit_price, line_total, amount_paid)
  SELECT
    sale.id,
    p.id,
    1,
    CASE
      WHEN p.name = 'Asad' THEN 2800
      WHEN p.name = 'Khamrah' THEN 2400
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
  WHERE p.name IN ('Asad', 'Khamrah');

  -- Sale 2: Carlos Rodriguez - PARTIAL
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
      NOW() - INTERVAL '3 days',
      8900,
      4500,
      4400,
      'partial',
      'DOP',
      58.5
    FROM customer
    RETURNING id
  )
  INSERT INTO demo_sale_items (sale_id, product_id, quantity, unit_price, line_total, amount_paid)
  SELECT
    sale.id,
    p.id,
    1,
    CASE
      WHEN p.name = 'Club De Nuit Intense' THEN 3200
      WHEN p.name = 'Hunter Intense' THEN 2900
      WHEN p.name = 'Hawas' THEN 2800
    END AS unit_price,
    CASE
      WHEN p.name = 'Club De Nuit Intense' THEN 3200
      WHEN p.name = 'Hunter Intense' THEN 2900
      WHEN p.name = 'Hawas' THEN 2800
    END AS line_total,
    CASE
      WHEN p.name = 'Club De Nuit Intense' THEN 3200
      WHEN p.name = 'Hunter Intense' THEN 1300
      WHEN p.name = 'Hawas' THEN 0
    END AS amount_paid
  FROM demo_products p
  CROSS JOIN sale
  WHERE p.name IN ('Club De Nuit Intense', 'Hunter Intense', 'Hawas');

  -- Sale 3: Ana Martinez - PAID
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
      NOW() - INTERVAL '1 day',
      7600,
      7600,
      0,
      'paid',
      'DOP',
      58.5
    FROM customer
    RETURNING id
  )
  INSERT INTO demo_sale_items (sale_id, product_id, quantity, unit_price, line_total, amount_paid)
  SELECT
    sale.id,
    p.id,
    1,
    CASE
      WHEN p.name = 'Amber Oud' THEN 3800
      WHEN p.name = 'Shaghaf Oud' THEN 3800
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
  WHERE p.name IN ('Amber Oud', 'Shaghaf Oud');

  -- =====================================================
  -- 5. CREATE SALE ALLOCATIONS
  -- =====================================================

  -- Allocate Sale 1 items
  INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
  SELECT
    si_sale.id,
    si_ship.id,
    1,
    si_ship.unit_cost
  FROM demo_sale_items si_sale
  JOIN demo_sales s ON si_sale.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si_sale.product_id = p.id
  JOIN demo_shipment_items si_ship ON si_ship.product_id = p.id
  WHERE c.name = 'Maria Garcia' AND p.name = 'Asad';

  INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
  SELECT
    si_sale.id,
    si_ship.id,
    1,
    si_ship.unit_cost
  FROM demo_sale_items si_sale
  JOIN demo_sales s ON si_sale.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si_sale.product_id = p.id
  JOIN demo_shipment_items si_ship ON si_ship.product_id = p.id
  WHERE c.name = 'Maria Garcia' AND p.name = 'Khamrah';

  -- Allocate Sale 2 items
  INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
  SELECT
    si_sale.id,
    si_ship.id,
    1,
    si_ship.unit_cost
  FROM demo_sale_items si_sale
  JOIN demo_sales s ON si_sale.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si_sale.product_id = p.id
  JOIN demo_shipment_items si_ship ON si_ship.product_id = p.id
  WHERE c.name = 'Carlos Rodriguez' AND p.name = 'Club De Nuit Intense';

  INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
  SELECT
    si_sale.id,
    si_ship.id,
    1,
    si_ship.unit_cost
  FROM demo_sale_items si_sale
  JOIN demo_sales s ON si_sale.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si_sale.product_id = p.id
  JOIN demo_shipment_items si_ship ON si_ship.product_id = p.id
  WHERE c.name = 'Carlos Rodriguez' AND p.name = 'Hunter Intense';

  -- Allocate Sale 3 items
  INSERT INTO demo_sale_item_allocations (sale_item_id, shipment_item_id, quantity, unit_cost)
  SELECT
    si_sale.id,
    si_ship.id,
    1,
    si_ship.unit_cost
  FROM demo_sale_items si_sale
  JOIN demo_sales s ON si_sale.sale_id = s.id
  JOIN demo_customers c ON s.customer_id = c.id
  JOIN demo_products p ON si_sale.product_id = p.id
  JOIN demo_shipment_items si_ship ON si_ship.product_id = p.id
  WHERE c.name = 'Ana Martinez' AND p.name = 'Amber Oud';

  -- =====================================================
  -- 6. UPDATE SHIPMENT REVENUE AND PROFIT
  -- =====================================================

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
    your_share = (revenue_calc.total_revenue - sh.total_cost) * 0.5,
    partner_share = (revenue_calc.total_revenue - sh.total_cost) * 0.5
  FROM revenue_calc
  WHERE sh.id = revenue_calc.id;

  RAISE NOTICE 'Demo data re-seeded successfully!';
END;
$$;
