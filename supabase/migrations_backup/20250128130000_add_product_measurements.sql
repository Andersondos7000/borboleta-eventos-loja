-- Migration: Add product measurements and size fields
-- Adds width, length, height, weight, and size columns to products table

-- Add measurement columns to products table
ALTER TABLE public.products 
ADD COLUMN width numeric,
ADD COLUMN length numeric, 
ADD COLUMN height numeric,
ADD COLUMN weight numeric,
ADD COLUMN size text CHECK (size IS NULL OR size = ANY (ARRAY['P'::text, 'M'::text, 'G'::text, 'GG'::text, 'EXG'::text]));

-- Add comments for documentation
COMMENT ON COLUMN public.products.width IS 'Product width in centimeters';
COMMENT ON COLUMN public.products.length IS 'Product length in centimeters';
COMMENT ON COLUMN public.products.height IS 'Product height in centimeters';
COMMENT ON COLUMN public.products.weight IS 'Product weight in grams';
COMMENT ON COLUMN public.products.size IS 'Product size: P, M, G, GG, EXG';

-- Create index for size column for better query performance
CREATE INDEX idx_products_size ON public.products(size) WHERE size IS NOT NULL;

-- Update the updated_at trigger to include new columns
-- (assuming there's already a trigger for updated_at)

-- Log the migration
INSERT INTO public.migration_log (migration_name, applied_at, description)
VALUES (
  '20250128130000_add_product_measurements',
  NOW(),
  'Added width, length, height, weight, and size columns to products table'
) ON CONFLICT DO NOTHING;