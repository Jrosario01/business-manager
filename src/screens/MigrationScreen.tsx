import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { migrateToSupabase, backupAsyncStorageData } from '../utils/migrateToSupabase';

export default function MigrationScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleMigrate = async () => {
    Alert.alert(
      'Migrate Data to Supabase',
      'This will copy your data from local storage to Supabase. Your local data will NOT be deleted.\n\nReady to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate',
          onPress: async () => {
            setIsRunning(true);
            setResults(null);

            try {
              // Create backup first
              console.log('Creating backup...');
              await backupAsyncStorageData();

              // Run migration
              console.log('Starting migration...');
              const migrationResults = await migrateToSupabase();
              setResults(migrationResults);

              Alert.alert(
                'Migration Complete!',
                `Products: ${migrationResults.products.migrated} migrated\nCustomers: ${migrationResults.customers.migrated} migrated\nSales: ${migrationResults.sales.migrated} migrated`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Migration Error', (error as Error).message);
            } finally {
              setIsRunning(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Data Migration</Text>
        <Text style={styles.subtitle}>
          Migrate your data from local storage to Supabase
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ What this does:</Text>
          <Text style={styles.infoText}>
            • Copies products from AsyncStorage to Supabase{'\n'}
            • Copies customers from AsyncStorage to Supabase{'\n'}
            • Copies sales from AsyncStorage to Supabase{'\n'}
            • Creates a backup before migrating{'\n'}
            • Does NOT delete your local data
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={handleMigrate}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Migrating...' : 'Start Migration'}
          </Text>
        </TouchableOpacity>

        {results && (
          <View style={styles.resultsBox}>
            <Text style={styles.resultsTitle}>Migration Results:</Text>

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>📦 Products:</Text>
              <Text style={styles.resultText}>
                ✅ {results.products.migrated} migrated{'\n'}
                ⏭️ {results.products.skipped} already existed{'\n'}
                {results.products.errors > 0 && `❌ ${results.products.errors} errors\n`}
              </Text>
            </View>

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>👥 Customers:</Text>
              <Text style={styles.resultText}>
                ✅ {results.customers.migrated} migrated{'\n'}
                ⏭️ {results.customers.skipped} already existed{'\n'}
                {results.customers.errors > 0 && `❌ ${results.customers.errors} errors\n`}
              </Text>
            </View>

            <View style={styles.resultSection}>
              <Text style={styles.resultLabel}>💰 Sales:</Text>
              <Text style={styles.resultText}>
                ✅ {results.sales.migrated} migrated{'\n'}
                {results.sales.errors > 0 && `❌ ${results.sales.errors} errors\n`}
              </Text>
            </View>

            {results.errors.length > 0 && (
              <View style={styles.errorsBox}>
                <Text style={styles.errorsTitle}>Errors:</Text>
                {results.errors.map((error: string, index: number) => (
                  <Text key={index} style={styles.errorText}>
                    • {error}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>📝 Important Notes:</Text>
          <Text style={styles.notesText}>
            • Run this migration only ONCE{'\n'}
            • After migration, your data will be in Supabase{'\n'}
            • Both you and your cousin will see the same data{'\n'}
            • You can safely close this screen after migration
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsBox: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  resultSection: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  errorsBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#D32F2F',
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#EF6C00',
    lineHeight: 22,
  },
});
