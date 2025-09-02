-- Migration: Fix cart_items and tickets relationship
-- Description: Add missing foreign key relationship and fix schema issues
-- Author: Builder with MCP
-- Date: 2025-01-30

-- First, ensure the tickets table has the necessary structure
ALTER TABLE public.tickets 
  ADD COLUMN IF NOT EXISTS category varchar(50),
  ADD COLUMN IF NOT EXISTS event_date timestamptz,
  ADD COLUMN IF NOT EXISTS event_location varchar(255),
  ADD COLUMN IF NOT EXISTS max_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add constraints to tickets if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_quantity_valid') THEN
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_quantity_valid 
      CHECK (available_quantity <= max_quantity);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_price_positive') THEN
    ALTER TABLE public.tickets ADD CONSTRAINT tickets_price_positive 
      CHECK (price >= 0);
  END IF;
END $$;

-- Update existing tickets with default values
UPDATE public.tickets SET 
  max_quantity = COALESCE(max_quantity, 100),
  available_quantity = COALESCE(available_quantity, 100),
  is_active = COALESCE(is_active, true)
WHERE max_quantity IS NULL OR available_quantity IS NULL OR is_active IS NULL;

-- Now fix the cart_items table
-- Add missing columns to cart_items
ALTER TABLE public.cart_items 
  ADD COLUMN IF NOT EXISTS ticket_id uuid,
  ADD COLUMN IF NOT EXISTS unit_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS total_price numeric(10,2);

-- Add the foreign key constraint for ticket_id
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_ticket_id_fkey') THEN
    ALTER TABLE public.cart_items 
      ADD CONSTRAINT cart_items_ticket_id_fkey 
      FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update cart_items with calculated prices from products
UPDATE public.cart_items 
SET 
  unit_price = COALESCE(p.price, 0),
  total_price = quantity * COALESCE(p.price, 0)
FROM public.products p 
WHERE cart_items.product_id = p.id 
  AND (cart_items.unit_price IS NULL OR cart_items.total_price IS NULL);

-- Set default values for items without products
UPDATE public.cart_items 
SET 
  unit_price = COALESCE(unit_price, 0),
  total_price = COALESCE(total_price, 0)
WHERE unit_price IS NULL OR total_price IS NULL;

-- Make unit_price and total_price NOT NULL with defaults
ALTER TABLE public.cart_items 
  ALTER COLUMN unit_price SET DEFAULT 0,
  ALTER COLUMN total_price SET DEFAULT 0;

-- Add constraint to ensure either product_id or ticket_id is present
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_product_or_ticket') THEN
    ALTER TABLE public.cart_items 
      ADD CONSTRAINT cart_items_product_or_ticket 
      CHECK (product_id IS NOT NULL OR ticket_id IS NOT NULL);
  END IF;
END $$;

-- Ensure user_id is NOT NULL
UPDATE public.cart_items SET user_id = gen_random_uuid() WHERE user_id IS NULL;
ALTER TABLE public.cart_items ALTER COLUMN user_id SET NOT NULL;

-- Add quantity check constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_quantity_positive') THEN
    ALTER TABLE public.cart_items 
      ADD CONSTRAINT cart_items_quantity_positive 
      CHECK (quantity > 0);
  END IF;
END $$;

-- Update the order_items table to also support tickets
ALTER TABLE public.order_items 
  ADD COLUMN IF NOT EXISTS ticket_id uuid,
  ADD COLUMN IF NOT EXISTS size varchar(10),
  ADD COLUMN IF NOT EXISTS total_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) DEFAULT 0;

-- Add foreign key for order_items.ticket_id
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_ticket_id_fkey') THEN
    ALTER TABLE public.order_items 
      ADD CONSTRAINT order_items_ticket_id_fkey 
      FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update order_items with calculated total_price
UPDATE public.order_items 
SET total_price = quantity * price
WHERE total_price IS NULL;

-- Set defaults for order_items
UPDATE public.order_items 
SET 
  total_price = COALESCE(total_price, 0),
  discount_amount = COALESCE(discount_amount, 0),
  tax_amount = COALESCE(tax_amount, 0)
WHERE total_price IS NULL OR discount_amount IS NULL OR tax_amount IS NULL;

-- Add constraint to ensure either product_id or ticket_id is present in order_items
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_product_or_ticket') THEN
    ALTER TABLE public.order_items 
      ADD CONSTRAINT order_items_product_or_ticket 
      CHECK (product_id IS NOT NULL OR ticket_id IS NOT NULL);
  END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Comment for documentation
COMMENT ON CONSTRAINT cart_items_ticket_id_fkey ON public.cart_items IS 'Foreign key relationship between cart_items and tickets for ticket sales';
COMMENT ON CONSTRAINT order_items_ticket_id_fkey ON public.order_items IS 'Foreign key relationship between order_items and tickets for ticket orders';