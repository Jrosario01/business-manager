import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Sale {
  id: string;
  date: string;
  customerName: string;
  products: {
    name: string;
    brand: string;
    quantity: number;
    unitCost: number;
    soldPrice: number;
    amountPaid?: number;
    balance?: number;
  }[];
  totalCost: number;
  totalRevenue: number;
  profit: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  amountPaid: number;
}

interface SalesState {
  sales: Sale[];
  isLoading: boolean;
  loadSales: () => Promise<void>;
  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
}

const STORAGE_KEY = '@sales_database';

// Default sales database
const DEFAULT_SALES: Omit<Sale, 'id'>[] = [
  {
    date: '2024-12-10T14:30:00.000Z',
    customerName: 'Juan Perez',
    products: [
      { name: 'Asad', brand: 'Lattafa', quantity: 2, unitCost: 25, soldPrice: 45 },
      { name: 'Club De Nuit', brand: 'Armaf', quantity: 1, unitCost: 35, soldPrice: 60 },
    ],
    totalCost: 85,
    totalRevenue: 150,
    profit: 65,
    paymentStatus: 'partial',
    amountPaid: 100,
  },
  {
    date: '2024-12-09T10:15:00.000Z',
    customerName: 'Maria Rodriguez',
    products: [
      { name: 'Hawas', brand: 'Rasasi', quantity: 1, unitCost: 32, soldPrice: 55 },
    ],
    totalCost: 32,
    totalRevenue: 55,
    profit: 23,
    paymentStatus: 'paid',
    amountPaid: 55,
  },
  {
    date: '2024-12-08T16:45:00.000Z',
    customerName: 'Ana Martinez',
    products: [
      { name: 'Amber Oud', brand: 'Al Haramain', quantity: 2, unitCost: 35, soldPrice: 65 },
      { name: '9PM', brand: 'Afnan', quantity: 1, unitCost: 26, soldPrice: 48 },
    ],
    totalCost: 96,
    totalRevenue: 178,
    profit: 82,
    paymentStatus: 'pending',
    amountPaid: 0,
  },
  {
    date: '2024-12-07T11:20:00.000Z',
    customerName: 'Carlos Gomez',
    products: [
      { name: 'Fakhar', brand: 'Lattafa', quantity: 1, unitCost: 22, soldPrice: 40 },
    ],
    totalCost: 22,
    totalRevenue: 40,
    profit: 18,
    paymentStatus: 'paid',
    amountPaid: 40,
  },
];

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  isLoading: false,

  loadSales: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sales = JSON.parse(stored);
        set({ sales, isLoading: false });
      } else {
        // Initialize database with default sales
        const sales = DEFAULT_SALES.map((s, index) => ({
          ...s,
          id: `sale_${Date.now()}_${index}`,
        }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
        set({ sales, isLoading: false });
      }
    } catch (error) {
      console.error('Error loading sales:', error);
      set({ isLoading: false });
    }
  },

  addSale: async (sale) => {
    const newSale: Sale = {
      ...sale,
      id: `sale_${Date.now()}_${Math.random()}`,
    };
    // Add to the beginning (most recent first)
    const updatedSales = [newSale, ...get().sales];
    set({ sales: updatedSales });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSales));
  },

  updateSale: async (id, saleUpdate) => {
    const updatedSales = get().sales.map(s =>
      s.id === id ? { ...s, ...saleUpdate } : s
    );
    set({ sales: updatedSales });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSales));
  },

  deleteSale: async (id) => {
    const updatedSales = get().sales.filter(s => s.id !== id);
    set({ sales: updatedSales });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSales));
  },
}));
