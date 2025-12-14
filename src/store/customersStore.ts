import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  wishlist: string[];
  totalPurchases: number;
  lastPurchase?: string;
  createdAt: string;
}

interface CustomersState {
  customers: Customer[];
  isLoading: boolean;
  loadCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  searchCustomers: (query: string) => Customer[];
}

const STORAGE_KEY = '@customers_database';

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  isLoading: false,

  loadCustomers: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const customers = JSON.parse(stored);
        set({ customers, isLoading: false });
      } else {
        // Start with empty customer list
        set({ customers: [], isLoading: false });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      set({ isLoading: false });
    }
  },

  addCustomer: async (customer) => {
    const newCustomer: Customer = {
      ...customer,
      id: `customer_${Date.now()}_${Math.random()}`,
      createdAt: new Date().toISOString(),
    };
    const updatedCustomers = [...get().customers, newCustomer];
    set({ customers: updatedCustomers });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
  },

  updateCustomer: async (id, customer) => {
    const updatedCustomers = get().customers.map(c =>
      c.id === id ? { ...c, ...customer } : c
    );
    set({ customers: updatedCustomers });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
  },

  deleteCustomer: async (id) => {
    const updatedCustomers = get().customers.filter(c => c.id !== id);
    set({ customers: updatedCustomers });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
  },

  searchCustomers: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().customers.filter(
      c =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.phone.includes(lowerQuery)
    );
  },
}));
