import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENCYAPI_KEY = 'cur_live_O4zQWzS1GCVAWEampaYbPd7xO05a8j3rGukdNaHY'; // User will need to add their API key
const CACHE_KEY = '@exchange_rate_cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
  isManual: boolean;
}

interface ExchangeRateState {
  // State
  usdToDop: number;
  lastUpdated: Date | null;
  isManual: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRate: () => Promise<void>;
  setManualRate: (rate: number) => Promise<void>;
  enableAutoFetch: () => Promise<void>;
  loadCachedRate: () => Promise<void>;
  convertToDop: (usd: number) => number;
  convertToUsd: (dop: number) => number;
}

export const useExchangeRateStore = create<ExchangeRateState>((set, get) => ({
  // Initial state
  usdToDop: 62.25, // Default fallback rate for Dominican Peso
  lastUpdated: null,
  isManual: false,
  isLoading: false,
  error: null,

  // Load cached rate from AsyncStorage
  loadCachedRate: async () => {
    try {
      console.log('Loading cached exchange rate...');
      const cached = await AsyncStorage.getItem(CACHE_KEY);

      if (cached) {
        const data: ExchangeRateCache = JSON.parse(cached);
        const now = Date.now();
        const age = now - data.timestamp;

        console.log(`Found cached rate: ${data.rate}, age: ${Math.round(age / 1000 / 60)} minutes`);

        // Use cached rate if it's fresh or manually set
        if (data.isManual || age < CACHE_DURATION) {
          set({
            usdToDop: data.rate,
            lastUpdated: new Date(data.timestamp),
            isManual: data.isManual,
          });
          console.log(`Using cached rate: 1 USD = ${data.rate} DOP`);
          return;
        }

        console.log('Cache expired, fetching fresh rate...');
      } else {
        console.log('No cache found, fetching fresh rate...');
      }

      // If no valid cache, fetch fresh rate
      await get().fetchRate();
    } catch (error) {
      console.error('Error loading cached rate:', error);
      // Fetch fresh rate even if cache loading failed
      await get().fetchRate();
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

      // Save to cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('Exchange rate cached successfully');

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
