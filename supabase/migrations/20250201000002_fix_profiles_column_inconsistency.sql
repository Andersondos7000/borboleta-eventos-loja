-- Corrigir inconsistência na estrutura da tabela profiles
-- O problema é que algumas partes do código usam 'id' e outras 'user_id'

-- Primeiro, verificar se a tabela existe e qual estrutura tem
DO $$
BEGIN
    -- Se a tabela tem coluna 'user_id', renomear para 'id'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public' 
        AND column_name = 'user_id'
    ) THEN
        -- Remover constraint de chave primária se existir
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
        
        -- Renomear coluna user_id para id
        ALTER TABLE public.profiles RENAME COLUMN user_id TO id;
        
        -- Recriar chave primária
        ALTER TABLE public.profiles ADD PRIMARY KEY (id);
        
        -- Recriar foreign key constraint
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Coluna user_id renomeada para id com sucesso';
    ELSE
        RAISE NOTICE 'Tabela profiles já usa coluna id corretamente';
    END IF;
END $$;

-- Garantir que a estrutura está correta
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
  CONSTRAINT username_length CHECK ((char_length(username) >= 3))
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recriar políticas RLS com estrutura correta
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'organizer')
    )
  );

DROP POLICY IF EXISTS "Allow profile creation" ON public.profiles;
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Atualizar função handle_new_user para usar estrutura correta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON TABLE public.profiles IS 'Tabela de perfis de usuários com estrutura corrigida usando id como chave primária';