import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setIsLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, session: null }),
}));
