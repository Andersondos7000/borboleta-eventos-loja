-- Garantir que a tabela profiles existe com a estrutura correta
-- Corrige o erro: column profiles.id does not exist

-- Criar a tabela profiles se não existir
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone DEFAULT NOW(),
  username text UNIQUE,
  full_name text,
  avatar_url text,
  website text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'organizer')),
  person_type text CHECK (person_type IN ('fisica', 'juridica')),
  cpf text,
  country text DEFAULT 'Brasil',
  zip_code text,
  address text,
  address_number text,
  neighborhood text,
  city text,
  state text,
  email text,
  is_verified boolean DEFAULT false,
  certification_level text CHECK (certification_level IN ('basico', 'intermediario', 'avancado', 'expert')),
  CONSTRAINT username_length CHECK ((char_length(username) >= 3))
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS básicas (sem recursão)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Nota: Políticas de admin serão criadas em migração posterior para evitar recursão

-- Função para lidar com novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
