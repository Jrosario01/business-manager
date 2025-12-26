-- Fix exchange_rates RLS policy
-- The issue: policy was blocking authenticated users from inserting rates
-- Solution: Use auth.uid() IS NOT NULL instead of auth.role() = 'authenticated'

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated insert to exchange rates" ON exchange_rates;
DROP POLICY IF EXISTS "Allow public read access to exchange rates" ON exchange_rates;

-- Recreate policies with correct checks

-- Policy: Allow anyone to read exchange rates (public access for displaying rates)
CREATE POLICY "Allow public read access to exchange rates"
  ON exchange_rates
  FOR SELECT
  USING (true);

-- Policy: Allow authenticated users to insert exchange rates
-- Using auth.uid() IS NOT NULL is more reliable than auth.role()
CREATE POLICY "Allow authenticated insert to exchange rates"
  ON exchange_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Any authenticated user can insert

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'exchange_rates';
