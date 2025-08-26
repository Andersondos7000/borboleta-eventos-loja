-- Habilitar RLS na tabela tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Políticas para tickets - usuários podem ver seus próprios tickets
CREATE POLICY "Users can view their own tickets" 
ON public.tickets 
FOR SELECT 
USING (auth.uid() = user_id);

-- Permitir que usuários insiram seus próprios tickets
CREATE POLICY "Users can insert their own tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Permitir que usuários atualizem seus próprios tickets
CREATE POLICY "Users can update their own tickets" 
ON public.tickets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Permitir que admins vejam todos os tickets (para dashboard admin)
CREATE POLICY "Authenticated users can view all tickets for admin" 
ON public.tickets 
FOR SELECT 
USING (auth.uid() IS NOT NULL);