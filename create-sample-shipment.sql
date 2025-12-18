-- Clear all sales, shipments, and inventory data
-- Keep customers and product catalog

DO $$
DECLARE
  v_shipment_id UUID;
  v_product_id UUID;
  v_total_cost NUMERIC := 0;
BEGIN
  -- Clear all existing data
  DELETE FROM sale_item_allocations;
  DELETE FROM sale_items;
  DELETE FROM sales;
  DELETE FROM shipment_items;
  DELETE FROM shipments;

  RAISE NOTICE 'Data cleared successfully';

  -- Create shipment
  INSERT INTO shipments (
    shipment_number,
    status,
    shipped_date,
    delivered_date,
    shipping_cost,
    total_cost,
    notes
  ) VALUES (
    'SHIP-001',
    'delivered',
    '2024-01-15',
    '2024-01-20',
    150.00,
    0,
    'First shipment - Mixed fragrance selection'
  ) RETURNING id INTO v_shipment_id;

  -- Add Armaf Odyssey Mega (6 units @ $20)
  SELECT id INTO v_product_id FROM products WHERE sku = 'ARMAF-ODYSSEY-MEGA';
  INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  VALUES (v_shipment_id, v_product_id, 6, 20.00, 6);
  v_total_cost := v_total_cost + (6 * 20.00);

  -- Add Armaf Club De Nuit Iconic (5 units @ $26)
  SELECT id INTO v_product_id FROM products WHERE sku = 'ARMAF-CDNI';
  INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  VALUES (v_shipment_id, v_product_id, 5, 26.00, 5);
  v_total_cost := v_total_cost + (5 * 26.00);

  -- Add Lattafa Sublime (8 units @ $16)
  SELECT id INTO v_product_id FROM products WHERE sku = 'LATTAFA-SUBLIME';
  INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  VALUES (v_shipment_id, v_product_id, 8, 16.00, 8);
  v_total_cost := v_total_cost + (8 * 16.00);

  -- Add Lattafa Khamrah Black (10 units @ $17)
  SELECT id INTO v_product_id FROM products WHERE sku = 'LATTAFA-KHAMRAH-BLACK';
  INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  VALUES (v_shipment_id, v_product_id, 10, 17.00, 10);
  v_total_cost := v_total_cost + (10 * 17.00);

  -- Add Lattafa Asad Black (7 units @ $17)
  SELECT id INTO v_product_id FROM products WHERE sku = 'LATTAFA-ASAD-BLACK';
  INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  VALUES (v_shipment_id, v_product_id, 7, 17.00, 7);
  v_total_cost := v_total_cost + (7 * 17.00);

  -- Add Afnan Mandarin Sky (6 units @ $20)
  SELECT id INTO v_product_id FROM products WHERE sku = 'AFNAN-MANDARIN-SKY';
  INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  VALUES (v_shipment_id, v_product_id, 6, 20.00, 6);
  v_total_cost := v_total_cost + (6 * 20.00);

  -- Add Rasasi Hawas Fire (4 units @ $28)
  SELECT id INTO v_product_id FROM products WHERE sku = 'RASASI-HAWAS-FIRE';
  INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  VALUES (v_shipment_id, v_product_id, 4, 28.00, 4);
  v_total_cost := v_total_cost + (4 * 28.00);

  -- Add Lattafa Ramz Silver (9 units @ $14)
  SELECT id INTO v_product_id FROM products WHERE sku = 'LATTAFA-RAMZ-SILVER';
  INSERT INTO shipment_items (shipment_id, product_id, quantity, unit_cost, remaining_inventory)
  VALUES (v_shipment_id, v_product_id, 9, 14.00, 9);
  v_total_cost := v_total_cost + (9 * 14.00);

  -- Update shipment total cost (product cost + shipping)
  UPDATE shipments
  SET total_cost = v_total_cost + 150.00
  WHERE id = v_shipment_id;

  RAISE NOTICE 'Shipment created successfully!';
  RAISE NOTICE 'Shipment ID: %', v_shipment_id;
  RAISE NOTICE 'Total units: 55';
  RAISE NOTICE 'Product cost: $%', v_total_cost;
  RAISE NOTICE 'Total cost (incl. shipping): $%', v_total_cost + 150.00;
END $$;

-- Verify the shipment
SELECT
  s.shipment_number,
  s.status,
  s.delivered_date,
  s.total_cost,
  s.shipping_cost,
  COUNT(si.id) as product_count,
  SUM(si.quantity) as total_units
FROM shipments s
LEFT JOIN shipment_items si ON si.shipment_id = s.id
WHERE s.shipment_number = 'SHIP-001'
GROUP BY s.id, s.shipment_number, s.status, s.delivered_date, s.total_cost, s.shipping_cost;

-- Show shipment items
SELECT
  p.brand,
  p.name,
  si.quantity,
  si.unit_cost,
  si.remaining_inventory,
  (si.quantity * si.unit_cost) as line_total
FROM shipment_items si
JOIN products p ON p.id = si.product_id
JOIN shipments s ON s.id = si.shipment_id
WHERE s.shipment_number = 'SHIP-001'
ORDER BY p.brand, p.name;
