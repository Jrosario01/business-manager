-- Add perfume products to catalog
-- Costs are wholesale prices in USD (default/reference prices)
-- These costs will be used as defaults when creating shipments

INSERT INTO products (sku, brand, name, cost, size, active) VALUES
  -- Armaf
  ('ARMAF-ODYSSEY-MEGA', 'Armaf', 'Odyssey Mega', 20.00, '100ml', true),
  ('ARMAF-ODYSSEY-AQUA', 'Armaf', 'Odyssey Aqua', 20.00, '100ml', true),
  ('ARMAF-CDNM', 'Armaf', 'Club De Nuit Milestone', 25.00, '100ml', true),
  ('ARMAF-CDNI', 'Armaf', 'Club De Nuit Iconic', 26.00, '100ml', true),

  -- Lattafa
  ('LATTAFA-SUBLIME', 'Lattafa', 'Sublime', 16.00, '100ml', true),
  ('LATTAFA-YARA-PINK', 'Lattafa', 'Yara Pink', 17.00, '100ml', true),
  ('LATTAFA-OFG', 'Lattafa', 'Oud For Glory', 16.00, '100ml', true),
  ('LATTAFA-HONOR-GLORY', 'Lattafa', 'Honor & Glory', 16.00, '100ml', true),
  ('LATTAFA-KHAMRAH-BLACK', 'Lattafa', 'Khamrah Black', 17.00, '100ml', true),
  ('LATTAFA-QAHWA', 'Lattafa', 'Qahwa (Khamrah)', 17.00, '100ml', true),
  ('LATTAFA-MAHIR', 'Lattafa', 'Mahir Legacy', 18.00, '100ml', true),
  ('LATTAFA-KINGDOM', 'Lattafa', 'Lattafa Kingdom', 18.00, '100ml', true),
  ('LATTAFA-ASAD-BLACK', 'Lattafa', 'Asad Black', 17.00, '100ml', true),
  ('LATTAFA-AL-FURSAN', 'Lattafa', 'Al Fursan (Bad''ee Al Oud)', 15.00, '100ml', true),
  ('LATTAFA-PRIDE-LUXE', 'Lattafa (Pride)', 'Luxe St.', 18.00, '100ml', true),
  ('LATTAFA-RAMZ-SILVER', 'Lattafa', 'Ramz Silver', 14.00, '100ml', true),

  -- Afnan
  ('AFNAN-MANDARIN-SKY', 'Afnan', 'Mandarin Sky', 20.00, '100ml', true),
  ('AFNAN-MANDARIN-ELIXIR', 'Afnan', 'Mandarin Sky Elixir', 28.00, '100ml', true),
  ('AFNAN-9PM-BLACK', 'Afnan', '9pm Black', 20.00, '100ml', true),

  -- Rasasi
  ('RASASI-HAWAS-FIRE', 'Rasasi', 'Hawas Fire', 28.00, '100ml', true),
  ('RASASI-HAWAS-ICE', 'Rasasi', 'Hawas Ice', 20.00, '100ml', true)
ON CONFLICT (sku) DO UPDATE SET
  brand = EXCLUDED.brand,
  name = EXCLUDED.name,
  cost = EXCLUDED.cost,
  size = EXCLUDED.size,
  active = EXCLUDED.active;

-- Display confirmation
SELECT COUNT(*) as products_added FROM products WHERE brand IN ('Armaf', 'Lattafa', 'Lattafa (Pride)', 'Afnan', 'Rasasi');
