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
  const { session, user, setSession, setIsLoading, isLoading, logout } = useAuthStore();
  const { seedInitialProducts } = useProductsStore();
  const { loadCachedRate } = useExchangeRateStore();
  const { reset: resetShipments } = useShipmentsStore();
  const [migrationComplete, setMigrationComplete] = useState(false);
  const [hasShownLoginNotification, setHasShownLoginNotification] = useState(false);
  const [isFreshLogin, setIsFreshLogin] = useState(false);
  const [remainingTime, setRemainingTime] = useState(60 * 60); // 1 hour for demo sessions
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [demoSessionStartTime, setDemoSessionStartTime] = useState<number | null>(null);
  const [hasShownExpiryAlert, setHasShownExpiryAlert] = useState(false);

  // Initialize exchange rate on app start
  useEffect(() => {
    loadCachedRate();
  }, []);

  // Check for existing session on app start
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        // LOG JWT EXPIRY TIME
        if (session?.expires_at) {
          const expiryDate = new Date(session.expires_at * 1000);
          const now = new Date();
          const minutesUntilExpiry = (expiryDate.getTime() - now.getTime()) / 1000 / 60;
          console.log('🔐 JWT expires at:', expiryDate.toLocaleString());
          console.log('🔐 Minutes until expiry:', Math.floor(minutesUntilExpiry));
          console.log('🔐 Total JWT duration (seconds):', session.expires_in);
        }

        // CRITICAL: Check if demo session is expired
        if (session?.user?.email === 'gjessencedemo@proton.me' || session?.user?.email === 'demo@gandjessence.com') {
          console.log('🔍 Demo account detected on app start - checking session expiry');

          // Fetch demo_session_started_at from database
          const { data: profile } = await supabase
            .from('profiles')
            .select('demo_session_started_at')
            .eq('id', session.user.id)
            .single();

          if (profile?.demo_session_started_at) {
            const sessionStart = new Date(profile.demo_session_started_at).getTime();
            const now = Date.now();
            const elapsed = now - sessionStart;
            const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour for demo sessions

            console.log('⏱️ Demo session age:', Math.floor(elapsed / 1000 / 60), 'minutes');

            if (elapsed >= SESSION_TIMEOUT) {
              console.log('🚫 Demo session EXPIRED - forcing logout on app start');
              // Clear the session immediately
              await supabase.auth.signOut();
              setIsLoading(false);
              return;
            } else {
              console.log('✅ Demo session still valid');
              // Set the start time in memory for the timer
              setDemoSessionStartTime(sessionStart);
            }
          } else {
            console.log('⚠️ No demo session start time found - logging out');
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
          }
        }

        await setSession(session);
        setIsLoading(false);
      } catch (error) {
        console.error('Error checking session:', error);
        setIsLoading(false);
      }
    }

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔑 Auth event:', event);

      // LOG JWT EXPIRY on every auth change
      if (session?.expires_at) {
        const expiryDate = new Date(session.expires_at * 1000);
        const now = new Date();
        const minutesUntilExpiry = (expiryDate.getTime() - now.getTime()) / 1000 / 60;
        console.log('🔐 JWT expires at:', expiryDate.toLocaleString());
        console.log('🔐 Minutes until expiry:', Math.floor(minutesUntilExpiry));
        console.log('🔐 Total JWT duration (seconds):', session.expires_in);
      } else {
        console.log('⚠️ Session has no expires_at!');
      }

      // Detect fresh login vs session restore
      const isNewLogin = event === 'SIGNED_IN';
      setIsFreshLogin(isNewLogin);
      await setSession(session, isNewLogin);
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

  // Demo account: Show login notification and start timer on fresh login
  useEffect(() => {
    // Wait for both session and user to be set
    if (!session || !user || !isDemoAccount()) {
      // Reset flags when logged out
      if (!session) {
        setHasShownLoginNotification(false);
        setIsFreshLogin(false);
        setDemoSessionStartTime(null);
        setHasShownExpiryAlert(false);
      }
      return;
    }

    // Only show notification on FRESH login, not session restore
    if (hasShownLoginNotification || !isFreshLogin) return;

    // Set session start time in memory
    const startTime = Date.now();
    setDemoSessionStartTime(startTime);
    console.log('⏱️ Demo session started at:', new Date(startTime).toLocaleString());

    // Small delay to ensure UI is ready, then show notification
    const timer = setTimeout(() => {
      Alert.alert(
        'Demo Session Started',
        'You have 1 hour to explore the app. Your session will automatically expire after 1 hour.',
        [{
          text: 'OK',
          onPress: () => {
            setHasShownLoginNotification(true);
          }
        }],
        { cancelable: false } // Prevent dismissing by tapping outside
      );
    }, 500);

    return () => clearTimeout(timer);
  }, [session, user, hasShownLoginNotification, isFreshLogin]);

  // Auto-refresh session every 25 minutes to prevent JWT expiry (only for regular users)
  useEffect(() => {
    if (!session || isDemoAccount()) return; // Skip demo - let JWT expire at 1 hour

    const refreshSession = async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data.session) {
          await setSession(data.session);
          console.log('🔄 Demo session refreshed automatically');
        }
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
    };

    // Refresh session every 25 minutes (before 30-min JWT expiry)
    const refreshInterval = setInterval(refreshSession, 25 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [session, setSession]);

  // Simple countdown timer for demo accounts - uses memory (no DB queries)
  useEffect(() => {
    if (!session || !user || !isDemoAccount() || !demoSessionStartTime) {
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - demoSessionStartTime;
      const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour for demo sessions
      const secondsLeft = Math.max(0, Math.floor((SESSION_TIMEOUT - elapsed) / 1000));
      setRemainingTime(secondsLeft);
    };

    // Update immediately
    updateTimer();

    // Then update every second
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [session, user, demoSessionStartTime]);

  // Logout immediately when timer reaches 0
  useEffect(() => {
    if (remainingTime === 0 && session && isDemoAccount() && !isLoggingOut && !hasShownExpiryAlert) {
      console.log('⏰ Timer expired - showing logout alert');
      setHasShownExpiryAlert(true); // Prevent alert from showing again

      Alert.alert(
        'Session Expired',
        'Your demo session has expired (1 hour limit). You will be logged out.',
        [{
          text: 'OK',
          onPress: async () => {
            console.log('🚪 User clicked OK - starting logout');
            setIsLoggingOut(true); // Show modal AFTER user clicks OK
            try {
              await logout();
              console.log('✅ Demo user logged out successfully');
            } catch (error) {
              console.error('❌ Logout error:', error);
            } finally {
              setIsLoggingOut(false);
            }
          }
        }],
        { cancelable: false }
      );
    }
  }, [remainingTime, session, isLoggingOut, hasShownExpiryAlert]);

  // Reset timer when logging out
  useEffect(() => {
    if (!session) {
      setRemainingTime(60 * 60); // Reset to 1 hour
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
        {session && isDemoAccount() && (
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
