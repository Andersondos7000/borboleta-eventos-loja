-- Script para corrigir políticas RLS - Execute no SQL Editor do Supabase
-- Ou copie e cole este conteúdo no dashboard do Supabase

-- 1. Verificar políticas atuais
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('events', 'tickets')
ORDER BY tablename, policyname;

-- 2. Adicionar política de INSERT para events (que está faltando)
CREATE POLICY "Allow insert events for testing" 
ON public.events 
FOR INSERT 
WITH CHECK (true);

-- 3. Adicionar política de UPDATE para events (opcional)
CREATE POLICY "Allow update events for testing" 
ON public.events 
FOR UPDATE 
USING (true);

-- 4. Verificar se as políticas foram criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'events'
ORDER BY policyname;

-- 5. Testar inserção de evento
INSERT INTO public.events (name, description, date, location, price, available_tickets, image_url) 
VALUES (
  'Teste RLS Event',
  'Evento de teste para verificar RLS',
  '2025-12-31T20:00:00Z',
  'Local de Teste',
  50.00,
  100,
  'https://example.com/image.jpg'
);

-- 6. Verificar se o evento foi inserido
SELECT * FROM public.events WHERE name = 'Teste RLS Event';