import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

const CURRENCYAPI_KEY = 'cur_live_O4zQWzS1GCVAWEampaYbPd7xO05a8j3rGukdNaHY'; // User will need to add their API key
const CACHE_KEY = '@exchange_rate_cache';
const LAST_FETCH_KEY = '@last_rate_fetch';
const FETCH_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds (twice daily)

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
  isManual: boolean;
}

interface ExchangeRateHistory {
  id: string;
  rate: number;
  fetched_at: string;
  source: string;
}

interface ExchangeRateState {
  // State
  usdToDop: number;
  lastUpdated: Date | null;
  isManual: boolean;
  isLoading: boolean;
  error: string | null;
  history: ExchangeRateHistory[];

  // Actions
  fetchRate: () => Promise<void>;
  setManualRate: (rate: number) => Promise<void>;
  enableAutoFetch: () => Promise<void>;
  loadCachedRate: () => Promise<void>;
  loadHistoricRates: (days?: number) => Promise<void>;
  convertToDop: (usd: number) => number;
  convertToUsd: (dop: number) => number;
  shouldFetchNewRate: () => Promise<boolean>;
}

export const useExchangeRateStore = create<ExchangeRateState>((set, get) => ({
  // Initial state
  usdToDop: 62.25, // Default fallback rate for Dominican Peso
  lastUpdated: null,
  isManual: false,
  isLoading: false,
  error: null,
  history: [],

  // Check if we should fetch a new rate (every 12 hours)
  shouldFetchNewRate: async () => {
    try {
      const lastFetchStr = await AsyncStorage.getItem(LAST_FETCH_KEY);
      if (!lastFetchStr) {
        console.log('No last fetch time found, should fetch');
        return true;
      }

      const lastFetch = parseInt(lastFetchStr);
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetch;
      const hoursSinceLastFetch = timeSinceLastFetch / (60 * 60 * 1000);

      console.log(`Last fetch was ${hoursSinceLastFetch.toFixed(1)} hours ago`);

      const shouldFetch = timeSinceLastFetch >= FETCH_INTERVAL;
      console.log(`Should fetch new rate: ${shouldFetch}`);

      return shouldFetch;
    } catch (error) {
      console.error('Error checking last fetch time:', error);
      return true;
    }
  },

  // Load cached rate from database or AsyncStorage
  loadCachedRate: async () => {
    try {
      console.log('Loading exchange rate...');

      // Check if we should fetch a new rate based on last fetch time
      const shouldFetch = await get().shouldFetchNewRate();

      // First, try to load the latest rate from database
      const { data: latestRate, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && latestRate) {
        console.log(`Found latest rate from database: ${latestRate.rate}`);
        set({
          usdToDop: latestRate.rate,
          lastUpdated: new Date(latestRate.fetched_at),
          isManual: false,
        });

        // Only fetch if 12 hours have passed
        if (shouldFetch) {
          console.log('12 hours passed since last fetch, fetching new rate in background...');
          // Fetch in background without awaiting
          get().fetchRate().catch(err => console.error('Background fetch error:', err));
        } else {
          console.log('Using database rate (last fetch was less than 12 hours ago)');
        }
        return;
      }

      console.log('No rate in database, checking AsyncStorage...');

      // Fallback to AsyncStorage if database has no rates
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data: ExchangeRateCache = JSON.parse(cached);
        set({
          usdToDop: data.rate,
          lastUpdated: new Date(data.timestamp),
          isManual: data.isManual,
        });
        console.log(`Using cached rate: 1 USD = ${data.rate} DOP`);

        // Only fetch if needed
        if (shouldFetch) {
          console.log('Fetching fresh rate...');
          await get().fetchRate();
        }
      } else {
        // No cached data at all, fetch immediately
        console.log('No cached data found, fetching fresh rate...');
        await get().fetchRate();
      }
    } catch (error) {
      console.error('Error loading cached rate:', error);
      // Only fetch if we don't have a rate already
      const { usdToDop } = get();
      if (usdToDop === 62.25) {
        // Still using default, try to fetch
        await get().fetchRate();
      }
    }
  },

  // Fetch rate from CurrencyAPI
  fetchRate: async () => {
    const { isManual } = get();

    // Don't auto-fetch if rate is manually set
    if (isManual) {
      console.log('Skipping fetch - manual rate is set');
      return;
    }

    console.log('Fetching exchange rate from CurrencyAPI...');
    set({ isLoading: true, error: null });

    try {
      const apiUrl = `https://api.currencyapi.com/v3/latest?apikey=${CURRENCYAPI_KEY}&currencies=DOP&base_currency=USD`;
      console.log('API URL:', apiUrl.replace(CURRENCYAPI_KEY, 'HIDDEN_KEY'));

      const response = await fetch(apiUrl);

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API Response data:', JSON.stringify(data, null, 2));

      const rate = data.data?.DOP?.value;

      if (!rate || isNaN(rate)) {
        console.error('Invalid rate in response:', data);
        throw new Error('Invalid rate received from API');
      }

      const now = Date.now();
      const cacheData: ExchangeRateCache = {
        rate,
        timestamp: now,
        isManual: false,
      };

      // Save to cache (for backwards compatibility)
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      // Save last fetch timestamp
      await AsyncStorage.setItem(LAST_FETCH_KEY, now.toString());
      console.log('Exchange rate cached successfully');

      // Save to database
      try {
        const { data: insertedData, error: dbError } = await supabase
          .from('exchange_rates')
          .insert({
            rate,
            fetched_at: new Date(now).toISOString(),
            source: 'currencyapi',
          })
          .select();

        if (dbError) {
          console.error('❌ ERROR saving rate to database:', dbError);
          console.error('Error details:', JSON.stringify(dbError, null, 2));
        } else {
          console.log('✅ Exchange rate saved to database successfully');
          console.log('Inserted data:', insertedData);
        }
      } catch (dbErr) {
        console.error('❌ Database save error (catch):', dbErr);
      }

      set({
        usdToDop: rate,
        lastUpdated: new Date(now),
        isManual: false,
        isLoading: false,
        error: null,
      });

      console.log(`✅ Exchange rate updated: 1 USD = ${rate.toFixed(4)} DOP`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch exchange rate';
      console.error('❌ Error fetching exchange rate:', errorMessage);

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Keep using cached/default rate on error
    }
  },

  // Manually set exchange rate
  setManualRate: async (rate: number) => {
    if (rate <= 0 || isNaN(rate)) {
      set({ error: 'Invalid exchange rate' });
      return;
    }

    const now = Date.now();
    const cacheData: ExchangeRateCache = {
      rate,
      timestamp: now,
      isManual: true,
    };

    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      set({
        usdToDop: rate,
        lastUpdated: new Date(now),
        isManual: true,
        error: null,
      });

      console.log(`Manual exchange rate set: 1 USD = ${rate.toFixed(2)} DOP`);
    } catch (error) {
      console.error('Error saving manual rate:', error);
      set({ error: 'Failed to save manual rate' });
    }
  },

  // Re-enable auto-fetch (disable manual mode)
  enableAutoFetch: async () => {
    set({ isManual: false });
    await get().fetchRate();
  },

  // Load historic exchange rates from database
  loadHistoricRates: async (days: number = 30) => {
    try {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      console.log(`Loading historic rates from last ${days} days...`);

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .gte('fetched_at', daysAgo.toISOString())
        .order('fetched_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading historic rates:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return;
      }

      set({ history: data || [] });
      console.log(`✅ Loaded ${data?.length || 0} historic exchange rates`);
      if (data && data.length > 0) {
        console.log('Most recent rate:', data[0]);
      }
    } catch (error) {
      console.error('❌ Error loading historic rates (catch):', error);
    }
  },

  // Convert USD to DOP
  convertToDop: (usd: number) => {
    const { usdToDop } = get();
    return usd * usdToDop;
  },

  // Convert DOP to USD
  convertToUsd: (dop: number) => {
    const { usdToDop } = get();
    return dop / usdToDop;
  },
}));

// Helper function to format dual currency
export const formatDualCurrency = (usd: number, showPrimary: 'USD' | 'DOP' = 'USD'): string => {
  const { usdToDop } = useExchangeRateStore.getState();
  const dop = usd * usdToDop;

  if (showPrimary === 'USD') {
    return `$${usd.toFixed(2)} USD (${dop.toFixed(2)} DOP)`;
  } else {
    return `$${dop.toFixed(2)} DOP ($${usd.toFixed(2)} USD)`;
  }
};

// Helper to format currency with symbol
export const formatCurrencyUSD = (amount: number): string => `$${amount.toFixed(2)} USD`;
export const formatCurrencyDOP = (amount: number): string => `$${amount.toFixed(2)} DOP`;
