import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';

// i18n
import './src/i18n/i18n';

// Supabase
import { supabase } from './src/config/supabase';
import { useAuthStore } from './src/store/authStore';
import { useProductsStore } from './src/store/productsStore';
import { useExchangeRateStore } from './src/store/exchangeRateStore';
import { migrateToSupabase, backupAsyncStorageData } from './src/utils/migrateToSupabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import DrawerNavigator from './src/navigation/DrawerNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  const { session, setSession, setIsLoading, isLoading } = useAuthStore();
  const { seedInitialProducts } = useProductsStore();
  const { loadCachedRate } = useExchangeRateStore();
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Initialize exchange rate on app start
  useEffect(() => {
    loadCachedRate();
  }, []);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-migrate data from AsyncStorage to Supabase (runs once)
  useEffect(() => {
    async function autoMigrate() {
      if (!session || migrationComplete) return;

      try {
        // Check if migration already ran
        const alreadyMigrated = await AsyncStorage.getItem('@migration_complete');
        if (alreadyMigrated === 'true') {
          setMigrationComplete(true);
          return;
        }

        console.log('🔄 Auto-migrating data to Supabase...');

        // Backup first
        await backupAsyncStorageData();

        // Run migration
        const results = await migrateToSupabase();

        // Mark as complete
        await AsyncStorage.setItem('@migration_complete', 'true');
        setMigrationComplete(true);

        console.log('✅ Migration complete!');
        console.log(`Products: ${results.products.migrated} migrated`);
        console.log(`Customers: ${results.customers.migrated} migrated`);
        console.log(`Sales: ${results.sales.migrated} migrated`);

        Alert.alert(
          'Data Restored! ✅',
          `Your data has been migrated to Supabase:\n\n` +
          `Products: ${results.products.migrated}\n` +
          `Customers: ${results.customers.migrated}\n` +
          `Sales: ${results.sales.migrated}\n\n` +
          `Both you and your cousin can now see the same data!`
        );
      } catch (error) {
        console.error('Migration error:', error);
      }
    }

    autoMigrate();
  }, [session, migrationComplete]);

  // Auto-seed initial products (runs once per session)
  useEffect(() => {
    async function autoSeedProducts() {
      if (!session) return;

      try {
        console.log('📦 Checking if products need to be seeded...');
        await seedInitialProducts();
      } catch (error) {
        console.error('Product seeding error:', error);
      }
    }

    autoSeedProducts();
  }, [session]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : (
            <Stack.Screen name="Main" component={DrawerNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
