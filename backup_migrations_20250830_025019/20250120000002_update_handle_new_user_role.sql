-- Atualizar a função handle_new_user para usar o role dos metadados
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
    COALESCE(new.raw_user_meta_data ->> 'role', 'user')
  );
  RETURN new;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.handle_new_user() IS 'Função trigger que cria automaticamente um perfil quando um usuário é criado, usando o role dos metadados ou "user" como padrão';