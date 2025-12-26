import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Alert, Text, TouchableOpacity, Modal } from 'react-native';

// i18n
import './src/i18n/i18n';

// Supabase
import { supabase } from './src/config/supabase';
import { useAuthStore } from './src/store/authStore';
import { useProductsStore } from './src/store/productsStore';
import { useExchangeRateStore } from './src/store/exchangeRateStore';
import { useShipmentsStore } from './src/store/shipmentsStore';
import { migrateToSupabase, backupAsyncStorageData } from './src/utils/migrateToSupabase';
import { isDemoAccount } from './src/utils/isDemoAccount';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import AuthScreen from './src/screens/AuthScreen';
import DrawerNavigator from './src/navigation/DrawerNavigator';

const Stack = createNativeStackNavigator();

export default function App() {
  const { session, user, setSession, setIsLoading, isLoading, checkSessionTimeout } = useAuthStore();
  const { seedInitialProducts } = useProductsStore();
  const { loadCachedRate } = useExchangeRateStore();
  const { reset: resetShipments } = useShipmentsStore();
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [hasShownLoginNotification, setHasShownLoginNotification] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60 * 60); // 60 minutes in seconds
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Initialize exchange rate on app start
  useEffect(() => {
    loadCachedRate();
  }, []);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Reset stores when demo user logs in
  useEffect(() => {
    if (session && user && isDemoAccount()) {
      console.log('🔄 Demo user logged in - resetting stores');
      resetShipments();
    }
  }, [session, user]);

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

  // Auto-seed initial products (DISABLED - user wants to start fresh)
  // useEffect(() => {
  //   async function autoSeedProducts() {
  //     if (!session) return;

  //     try {
  //       console.log('📦 Checking if products need to be seeded...');
  //       await seedInitialProducts();
  //     } catch (error) {
  //       console.error('Product seeding error:', error);
  //     }
  //   }

  //   autoSeedProducts();
  // }, [session]);

  // Demo account: Show login notification and set up timeout checker
  useEffect(() => {
    // Wait for both session and user to be set
    if (!session || !user || !isDemoAccount()) {
      // Reset notification flag when logged out
      if (!session) {
        setHasShownLoginNotification(false);
      }
      return;
    }

    // Only show notification once per login
    if (hasShownLoginNotification) return;

    // Show notification on login and start timer when user clicks OK
    Alert.alert(
      'Demo Session Started',
      'You have 1 hour to explore the app. Your session will automatically expire.',
      [{
        text: 'OK',
        onPress: () => {
          setHasShownLoginNotification(true);
        }
      }]
    );
  }, [session, user, hasShownLoginNotification]);

  // Check session timeout every minute for demo accounts
  useEffect(() => {
    if (!session || !isDemoAccount()) return;

    const timeoutChecker = setInterval(() => {
      checkSessionTimeout();
    }, 60 * 1000); // Check every minute

    return () => clearInterval(timeoutChecker);
  }, [session, checkSessionTimeout]);

  // Countdown timer for demo accounts (starts after notification is dismissed)
  useEffect(() => {
    if (!session || !isDemoAccount() || !hasShownLoginNotification) return;

    const timer = setInterval(() => {
      setRemainingTime((prevTime) => {
        if (prevTime <= 0) {
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, [session, hasShownLoginNotification]);

  // Trigger logout when timer reaches 0
  useEffect(() => {
    if (remainingTime === 0 && session && isDemoAccount() && hasShownLoginNotification) {
      const { logout } = useAuthStore.getState();
      Alert.alert(
        'Session Expired',
        'Demo session has expired (1 hour limit)',
        [{
          text: 'OK',
          onPress: async () => {
            setIsLoggingOut(true);
            await logout();
            setIsLoggingOut(false);
          }
        }]
      );
    }
  }, [remainingTime, session, hasShownLoginNotification]);

  // Reset timer when logging out
  useEffect(() => {
    if (!session) {
      setRemainingTime(60 * 60); // Reset to 60 minutes
    }
  }, [session]);

  // Format remaining time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading until both session AND user are ready (or no session)
  if (isLoading || (session && !user)) {
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

        {/* Floating timer button for demo accounts */}
        {session && isDemoAccount() && hasShownLoginNotification && (
          <View style={styles.floatingTimerContainer}>
            <TouchableOpacity style={styles.floatingTimer} activeOpacity={0.9}>
              <Text style={styles.timerIcon}>⏱️</Text>
              <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </NavigationContainer>

      {/* Logout Loading Modal */}
      <Modal
        visible={isLoggingOut}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutCard}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.logoutText}>Signing out...</Text>
            <Text style={styles.logoutSubtext}>Resetting demo data</Text>
          </View>
        </View>
      </Modal>
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
  floatingTimerContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 9999,
  },
  floatingTimer: {
    backgroundColor: '#007AFF',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  timerIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    minWidth: 200,
  },
  logoutText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
});
