-- Create products table
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    category TEXT NOT NULL CHECK (category IN ('camiseta', 'vestido')),
    sizes TEXT[] NOT NULL DEFAULT '{}',
    in_stock BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (products should be visible to everyone)
CREATE POLICY "Products are viewable by everyone" 
ON public.products 
FOR SELECT 
USING (true);

-- Create policy for authenticated users to manage products (admin functionality)
CREATE POLICY "Authenticated users can manage products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products
INSERT INTO public.products (name, price, image_url, category, sizes) VALUES
('Camiseta Oficial VII Conferência', 89.90, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'camiseta', ARRAY['PP', 'P', 'M', 'G', 'GG', 'XG', 'EXGG']),
('Vestido Elegante Conferência', 159.90, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', 'vestido', ARRAY['0', 'P', 'M', 'G', 'GG', 'XG', 'EXGG']),
('Camiseta Borboleta Design', 79.90, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400', 'camiseta', ARRAY['PP', 'P', 'M', 'G', 'GG']),
('Vestido Floral Queren Hapuque', 189.90, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', 'vestido', ARRAY['P', 'M', 'G', 'GG', 'XG']);