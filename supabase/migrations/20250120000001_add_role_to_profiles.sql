-- Adicionar campo role à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'organizer'));

-- Criar índice para otimizar consultas por role
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Atualizar a função handle_new_user para incluir role padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'family_name', 
    new.email,
    'user'
  );
  RETURN new;
END;
$$;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.role IS 'Role do usuário: user (padrão), admin (administrador), organizer (organizador de eventos)';