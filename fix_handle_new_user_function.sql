-- Corrigir função handle_new_user para gerar username válido
-- Esta migração resolve o erro "Database error saving new user" 
-- causado pela constraint de username mínimo de 3 caracteres

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_username TEXT;
  username_counter INTEGER := 1;
  final_username TEXT;
BEGIN
  -- Gerar username base se não fornecido nos metadados
  generated_username := COALESCE(
    new.raw_user_meta_data ->> 'username',
    CASE 
      WHEN new.raw_user_meta_data ->> 'given_name' IS NOT NULL THEN
        lower(regexp_replace(new.raw_user_meta_data ->> 'given_name', '[^a-zA-Z0-9]', '', 'g')) || '_' || substring(new.id::text, 1, 8)
      ELSE
        'user_' || substring(new.id::text, 1, 8)
    END
  );
  
  -- Garantir que o username tenha pelo menos 3 caracteres
  IF length(generated_username) < 3 THEN
    generated_username := 'user_' || substring(new.id::text, 1, 8);
  END IF;

  -- Verificar unicidade e ajustar se necessário
  final_username := generated_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    final_username := generated_username || '_' || username_counter;
    username_counter := username_counter + 1;
  END LOOP;

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
    final_username,
    COALESCE(new.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro para debugging
    RAISE LOG 'Erro ao criar perfil para usuário %: %', new.id, SQLERRM;
    -- Re-raise o erro para que o Supabase possa capturar
    RAISE;
END;
$$;

-- Atualizar comentário da função
COMMENT ON FUNCTION public.handle_new_user() IS 'Automaticamente cria um perfil quando um novo usuário é criado em auth.users, gerando username único se necessário';

-- Verificar se o trigger existe e recriá-lo se necessário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();