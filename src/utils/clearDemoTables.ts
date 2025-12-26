import { supabase } from '../config/supabase';

export const clearDemoTables = async () => {
  try {
    console.log('🧹 Clearing user-added demo data...');

    // Step 1: Truncate all demo tables
    const { error: truncateError } = await supabase.rpc('truncate_demo_tables');

    if (truncateError) {
      console.error('Error truncating demo tables:', truncateError);
      throw truncateError;
    }

    console.log('✅ Demo tables truncated');

    // Step 2: Re-seed initial demo data
    console.log('🌱 Re-seeding initial demo data...');

    const { error: reseedError } = await supabase.rpc('reseed_demo_data');

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
