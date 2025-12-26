import { supabase } from '../config/supabase';

// Helper to add timeout to promises
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
};

export const clearDemoTables = async () => {
  try {
    console.log('🧹 Clearing user-added demo data...');

    // Step 1: Truncate all demo tables (with 5 second timeout)
    const { error: truncateError } = await withTimeout(
      supabase.rpc('truncate_demo_tables'),
      5000
    );

    if (truncateError) {
      console.error('Error truncating demo tables:', truncateError);
      throw truncateError;
    }

    console.log('✅ Demo tables truncated');

    // Step 2: Re-seed initial demo data (with 5 second timeout)
    console.log('🌱 Re-seeding initial demo data...');

    const { error: reseedError } = await withTimeout(
      supabase.rpc('reseed_demo_data'),
      5000
    );

    if (reseedError) {
      console.error('Error re-seeding demo data:', reseedError);
      throw reseedError;
    }

    console.log('✅ Demo data reset to initial state');
  } catch (error) {
    console.error('Failed to clear demo tables:', error);
    throw error;
  }
};
