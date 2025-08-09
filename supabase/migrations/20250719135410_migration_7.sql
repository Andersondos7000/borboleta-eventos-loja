-- Drop the existing insert policy for tickets
DROP POLICY IF EXISTS "Usuário pode inserir tickets" ON public.tickets;

-- Create a new policy that allows anonymous users for testing
CREATE POLICY "Permitir inserção de tickets para testes" 
ON public.tickets 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);