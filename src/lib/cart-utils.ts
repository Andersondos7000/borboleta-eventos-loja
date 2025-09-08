// Cart utility functions
export type CartProduct = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  image: string;
  images: string[];
  category: string;
  size?: string; // Optional size property
  quantity: number;
  unit_price: number;
  total_price: number;
  metadata: Record<string, any>;
};

export type CartTicket = {
  id: string;
  ticket_id: string;
  event_id: string;
  event_name: string;
  event_title: string;
  event_date: string;
  ticket_price: number;
  price: number; // Alias for ticket_price for consistency with CartProduct
  name: string; // Alias for event_name for consistency with CartProduct
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type CartItem = CartProduct | CartTicket;

// Helper function to check if item is a product
export const isCartProduct = (item: CartItem): item is CartProduct => {
  return 'product_id' in item && 'category' in item;
};

// Helper function to check if item is a ticket
export const isCartTicket = (item: CartItem): item is CartTicket => {
  return 'ticket_id' in item && 'event_id' in item;
};