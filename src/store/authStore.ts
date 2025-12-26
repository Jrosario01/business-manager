import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { Profile } from '../types';
import { isDemoAccount } from '../utils/isDemoAccount';
import { clearDemoTables } from '../utils/clearDemoTables';

interface AuthState {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  sessionStartTime: number | null;
  SESSION_TIMEOUT: number;
  setUser: (user: Profile | null) => void;
  setSession: (session: any | null) => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
  checkSessionTimeout: () => boolean;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      sessionStartTime: null,
      SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour in milliseconds

      setUser: (user) => set({ user }),

      setSession: async (session) => {
        set({
          session,
          sessionStartTime: session ? Date.now() : null
        });

        // Extract and set user from session
        if (session?.user) {
          // Fetch user profile from database
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            set({ user: profile });
          } else {
            // If no profile, create a minimal user object with email
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

      checkSessionTimeout: () => {
        const { sessionStartTime, SESSION_TIMEOUT, logout } = get();

        if (sessionStartTime && Date.now() - sessionStartTime > SESSION_TIMEOUT) {
          Alert.alert(
            'Session Expired',
            'Demo session has expired (1 hour limit)',
            [{ text: 'OK', onPress: () => logout() }]
          );
          return true;
        }
        return false;
      },

      logout: async () => {
        const { user } = get();

        // If demo account, clear all demo tables before logging out
        if (user?.email && isDemoAccount()) {
          try {
            await clearDemoTables();
            console.log('✅ Demo data cleared on logout');
          } catch (error) {
            console.error('Error clearing demo tables:', error);
            // Continue with logout even if cleanup fails
          }
        }

        // Sign out from Supabase
        await supabase.auth.signOut();

        // Clear local state
        set({
          user: null,
          session: null,
          sessionStartTime: null
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        sessionStartTime: state.sessionStartTime
      }),
    }
  )
);
