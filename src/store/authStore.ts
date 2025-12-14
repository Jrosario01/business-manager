import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Profile } from '../types';

interface AuthState {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setSession: (session: any | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setIsLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, session: null }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user
      }),
    }
  )
);
