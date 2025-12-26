import { useAuthStore } from '../store/authStore';

// Hardcoded demo account email
const DEMO_EMAIL = 'gjessencedemo@proton.me';

export const isDemoAccount = (): boolean => {
  const { user } = useAuthStore.getState();
  if (!user?.email) return false;

  // Check if user email matches the hardcoded demo email
  return user.email.toLowerCase() === DEMO_EMAIL.toLowerCase();
};
