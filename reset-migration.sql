-- Complete reset script - USE WITH CAUTION!
-- This will delete ALL data and allow you to re-migrate from AsyncStorage
-- Run this in Supabase SQL Editor

-- ============================================
-- OPTION 1: SOFT RESET (Keep structure, clear data)
-- ============================================

-- Uncomment the lines below if you want to clear all data but keep the tables

-- DELETE FROM sale_item_allocations;
-- DELETE FROM inventory_adjustments;
-- DELETE FROM sale_items;
-- DELETE FROM sales;
-- DELETE FROM payments;
-- DELETE FROM returns;
-- DELETE FROM shipment_items;
-- DELETE FROM shipments;
-- DELETE FROM customers;
-- DELETE FROM products;

-- RAISE NOTICE 'All data cleared. Tables still exist.';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT
  'After Reset' as status,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM sales) as sales,
  (SELECT COUNT(*) FROM sale_items) as sale_items,
  (SELECT COUNT(*) FROM shipments) as shipments;
