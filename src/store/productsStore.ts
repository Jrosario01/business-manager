import { create } from 'zustand';
import { supabase } from '../config/supabase';

// Supabase product type (matches database schema)
export interface SupabaseProduct {
  id: string;
  sku: string;
  brand: string;
  name: string;
  size: string;
  cost: number;
  description?: string;
  fragrance_notes?: string;
  image_url?: string;
  active: boolean;
  created_at: string;
}

// Client-side product type (what the app uses)
export interface Product {
  id: string;
  brand: string;
  name: string;
  size: string;
  cost: number;  // Note: cost is per-shipment, not stored in products table
  image?: string;
  sku?: string;
  description?: string;
  fragranceNotes?: string;
  active?: boolean;
  createdAt: string;
}

interface ProductsState {
  products: SupabaseProduct[];
  isLoading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<SupabaseProduct, 'id' | 'created_at'>) => Promise<SupabaseProduct | null>;
  addProducts: (products: { brand: string; name: string; size: string; cost: number; image?: string }[]) => Promise<void>;
  updateProduct: (id: string, product: Partial<Omit<SupabaseProduct, 'id' | 'created_at'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  searchProducts: (query: string) => SupabaseProduct[];
  getProductsByBrand: (brand: string) => SupabaseProduct[];
  getBrands: () => string[];
  findProduct: (brand: string, name: string, size: string) => SupabaseProduct | undefined;
  seedInitialProducts: () => Promise<void>;
}

// Helper function to generate SKU from brand, name, and size
const generateSKU = (brand: string, name: string, size: string): string => {
  // Brand abbreviation (first 3-4 chars)
  const brandAbbr = brand.substring(0, 3).toUpperCase();

  // Product name abbreviation
  const words = name.trim().split(/\s+/);
  let nameAbbr: string;
  if (words.length > 1) {
    // Take first letter of each word (up to 4 letters)
    nameAbbr = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
  } else {
    // Take first 4 letters of single word
    nameAbbr = name.substring(0, 4).toUpperCase();
  }

  // Extract numeric part of size
  const sizeNum = size.replace(/[^0-9]/g, '');

  return `${brandAbbr}-${nameAbbr}-${sizeNum}`;
};

