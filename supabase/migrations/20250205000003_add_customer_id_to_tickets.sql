-- Adicionar coluna customer_id à tabela tickets se ela não existir

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' 
        AND column_name = 'customer_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.tickets 
        ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE;
        
        -- Criar índice para a nova coluna
        CREATE INDEX IF NOT EXISTS tickets_customer_id_idx ON public.tickets(customer_id);
    END IF;
END $$;

-- Recriar as políticas RLS para tickets se necessário
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can insert tickets for own customers" ON public.tickets;

-- Políticas RLS para tickets
CREATE POLICY "Users can view own tickets" ON public.tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = tickets.customer_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tickets for own customers" ON public.tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = tickets.customer_id AND c.user_id = auth.uid()
    )
  );