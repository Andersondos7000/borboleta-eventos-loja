-- Corrigir função handle_new_user para incluir username dos metadados
-- Esta migração resolve o conflito onde o campo username existe na tabela profiles
-- mas não é populado pela função handle_new_user

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_username TEXT;
BEGIN
  -- Gerar username se não fornecido nos metadados
  generated_username := COALESCE(
    new.raw_user_meta_data ->> 'username',
    CASE 
      WHEN new.raw_user_meta_data ->> 'given_name' IS NOT NULL THEN
        lower(replace(new.raw_user_meta_data ->> 'given_name', ' ', '')) || '_' || substring(new.id::text, 1, 8)
      ELSE
        'user_' || substring(new.id::text, 1, 8)
    END
  );
  
  -- Garantir que o username tenha pelo menos 3 caracteres
  IF length(generated_username) < 3 THEN
    generated_username := 'user_' || substring(new.id::text, 1, 8);
  END IF;

  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    email, 
    username,
    role
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'given_name',
    new.raw_user_meta_data ->> 'family_name', 
    new.email,
    generated_username,
    COALESCE(new.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN new;
END;
$$;

-- Atualizar comentário da função
COMMENT ON FUNCTION public.handle_new_user() IS 'Automaticamente cria um perfil quando um novo usuário é criado em auth.users, incluindo username dos metadados';

-- Verificar se o trigger existe e recriá-lo se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();