// Initial products data to seed the database
const INITIAL_PRODUCTS: Omit<SupabaseProduct, 'id' | 'created_at'>[] = [
  // Lattafa
  { sku: 'LAT-ASAD-100', brand: 'Lattafa', name: 'Asad', size: '100ml', cost: 25, active: true },
  { sku: 'LAT-BADE-100', brand: 'Lattafa', name: 'Bade Al Oud', size: '100ml', cost: 30, active: true },
  { sku: 'LAT-FAKH-100', brand: 'Lattafa', name: 'Fakhar', size: '100ml', cost: 22, active: true },
  { sku: 'LAT-RAGH-100', brand: 'Lattafa', name: 'Raghba', size: '100ml', cost: 28, active: true },
  { sku: 'LAT-KHAM-100', brand: 'Lattafa', name: 'Khamrah', size: '100ml', cost: 32, active: true },

  // Armaf
  { sku: 'ARM-CDNI-105', brand: 'Armaf', name: 'Club De Nuit Intense', size: '105ml', cost: 35, active: true },
  { sku: 'ARM-TRES-100', brand: 'Armaf', name: 'Tres Nuit', size: '100ml', cost: 28, active: true },
  { sku: 'ARM-HUNT-100', brand: 'Armaf', name: 'Hunter Intense', size: '100ml', cost: 30, active: true },
  { sku: 'ARM-VENT-100', brand: 'Armaf', name: 'Ventana', size: '100ml', cost: 26, active: true },

  // Rasasi
  { sku: 'RAS-HAWA-100', brand: 'Rasasi', name: 'Hawas', size: '100ml', cost: 32, active: true },
  { sku: 'RAS-FATT-50', brand: 'Rasasi', name: 'Fattan', size: '50ml', cost: 27, active: true },
  { sku: 'RAS-SHUH-90', brand: 'Rasasi', name: 'Shuhrah', size: '90ml', cost: 29, active: true },
  { sku: 'RAS-LAYU-75', brand: 'Rasasi', name: 'La Yuqawam', size: '75ml', cost: 35, active: true },

  // Al Haramain
  { sku: 'ALH-LAVE-100', brand: 'Al Haramain', name: 'L\'Aventure', size: '100ml', cost: 30, active: true },
  { sku: 'ALH-AMBO-60', brand: 'Al Haramain', name: 'Amber Oud', size: '60ml', cost: 35, active: true },
  { sku: 'ALH-DETO-100', brand: 'Al Haramain', name: 'Detour Noir', size: '100ml', cost: 28, active: true },
  { sku: 'ALH-JUNO-50', brand: 'Al Haramain', name: 'Junoon', size: '50ml', cost: 26, active: true },

  // Afnan
  { sku: 'AFN-SUPR-100', brand: 'Afnan', name: 'Supremacy Silver', size: '100ml', cost: 29, active: true },
  { sku: 'AFN-9PM-100', brand: 'Afnan', name: '9PM', size: '100ml', cost: 26, active: true },
  { sku: 'AFN-SNOI-100', brand: 'Afnan', name: 'Supremacy Not Only Intense', size: '100ml', cost: 33, active: true },
  { sku: 'AFN-HIGH-100', brand: 'Afnan', name: 'Highness', size: '100ml', cost: 27, active: true },

  // Swiss Arabian
  { sku: 'SWI-SHAO-75', brand: 'Swiss Arabian', name: 'Shaghaf Oud', size: '75ml', cost: 38, active: true },
  { sku: 'SWI-CASA-100', brand: 'Swiss Arabian', name: 'Casablanca', size: '100ml', cost: 32, active: true },
  { sku: 'SWI-SHAG-75', brand: 'Swiss Arabian', name: 'Shaghaf', size: '75ml', cost: 35, active: true },

  // Ajmal
  { sku: 'AJM-ARIS-75', brand: 'Ajmal', name: 'Aristocrat', size: '75ml', cost: 30, active: true },
  { sku: 'AJM-SILV-100', brand: 'Ajmal', name: 'Silver Shade', size: '100ml', cost: 28, active: true },
  { sku: 'AJM-WISA-50', brand: 'Ajmal', name: 'Wisal', size: '50ml', cost: 26, active: true },

  // Zimaya
  { sku: 'ZIM-SHAR-100', brand: 'Zimaya', name: 'Sharaf', size: '100ml', cost: 31, active: true },
  { sku: 'ZIM-MUSK-100', brand: 'Zimaya', name: 'Musk Al Lail', size: '100ml', cost: 29, active: true },

  // Maison Alhambra
  { sku: 'MAI-JEAN-100', brand: 'Maison Alhambra', name: 'Jean Lowe', size: '100ml', cost: 27, active: true },
  { sku: 'MAI-KISM-100', brand: 'Maison Alhambra', name: 'Kismet', size: '100ml', cost: 29, active: true },

  // Paris Corner
  { sku: 'PAR-EMIR-100', brand: 'Paris Corner', name: 'Emir Tobacco Intense', size: '100ml', cost: 32, active: true },
  { sku: 'PAR-KILL-100', brand: 'Paris Corner', name: 'Killer Oud', size: '100ml', cost: 30, active: true },

  // Designer Brands
  { sku: 'DIO-SAUV-100', brand: 'Dior', name: 'Sauvage', size: '100ml', cost: 85, active: true },
  { sku: 'DIO-HINT-100', brand: 'Dior', name: 'Homme Intense', size: '100ml', cost: 90, active: true },
  { sku: 'VER-EROS-100', brand: 'Versace', name: 'Eros', size: '100ml', cost: 75, active: true },
  { sku: 'VER-DYBL-100', brand: 'Versace', name: 'Dylan Blue', size: '100ml', cost: 72, active: true },
  { sku: 'PAC-1MIL-100', brand: 'Paco Rabanne', name: '1 Million', size: '100ml', cost: 78, active: true },
  { sku: 'PAC-INVI-100', brand: 'Paco Rabanne', name: 'Invictus', size: '100ml', cost: 76, active: true },
  { sku: 'YSL-LANU-100', brand: 'Yves Saint Laurent', name: 'La Nuit De L\'Homme', size: '100ml', cost: 82, active: true },
  { sku: 'YSL-YEDP-100', brand: 'Yves Saint Laurent', name: 'Y EDP', size: '100ml', cost: 80, active: true },
  { sku: 'ARM-ADIG-100', brand: 'Giorgio Armani', name: 'Acqua Di Gio', size: '100ml', cost: 88, active: true },
  { sku: 'ARM-STRO-100', brand: 'Giorgio Armani', name: 'Stronger With You', size: '100ml', cost: 85, active: true },
  { sku: 'CHA-BLEU-100', brand: 'Chanel', name: 'Bleu De Chanel', size: '100ml', cost: 95, active: true },
  { sku: 'CHA-ALLU-100', brand: 'Chanel', name: 'Allure Homme Sport', size: '100ml', cost: 92, active: true },
];

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  loadProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('brand', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      set({ products: data || [], isLoading: false });
    } catch (error) {
      console.error('Error loading products:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addProduct: async (product) => {
    set({ error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        set({ products: [...get().products, data] });
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error adding product:', error);
      set({ error: (error as Error).message });
      return null;
    }
  },

  addProducts: async (products) => {
    set({ error: null });
    try {
      // Generate SKUs and prepare products for insertion
      const productsWithSKU = products.map(product => {
        let sku = generateSKU(product.brand, product.name, product.size);

        // Check for SKU uniqueness and add suffix if needed
        let suffix = 1;
        const existingSKUs = get().products.map(p => p.sku);
        while (existingSKUs.includes(sku)) {
          sku = `${generateSKU(product.brand, product.name, product.size)}-${suffix}`;
          suffix++;
        }

        return {
          sku,
          brand: product.brand,
          name: product.name,
          size: product.size,
          cost: product.cost,
          image_url: product.image,
          active: true,
        };
      });

      const { data, error } = await supabase
        .from('products')
        .insert(productsWithSKU)
        .select();

      if (error) throw error;

      if (data) {
        set({ products: [...get().products, ...data] });
      }
    } catch (error) {
      console.error('Error adding products:', error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateProduct: async (id, product) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id);

      if (error) throw error;

      const updatedProducts = get().products.map(p =>
        p.id === id ? { ...p, ...product } : p
      );
      set({ products: updatedProducts });
    } catch (error) {
      console.error('Error updating product:', error);
      set({ error: (error as Error).message });
    }
  },

  deleteProduct: async (id) => {
    set({ error: null });
    try {
      // Soft delete by setting active = false
      const { error } = await supabase
        .from('products')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;

      const updatedProducts = get().products.filter(p => p.id !== id);
      set({ products: updatedProducts });
    } catch (error) {
      console.error('Error deleting product:', error);
      set({ error: (error as Error).message });
    }
  },

  searchProducts: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().products.filter(
      p =>
        p.brand.toLowerCase().includes(lowerQuery) ||
        p.name.toLowerCase().includes(lowerQuery) ||
        p.size.toLowerCase().includes(lowerQuery) ||
        (p.sku && p.sku.toLowerCase().includes(lowerQuery))
    );
  },

  getProductsByBrand: (brand) => {
    return get().products.filter(p => p.brand === brand);
  },

  getBrands: () => {
    return [...new Set(get().products.map(p => p.brand))].sort();
  },

  findProduct: (brand, name, size) => {
    return get().products.find(
      p => p.brand === brand && p.name === name && p.size === size
    );
  },

  seedInitialProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      // Check if products already exist
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (count && count > 0) {
        console.log('Products already seeded, skipping...');
        set({ isLoading: false });
        return;
      }

      // Insert initial products
      const { error } = await supabase
        .from('products')
        .insert(INITIAL_PRODUCTS);

      if (error) throw error;

      console.log('Initial products seeded successfully!');

      // Reload products
      await get().loadProducts();
    } catch (error) {
      console.error('Error seeding products:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
