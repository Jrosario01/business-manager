-- Clear all sales, shipments, and inventory data
-- Keep customers and product catalog

-- Delete all sales and related data
DELETE FROM sale_items;
DELETE FROM sales;

-- Delete all shipments and related items
DELETE FROM shipment_items;
DELETE FROM shipments;

-- Success message
SELECT 'Data cleared successfully. Customers and catalog preserved.' as result;
