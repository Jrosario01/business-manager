import { create } from 'zustand';
import { supabase } from '../config/supabase';

// Supabase shipment type (matches database schema)
export interface SupabaseShipment {
  id: string;
  shipment_number: string;
  status: 'preparing' | 'shipped' | 'delivered' | 'settled';
  shipped_date?: string;
  delivered_date?: string;
  shipping_cost: number;
  additional_costs?: number;
  total_cost: number;
  total_revenue: number;
  net_profit: number;
  your_share: number;
  partner_share: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Supabase shipment item type (matches database schema)
export interface SupabaseShipmentItem {
  id: string;
  shipment_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  remaining_inventory: number;
  created_at: string;
  // Populated from JOIN
  product?: {
    id: string;
    sku: string;
    brand: string;
    name: string;
    size: string;
    cost: number;
    sale_price?: number;
    image_url?: string;
  };
}

// Extended shipment with items for display
export interface ShipmentWithItems extends SupabaseShipment {
  items: SupabaseShipmentItem[];
}

interface ShipmentsState {
  shipments: ShipmentWithItems[];
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  loadShipments: () => Promise<void>;
  getShipmentById: (id: string) => Promise<ShipmentWithItems | null>;
  addShipment: (shipment: Omit<SupabaseShipment, 'id' | 'created_at' | 'updated_at'>, items: Omit<SupabaseShipmentItem, 'id' | 'shipment_id' | 'created_at'>[]) => Promise<ShipmentWithItems | null>;
  updateShipment: (id: string, shipment: Partial<Omit<SupabaseShipment, 'id' | 'created_at' | 'updated_at'>>) => Promise<void>;
  deleteShipment: (id: string) => Promise<void>;

  // Shipment item operations
  addShipmentItem: (shipmentId: string, item: Omit<SupabaseShipmentItem, 'id' | 'shipment_id' | 'created_at'>) => Promise<void>;
  updateShipmentItem: (id: string, item: Partial<Omit<SupabaseShipmentItem, 'id' | 'shipment_id' | 'created_at'>>) => Promise<void>;
  deleteShipmentItem: (id: string) => Promise<void>;

  // Inventory queries
  getAvailableInventory: (brand: string, name: string, size: string) => Promise<any[]>;
  getConsolidatedInventory: () => Promise<any[]>;

