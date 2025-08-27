-- Corrigir o tipo do campo product_id para UUID para compatibilidade
ALTER TABLE cart_items ALTER COLUMN product_id TYPE UUID USING product_id::UUID;