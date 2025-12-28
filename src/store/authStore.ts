import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { Profile } from '../types';
import { clearDemoTables } from '../utils/clearDemoTables';

interface AuthState {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setSession: (session: any | null, isFreshLogin?: boolean) => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,

      setUser: (user) => set({ user }),

      setSession: async (session, isFreshLogin = false) => {
        set({ session });

        // Extract and set user from session
        if (session?.user) {
          try {
            console.log('👤 Fetching user profile for:', session.user.email);

            // Fetch user profile from database with timeout
            const profilePromise = supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Profile fetch timeout')), 15000)
            );

            const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

            if (error) {
              console.warn('⚠️ Profile fetch error:', error.message);
            }

            if (profile) {
              console.log('✅ User profile loaded:', profile.email);
              set({ user: profile });

              // If demo user and fresh login, set session start time in database
              if (isFreshLogin && (profile.email === 'gjessencedemo@proton.me' || profile.email === 'demo@gandjessence.com')) {
                console.log('🕐 Setting demo session start time in database');
                await supabase
                  .from('profiles')
                  .update({ demo_session_started_at: new Date().toISOString() })
                  .eq('id', session.user.id);
              }
            } else {
              // If no profile, create a minimal user object with email
              console.log('⚠️ No profile found, using session email');
              set({
                user: {
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.email,
                } as Profile
              });
            }
          } catch (error) {
            console.error('❌ Failed to fetch profile:', error);
            // Fallback: use session email
            set({
              user: {
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.email,
              } as Profile
            });
          }
        } else {
          set({ user: null });
        }
      },

      setIsLoading: (isLoading) => set({ isLoading }),

      logout: async () => {
        try {
          const currentUser = get().user;
          console.log('🔍 Logout - user email:', currentUser?.email);
          const isDemo = currentUser?.email === 'gjessencedemo@proton.me' || currentUser?.email === 'demo@gandjessence.com';
          console.log('🔍 Is demo account:', isDemo);

          // For demo accounts: clear session start time and reseed tables
          if (isDemo && currentUser?.id) {
            console.log('🕐 Clearing demo session start time in database');
            // Clear the session start time (non-blocking)
            supabase
              .from('profiles')
              .update({ demo_session_started_at: null })
              .eq('id', currentUser.id)
              .then(() => console.log('✅ Demo session time cleared'))
              .catch(error => console.error('⚠️ Failed to clear session time:', error));

            console.log('🧹 Demo logout - clearing and reseeding tables in background...');
            // Fire and forget - don't block logout
            clearDemoTables()
              .then(() => console.log('✅ Demo tables cleared and reseeded'))
              .catch(error => console.error('⚠️ Failed to clear demo tables:', error));
          }

          // Sign out from Supabase with timeout protection
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Logout timeout')), 10000)
          );

          await Promise.race([
            supabase.auth.signOut(),
            timeoutPromise
          ]).catch(error => {
            console.warn('Logout error (continuing anyway):', error);
          });

          // For demo accounts: explicitly clear AsyncStorage to prevent session restoration
          if (isDemo) {
            try {
              await AsyncStorage.removeItem('auth-storage');
              console.log('🗑️ AsyncStorage cleared for demo account');
            } catch (error) {
              console.warn('Failed to clear AsyncStorage:', error);
            }
          }
        } finally {
          // Always clear local state even if signOut fails
          set({
            user: null,
            session: null
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // For demo accounts: DON'T persist session (fresh login every time)
        // For regular accounts: persist session (restore on app restart)

        // Check both state.user.email AND state.session.user.email (for race condition during login)
        const userEmail = state.user?.email || state.session?.user?.email;
        const isDemo =
          userEmail === 'gjessencedemo@proton.me' ||
          userEmail === 'demo@gandjessence.com';

        if (isDemo) {
          console.log('🚫 Demo account - NOT persisting session to storage');
          return {}; // Don't persist anything for demo
        }

        return {
          session: state.session,
          user: state.user
        };
      },
    }
  )
);
