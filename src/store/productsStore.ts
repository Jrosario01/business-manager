import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Product {
  id: string;
  brand: string;
  name: string;
  size: string;
  cost: number;
  image?: string;
  createdAt: string;
}

interface ProductsState {
  products: Product[];
  isLoading: boolean;
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  addProducts: (products: Omit<Product, 'id' | 'createdAt'>[]) => Promise<void>;
  updateProduct: (id: string, product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (query: string) => Product[];
  getProductsByBrand: (brand: string) => Product[];
  getBrands: () => string[];
}

const STORAGE_KEY = '@products_catalog';

// Initial products data
const INITIAL_PRODUCTS: Omit<Product, 'id' | 'createdAt'>[] = [
  // Lattafa
  { brand: 'Lattafa', name: 'Asad', size: '100ml', cost: 25 },
  { brand: 'Lattafa', name: 'Bade Al Oud', size: '100ml', cost: 30 },
  { brand: 'Lattafa', name: 'Fakhar', size: '100ml', cost: 22 },
  { brand: 'Lattafa', name: 'Raghba', size: '100ml', cost: 28 },
  { brand: 'Lattafa', name: 'Khamrah', size: '100ml', cost: 32 },

  // Armaf
  { brand: 'Armaf', name: 'Club De Nuit Intense', size: '105ml', cost: 35 },
  { brand: 'Armaf', name: 'Tres Nuit', size: '100ml', cost: 28 },
  { brand: 'Armaf', name: 'Hunter Intense', size: '100ml', cost: 30 },
  { brand: 'Armaf', name: 'Ventana', size: '100ml', cost: 26 },

  // Rasasi
  { brand: 'Rasasi', name: 'Hawas', size: '100ml', cost: 32 },
  { brand: 'Rasasi', name: 'Fattan', size: '50ml', cost: 27 },
  { brand: 'Rasasi', name: 'Shuhrah', size: '90ml', cost: 29 },
  { brand: 'Rasasi', name: 'La Yuqawam', size: '75ml', cost: 35 },

  // Al Haramain
  { brand: 'Al Haramain', name: 'L\'Aventure', size: '100ml', cost: 30 },
  { brand: 'Al Haramain', name: 'Amber Oud', size: '60ml', cost: 35 },
  { brand: 'Al Haramain', name: 'Detour Noir', size: '100ml', cost: 28 },
  { brand: 'Al Haramain', name: 'Junoon', size: '50ml', cost: 26 },

  // Afnan
  { brand: 'Afnan', name: 'Supremacy Silver', size: '100ml', cost: 29 },
  { brand: 'Afnan', name: '9PM', size: '100ml', cost: 26 },
  { brand: 'Afnan', name: 'Supremacy Not Only Intense', size: '100ml', cost: 33 },
  { brand: 'Afnan', name: 'Highness', size: '100ml', cost: 27 },

  // Swiss Arabian
  { brand: 'Swiss Arabian', name: 'Shaghaf Oud', size: '75ml', cost: 38 },
  { brand: 'Swiss Arabian', name: 'Casablanca', size: '100ml', cost: 32 },
  { brand: 'Swiss Arabian', name: 'Shaghaf', size: '75ml', cost: 35 },

  // Ajmal
  { brand: 'Ajmal', name: 'Aristocrat', size: '75ml', cost: 30 },
  { brand: 'Ajmal', name: 'Silver Shade', size: '100ml', cost: 28 },
  { brand: 'Ajmal', name: 'Wisal', size: '50ml', cost: 26 },

  // Zimaya
  { brand: 'Zimaya', name: 'Sharaf', size: '100ml', cost: 31 },
  { brand: 'Zimaya', name: 'Musk Al Lail', size: '100ml', cost: 29 },

  // Maison Alhambra
  { brand: 'Maison Alhambra', name: 'Jean Lowe', size: '100ml', cost: 27 },
  { brand: 'Maison Alhambra', name: 'Kismet', size: '100ml', cost: 29 },

  // Paris Corner
  { brand: 'Paris Corner', name: 'Emir Tobacco Intense', size: '100ml', cost: 32 },
  { brand: 'Paris Corner', name: 'Killer Oud', size: '100ml', cost: 30 },

  // Designer Brands
  { brand: 'Dior', name: 'Sauvage', size: '100ml', cost: 85 },
  { brand: 'Dior', name: 'Homme Intense', size: '100ml', cost: 90 },
  { brand: 'Versace', name: 'Eros', size: '100ml', cost: 75 },
  { brand: 'Versace', name: 'Dylan Blue', size: '100ml', cost: 72 },
  { brand: 'Paco Rabanne', name: '1 Million', size: '100ml', cost: 78 },
  { brand: 'Paco Rabanne', name: 'Invictus', size: '100ml', cost: 76 },
  { brand: 'Yves Saint Laurent', name: 'La Nuit De L\'Homme', size: '100ml', cost: 82 },
  { brand: 'Yves Saint Laurent', name: 'Y EDP', size: '100ml', cost: 80 },
  { brand: 'Giorgio Armani', name: 'Acqua Di Gio', size: '100ml', cost: 88 },
  { brand: 'Giorgio Armani', name: 'Stronger With You', size: '100ml', cost: 85 },
  { brand: 'Chanel', name: 'Bleu De Chanel', size: '100ml', cost: 95 },
  { brand: 'Chanel', name: 'Allure Homme Sport', size: '100ml', cost: 92 },
];

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  isLoading: false,

  loadProducts: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const products = JSON.parse(stored);
        set({ products, isLoading: false });
      } else {
        // Initialize with default products
        const initialProducts = INITIAL_PRODUCTS.map((p, index) => ({
          ...p,
          id: `product_${Date.now()}_${index}`,
          createdAt: new Date().toISOString(),
        }));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initialProducts));
        set({ products: initialProducts, isLoading: false });
      }
    } catch (error) {
      console.error('Error loading products:', error);
      set({ isLoading: false });
    }
  },

  addProduct: async (product) => {
    const newProduct: Product = {
      ...product,
      id: `product_${Date.now()}_${Math.random()}`,
      createdAt: new Date().toISOString(),
    };
    const updatedProducts = [...get().products, newProduct];
    set({ products: updatedProducts });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  },

  addProducts: async (productsToAdd) => {
    const newProducts: Product[] = productsToAdd.map((p, index) => ({
      ...p,
      id: `product_${Date.now()}_${index}_${Math.random()}`,
      createdAt: new Date().toISOString(),
    }));
    const updatedProducts = [...get().products, ...newProducts];
    set({ products: updatedProducts });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  },

  updateProduct: async (id, product) => {
    const updatedProducts = get().products.map(p =>
      p.id === id ? { ...p, ...product } : p
    );
    set({ products: updatedProducts });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  },

  deleteProduct: async (id) => {
    const updatedProducts = get().products.filter(p => p.id !== id);
    set({ products: updatedProducts });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  },

  searchProducts: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().products.filter(
      p =>
        p.brand.toLowerCase().includes(lowerQuery) ||
        p.name.toLowerCase().includes(lowerQuery) ||
        p.size.toLowerCase().includes(lowerQuery)
    );
  },

  getProductsByBrand: (brand) => {
    return get().products.filter(p => p.brand === brand);
  },

  getBrands: () => {
    return [...new Set(get().products.map(p => p.brand))].sort();
  },
}));
