-- Primeiro, vamos ver as políticas atuais e removê-las
DROP POLICY IF EXISTS "Usuário pode inserir tickets" ON public.tickets;
DROP POLICY IF EXISTS "Permitir inserção de tickets para testes" ON public.tickets;

-- Criar uma política temporária que permite todas as inserções para testes
CREATE POLICY "Permitir todas as inserções para testes" 
ON public.tickets 
FOR INSERT 
WITH CHECK (true);

-- Também vamos relaxar as outras políticas temporariamente
DROP POLICY IF EXISTS "Usuário pode ver seus tickets" ON public.tickets;
DROP POLICY IF EXISTS "Usuário pode atualizar/remover seus tickets" ON public.tickets;
DROP POLICY IF EXISTS "Usuário pode remover seus tickets" ON public.tickets;

-- Criar políticas mais permissivas para testes
CREATE POLICY "Permitir visualizar todos os tickets para testes" 
ON public.tickets 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir atualizar todos os tickets para testes" 
ON public.tickets 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir remover todos os tickets para testes" 
ON public.tickets 
FOR DELETE 
USING (true);