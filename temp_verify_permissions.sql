SELECT 
    'Verificacao de Permissoes' as titulo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.profiles WHERE email = 'fotosartdesign@gmail.com' AND role = 'admin') 
        THEN 'fotosartdesign@gmail.com e ADMIN'
        ELSE 'fotosartdesign@gmail.com NAO e admin'
    END as status_admin,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'can_delete_users')
        THEN 'Funcao can_delete_users criada'
        ELSE 'Funcao can_delete_users nao encontrada'
    END as status_funcao,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'delete_user_complete')
        THEN 'Funcao delete_user_complete criada'
        ELSE 'Funcao delete_user_complete nao encontrada'
    END as status_delete_funcao;