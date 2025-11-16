// Tipos para o MCP Ecommerce

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  stock_quantity: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  products?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  total?: number; // Alias para compatibilidade
  payment_method?: 'pix' | 'credit_card' | 'debit_card';
  status: 'pending' | 'paid' | 'cancelled' | 'shipped' | 'delivered' | 'confirmed' | 'processing';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id?: string;
  abacatepay_id?: string;
  external_id?: string;
  customer_name?: string;
  customer_email?: string;
  shipping_address?: string;
  order_type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  profiles?: {
    id: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  ticket_id?: string;
  size?: string;
  quantity: number;
  price: number;
  total_price?: number;
  created_at: string;
  products?: Product;
  title?: string;
  unit_price?: number;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  stock_quantity?: number;
  active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  image_url?: string;
  stock_quantity?: number;
  active?: boolean;
}

export interface AddToCartInput {
  user_id: string;
  product_id: string;
  quantity?: number;
}

export interface CreateOrderInput {
  user_id: string;
  payment_method?: 'pix' | 'credit_card' | 'debit_card';
}

export interface ListProductsFilters {
  category?: string;
  active_only?: boolean;
  limit?: number;
  page?: number;
}

export interface McpResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface CartSummary {
  cart_items: CartItem[];
  total_amount: number;
  items_count: number;
}

export interface OrderSummary {
  orders: Order[];
  count: number;
}