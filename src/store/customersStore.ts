import { create } from 'zustand';
import { supabase } from '../config/supabase';

// Supabase customer type (matches database schema)
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  birthday?: string;  // DATE type in Supabase
  notes?: string;
  tags?: string[];
  wishlist?: string[];  // Array of product names customer is interested in
  created_at: string;
  updated_at: string;
}

// Extended customer with computed fields (calculated from sales)
export interface CustomerWithStats extends Customer {
  balance: number;
  totalPurchases: number;
  lastPurchase?: string;
}

interface CustomersState {
  customers: Customer[];
  isLoading: boolean;
  error: string | null;
  loadCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<Customer | null>;
  updateCustomer: (id: string, customer: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  searchCustomers: (query: string) => Customer[];
  getCustomerById: (id: string) => Customer | undefined;
  findOrCreateCustomer: (name: string, phone?: string) => Promise<Customer | null>;
}

export const useCustomersStore = create<CustomersState>((set, get) => ({
  customers: [],
  isLoading: false,
  error: null,

  loadCustomers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      set({ customers: data || [], isLoading: false });
    } catch (error) {
      console.error('Error loading customers:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addCustomer: async (customer) => {
    set({ error: null });
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([customer])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        set({ customers: [...get().customers, data] });
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error adding customer:', error);
      set({ error: (error as Error).message });
      return null;
    }
  },

  updateCustomer: async (id, customer) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('customers')
        .update(customer)
        .eq('id', id);

      if (error) throw error;

      const updatedCustomers = get().customers.map(c =>
        c.id === id ? { ...c, ...customer, updated_at: new Date().toISOString() } : c
      );
      set({ customers: updatedCustomers });
    } catch (error) {
      console.error('Error updating customer:', error);
      set({ error: (error as Error).message });
    }
  },

  deleteCustomer: async (id) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedCustomers = get().customers.filter(c => c.id !== id);
      set({ customers: updatedCustomers });
    } catch (error) {
      console.error('Error deleting customer:', error);
      set({ error: (error as Error).message });
    }
  },

  searchCustomers: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().customers.filter(
      c =>
        c.name.toLowerCase().includes(lowerQuery) ||
        (c.phone && c.phone.includes(lowerQuery)) ||
        (c.email && c.email.toLowerCase().includes(lowerQuery))
    );
  },

  getCustomerById: (id) => {
    return get().customers.find(c => c.id === id);
  },

  findOrCreateCustomer: async (name, phone) => {
    set({ error: null });
    try {
      // First try to find existing customer by name
      const existing = get().customers.find(
        c => c.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        return existing;
      }

      // Create new customer if not found
      const newCustomer = {
        name,
        phone: phone || undefined,
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomer])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        set({ customers: [...get().customers, data] });
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error finding or creating customer:', error);
      set({ error: (error as Error).message });
      return null;
    }
  },
}));
