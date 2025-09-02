-- Função para exclusão em cascata de usuários
CREATE OR REPLACE FUNCTION public.delete_user_cascade(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Excluir carrinho do usuário
  DELETE FROM public.carrinho WHERE user_id = target_user_id;
  
  -- Excluir tickets do usuário
  DELETE FROM public.tickets WHERE user_id = target_user_id;
  
  -- Excluir pedidos do usuário
  DELETE FROM public.pedidos WHERE user_id = target_user_id;
  
  -- Excluir perfil do usuário
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Excluir usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO service_role;

-- Comentário da função
COMMENT ON FUNCTION public.delete_user_cascade(uuid) IS 'Exclui um usuário e todos os seus dados relacionados em cascata';