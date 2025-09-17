-- Script para debugar a função delete_user_complete

-- 1. Verificar se a função existe
SELECT 
    routine_name, 
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name = 'delete_user_complete';

-- 2. Verificar se a função can_delete_users existe
SELECT 
    routine_name, 
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name = 'can_delete_users';

-- 3. Testar a função can_delete_users com um usuário admin
SELECT 
    id,
    role,
    is_verified,
    certification_level,
    can_delete_users(id) as can_delete
FROM public.profiles 
WHERE role = 'admin'
LIMIT 1;

-- 4. Verificar estrutura das tabelas relacionadas
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'customers', 'tickets', 'cart_items')
ORDER BY table_name, ordinal_position;

-- 5. Verificar se existem foreign keys que podem estar causando problemas
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND (tc.table_name IN ('profiles', 'customers', 'tickets', 'cart_items') 
         OR ccu.table_name IN ('profiles', 'customers', 'tickets', 'cart_items'));