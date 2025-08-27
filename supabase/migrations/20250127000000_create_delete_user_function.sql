-- Função para excluir usuário e todos os dados relacionados
CREATE OR REPLACE FUNCTION delete_user_cascade(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid) THEN
    RAISE EXCEPTION 'Usuário não encontrado: %', user_uuid;
  END IF;

  -- Excluir dados relacionados em ordem (respeitando foreign keys)
  
  -- 1. Excluir itens do carrinho
  DELETE FROM public.cart_items WHERE user_id = user_uuid;
  
  -- 2. Excluir tickets do usuário
  DELETE FROM public.tickets WHERE user_id = user_uuid;
  
  -- 3. Excluir pedidos do usuário
  DELETE FROM public.orders WHERE user_id = user_uuid;
  
  -- 4. Excluir perfil do usuário
  DELETE FROM public.profiles WHERE id = user_uuid;
  
  -- 5. Finalmente, excluir o usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = user_uuid;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro
    RAISE EXCEPTION 'Erro ao excluir usuário %: %', user_uuid, SQLERRM;
    RETURN false;
END;
$$;

-- Conceder permissões para a função
GRANT EXECUTE ON FUNCTION delete_user_cascade(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION delete_user_cascade(uuid) TO authenticated;

-- Política RLS para permitir que apenas admins executem a função
CREATE POLICY "Apenas admins podem excluir usuários"
ON auth.users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Comentário da função
COMMENT ON FUNCTION delete_user_cascade(uuid) IS 'Exclui um usuário e todos os seus dados relacionados de forma segura, respeitando as foreign keys';