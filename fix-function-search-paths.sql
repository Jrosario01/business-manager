-- Fix Function Search Path Mutable warnings
-- This adds a fixed search_path to all functions to prevent SQL injection attacks
-- Issue: Supabase linter flagged functions without search_path as security risks

-- =====================================================
-- Set search_path for all flagged functions
-- =====================================================

-- 1. update_inventory_after_sale
ALTER FUNCTION public.update_inventory_after_sale() SET search_path = '';

-- 2. restore_inventory_after_sale_delete
ALTER FUNCTION public.restore_inventory_after_sale_delete() SET search_path = '';

-- 3. apply_inventory_adjustment (trigger function - no parameters)
ALTER FUNCTION public.apply_inventory_adjustment() SET search_path = '';

-- 4. get_shipment_sales_with_allocations
ALTER FUNCTION public.get_shipment_sales_with_allocations(p_shipment_id UUID) SET search_path = '';

-- 5. demo_get_available_inventory
ALTER FUNCTION public.demo_get_available_inventory(p_brand TEXT, p_name TEXT, p_size TEXT) SET search_path = '';

-- 6. demo_get_shipment_sales_with_allocations
ALTER FUNCTION public.demo_get_shipment_sales_with_allocations(p_shipment_id UUID) SET search_path = '';

-- 7. get_available_inventory
ALTER FUNCTION public.get_available_inventory(p_brand TEXT, p_name TEXT, p_size TEXT) SET search_path = '';

-- 8. reseed_demo_data
ALTER FUNCTION public.reseed_demo_data() SET search_path = '';

-- 9. truncate_demo_tables
ALTER FUNCTION public.truncate_demo_tables() SET search_path = '';

-- 10. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- 11. handle_new_user
ALTER FUNCTION public.handle_new_user() SET search_path = '';

-- =====================================================
-- Verify the fix
-- =====================================================

-- Check that functions now have search_path set
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_inventory_after_sale',
    'restore_inventory_after_sale_delete',
    'apply_inventory_adjustment',
    'get_shipment_sales_with_allocations',
    'demo_get_available_inventory',
    'demo_get_shipment_sales_with_allocations',
    'get_available_inventory',
    'reseed_demo_data',
    'truncate_demo_tables',
    'update_updated_at_column',
    'handle_new_user'
  )
ORDER BY p.proname;

-- You should see "SET search_path TO ''" in each function definition