  // Filters
  searchShipments: (query: string) => ShipmentWithItems[];
  getShipmentsByStatus: (status: string) => ShipmentWithItems[];
}

export const useShipmentsStore = create<ShipmentsState>((set, get) => ({
  shipments: [],
  isLoading: false,
  error: null,

  loadShipments: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: shipmentsData, error: shipmentsError } = await supabase
        .from('shipments')
        .select(`
          *,
          shipment_items:shipment_items (
            *,
            product:products (
              id,
              sku,
              brand,
              name,
              size,
              cost,
              sale_price,
              image_url
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (shipmentsError) throw shipmentsError;

      // Transform data to include items
      const shipments: ShipmentWithItems[] = (shipmentsData || []).map(shipment => ({
        ...shipment,
        items: shipment.shipment_items || [],
      }));

      set({ shipments, isLoading: false });
    } catch (error) {
      console.error('Error loading shipments:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getShipmentById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          shipment_items:shipment_items (
            *,
            product:products (
              id,
              sku,
              brand,
              name,
              size,
              cost,
              sale_price,
              image_url
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        items: data.shipment_items || [],
      } as ShipmentWithItems;
    } catch (error) {
      console.error('Error getting shipment:', error);
      set({ error: (error as Error).message });
      return null;
    }
  },

  addShipment: async (shipment, items) => {
    set({ error: null });
    try {
      // Insert shipment
      const { data: newShipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert([shipment])
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Insert shipment items
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          ...item,
          shipment_id: newShipment.id,
        }));

        const { data: newItems, error: itemsError } = await supabase
          .from('shipment_items')
          .insert(itemsToInsert)
          .select(`
            *,
            product:products (
              id,
              sku,
              brand,
              name,
              size,
              cost,
              sale_price,
              image_url
            )
          `);

        if (itemsError) throw itemsError;

        const shipmentWithItems: ShipmentWithItems = {
          ...newShipment,
          items: newItems || [],
        };

        set({ shipments: [shipmentWithItems, ...get().shipments] });
        return shipmentWithItems;
      }

      const shipmentWithItems: ShipmentWithItems = {
        ...newShipment,
        items: [],
      };

      set({ shipments: [shipmentWithItems, ...get().shipments] });
      return shipmentWithItems;
    } catch (error) {
      console.error('Error adding shipment:', error);
      set({ error: (error as Error).message });
      return null;
    }
  },

  updateShipment: async (id, shipment) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('shipments')
        .update(shipment)
        .eq('id', id);

      if (error) throw error;

      const updatedShipments = get().shipments.map(s =>
        s.id === id ? { ...s, ...shipment } : s
      );
      set({ shipments: updatedShipments });
    } catch (error) {
      console.error('Error updating shipment:', error);
      set({ error: (error as Error).message });
    }
  },

  deleteShipment: async (id) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const updatedShipments = get().shipments.filter(s => s.id !== id);
      set({ shipments: updatedShipments });
    } catch (error) {
      console.error('Error deleting shipment:', error);
      set({ error: (error as Error).message });
    }
  },

  addShipmentItem: async (shipmentId, item) => {
    set({ error: null });
    try {
      const { data: newItem, error: itemError } = await supabase
        .from('shipment_items')
        .insert([{ ...item, shipment_id: shipmentId }])
        .select(`
          *,
          product:products (
            id,
            sku,
            brand,
            name,
            size,
            sale_price,
            image_url
          )
        `)
        .single();

      if (itemError) throw itemError;

      // Update local state
      const updatedShipments = get().shipments.map(s =>
        s.id === shipmentId
          ? { ...s, items: [...s.items, newItem] }
          : s
      );
      set({ shipments: updatedShipments });
    } catch (error) {
      console.error('Error adding shipment item:', error);
      set({ error: (error as Error).message });
    }
  },

  updateShipmentItem: async (id, item) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('shipment_items')
        .update(item)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const updatedShipments = get().shipments.map(shipment => ({
        ...shipment,
        items: shipment.items.map(i =>
          i.id === id ? { ...i, ...item } : i
        ),
      }));
      set({ shipments: updatedShipments });
    } catch (error) {
      console.error('Error updating shipment item:', error);
      set({ error: (error as Error).message });
    }
  },

  deleteShipmentItem: async (id) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('shipment_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const updatedShipments = get().shipments.map(shipment => ({
        ...shipment,
        items: shipment.items.filter(i => i.id !== id),
      }));
      set({ shipments: updatedShipments });
    } catch (error) {
      console.error('Error deleting shipment item:', error);
      set({ error: (error as Error).message });
    }
  },

  getAvailableInventory: async (brand: string, name: string, size: string) => {
    try {
      const { data, error } = await supabase.rpc('get_available_inventory', {
        p_brand: brand,
        p_name: name,
        p_size: size,
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting available inventory:', error);
      return [];
    }
  },

  getConsolidatedInventory: async () => {
    try {
      const { data, error } = await supabase
        .from('consolidated_inventory')
        .select('*')
        .order('brand', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting consolidated inventory:', error);
      return [];
    }
  },

  searchShipments: (query) => {
    const lowerQuery = query.toLowerCase();
    return get().shipments.filter(
      s =>
        s.shipment_number.toLowerCase().includes(lowerQuery) ||
        (s.notes && s.notes.toLowerCase().includes(lowerQuery)) ||
        s.items.some(
          i =>
            i.product?.brand.toLowerCase().includes(lowerQuery) ||
            i.product?.name.toLowerCase().includes(lowerQuery)
        )
    );
  },

  getShipmentsByStatus: (status) => {
    return get().shipments.filter(s => s.status === status);
  },
}));
