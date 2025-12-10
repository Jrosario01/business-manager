// Database Types
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'partner' | 'admin';
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  size?: string;
  fragrance_notes?: string;
  image_url?: string;
  active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  supplier_id?: string;
  purchase_date: string;
  total_cost: number;
  payment_status: 'pending' | 'paid' | 'partial';
  notes?: string;
  receipt_url?: string;
  created_by: string;
  created_at: string;
  supplier?: Supplier;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  created_at: string;
  product?: Product;
}

export type ShipmentStatus = 'preparing' | 'shipped' | 'delivered' | 'settled';

export interface Shipment {
  id: string;
  shipment_number: string;
  status: ShipmentStatus;
  shipped_date?: string;
  delivered_date?: string;
  shipping_cost: number;
  total_cost: number;
  total_revenue: number;
  net_profit: number;
  your_share: number;
  partner_share: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ShipmentItem {
  id: string;
  shipment_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  remaining_inventory: number;
  created_at: string;
  product?: Product;
}

export type PaymentStatus = 'paid' | 'partial' | 'layaway';

export interface Sale {
  id: string;
  shipment_id: string;
  customer_id?: string;
  sale_date: string;
  total_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  payment_status: PaymentStatus;
  payment_method?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  customer?: Customer;
  shipment?: Shipment;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
  product?: Product;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  birthday?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  sale_id: string;
  receipt_number: string;
  issued_date: string;
  pdf_url?: string;
  status: 'sent' | 'not_sent' | 'printed';
  created_at: string;
  sale?: Sale;
}

export interface Return {
  id: string;
  sale_id: string;
  shipment_id: string;
  product_id: string;
  quantity: number;
  reason?: string;
  refund_amount: number;
  return_date: string;
  created_at: string;
  product?: Product;
}

// Form Types
export interface CreateShipmentForm {
  shipment_number: string;
  shipping_cost: number;
  notes?: string;
  items: Array<{
    product_id: string;
    product_name?: string;
    quantity: number;
    unit_cost: number;
    is_new_product?: boolean;
    sku?: string;
    size?: string;
  }>;
}

export interface CreateSaleForm {
  shipment_id: string;
  customer_id?: string;
  customer_name?: string;
  sale_date: string;
  payment_method: string;
  amount_paid: number;
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface CreateCustomerForm {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  birthday?: string;
  notes?: string;
  tags?: string[];
}

// View Types (with computed/joined data)
export interface ShipmentWithItems extends Shipment {
  items: ShipmentItem[];
  sales: Sale[];
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
  payments: Payment[];
}

export interface CustomerWithSales extends Customer {
  sales: Sale[];
  total_spent: number;
  outstanding_balance: number;
}

// Dashboard/Report Types
export interface DashboardMetrics {
  total_revenue: number;
  total_profit: number;
  your_share: number;
  active_shipments: number;
  outstanding_settlements: number;
  customer_balances: number;
}

export interface ShipmentPerformance {
  shipment_id: string;
  shipment_number: string;
  total_cost: number;
  total_revenue: number;
  net_profit: number;
  profit_margin: number;
}

export interface ProductPerformance {
  product_id: string;
  product_name: string;
  units_sold: number;
  revenue: number;
  profit: number;
}
