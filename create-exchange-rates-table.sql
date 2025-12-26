-- Create exchange_rates table for historic exchange rate tracking
-- This table will store USD to DOP exchange rates fetched twice daily

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate DECIMAL(10, 4) NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'fxratesapi',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at ON exchange_rates(fetched_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read exchange rates
CREATE POLICY "Allow public read access to exchange rates"
  ON exchange_rates
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can insert exchange rates
CREATE POLICY "Allow authenticated insert to exchange rates"
  ON exchange_rates
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Add comment to table
COMMENT ON TABLE exchange_rates IS 'Stores historic USD to DOP exchange rates fetched twice daily';
COMMENT ON COLUMN exchange_rates.rate IS 'Exchange rate from USD to DOP';
COMMENT ON COLUMN exchange_rates.fetched_at IS 'Timestamp when the rate was fetched from the API';
COMMENT ON COLUMN exchange_rates.source IS 'Source of the exchange rate (e.g., fxratesapi)';
