-- Corrigir políticas RLS para usar 'organizer' em vez de 'organizador'
-- Isso resolve o erro "Erro ao verificar role do usuário"

-- Remover políticas existentes com erro
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recriar políticas com role correto
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

-- Comentário explicativo
COMMENT ON TABLE public.profiles IS 'Tabela de perfis de usuários com RLS habilitado. Políticas corrigidas para usar "organizer" em vez de "organizador".';