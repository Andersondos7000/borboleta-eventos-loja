-- Corrigir função handle_new_user para gerar username válido
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    generated_username text;
    counter integer := 0;
    base_username text;
BEGIN
    -- Gerar username base a partir do email
    base_username := COALESCE(
        NULLIF(TRIM(split_part(NEW.email, '@', 1)), ''),
        'user'
    );
    
    -- Remover caracteres especiais e garantir que tenha pelo menos 3 caracteres
    base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
    
    IF LENGTH(base_username) < 3 THEN
        base_username := 'user' || EXTRACT(EPOCH FROM NOW())::bigint;
    END IF;
    
    -- Garantir que o username seja único
    generated_username := base_username;
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = generated_username) LOOP
        counter := counter + 1;
        generated_username := base_username || counter;
    END LOOP;
    
    -- Inserir o perfil do usuário
    INSERT INTO public.profiles (
        id,
        username,
        full_name,
        avatar_url,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        generated_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        'customer',
        NOW(),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro para debugging
        RAISE LOG 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
        -- Re-raise o erro para que seja tratado pela aplicação
        RAISE;
END;
$$;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();