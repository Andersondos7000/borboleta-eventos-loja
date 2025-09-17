-- Script para excluir o usuário andersondiagramacao@gmail.com
DELETE FROM auth.users WHERE email = 'andersondiagramacao@gmail.com';

-- Verificar se o usuário foi excluído
SELECT COUNT(*) as usuarios_restantes FROM auth.users WHERE email = 'andersondiagramacao@gmail.com';