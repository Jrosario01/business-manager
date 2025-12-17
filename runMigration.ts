// Standalone migration script
// Run with: npx ts-node runMigration.ts

import { migrateToSupabase, backupAsyncStorageData } from './src/utils/migrateToSupabase';

async function run() {
  console.log('🚀 Starting data migration...\n');

  try {
    // Backup first
    console.log('📦 Creating backup...');
    await backupAsyncStorageData();
    console.log('✅ Backup complete\n');

    // Run migration
    console.log('🔄 Migrating data from AsyncStorage to Supabase...\n');
    const results = await migrateToSupabase();

    console.log('\n✨ Migration complete!');
    console.log('\nYou can now check your app - data should be restored.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

run();
