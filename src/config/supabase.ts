import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase configuration - hardcoded for production builds
const SUPABASE_URL = 'https://gfuczxlwhzinyfzcdwii.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdWN6eGx3aHppbnlmemNkd2lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTY4ODcsImV4cCI6MjA4MDg5Mjg4N30.BF2qTjfu4wjr1YXhujJdc2CceQlWyUM75hBcr_rN38s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
