# Políticas RLS do Supabase - Storage

## Resumo
Este documento descreve as políticas de Row Level Security (RLS) configuradas para o sistema de storage do Supabase, permitindo que administradores gerenciem uploads de imagens.

## Buckets Configurados

### 1. product-images
- **Tipo**: Público
- **Tamanho máximo**: 50MB
- **Tipos permitidos**: image/jpeg, image/png, image/webp
- **Finalidade**: Armazenar imagens de produtos

### 2. event-images
- **Tipo**: Público
- **Tamanho máximo**: 50MB
- **Tipos permitidos**: image/jpeg, image/png, image/webp
- **Finalidade**: Armazenar imagens de eventos

## Políticas RLS Configuradas

### Políticas para Administradores

#### Upload (INSERT)
- **Admins can upload product images**: Permite que usuários com role 'admin' façam upload no bucket 'product-images'
- **Admins can upload event images**: Permite que usuários com role 'admin' façam upload no bucket 'event-images'

#### Leitura (SELECT)
- **Admins can read product images**: Permite que administradores leiam imagens de produtos
- **Admins can read event images**: Permite que administradores leiam imagens de eventos

#### Atualização (UPDATE)
- **Admins can update product images**: Permite que administradores atualizem imagens de produtos
- **Admins can update event images**: Permite que administradores atualizem imagens de eventos

#### Exclusão (DELETE)
- **Admins can delete product images**: Permite que administradores deletem imagens de produtos
- **Admins can delete event images**: Permite que administradores deletem imagens de eventos

### Políticas Públicas

#### Leitura (SELECT)
- **Public can read product images**: Permite leitura pública das imagens de produtos
- **Public can read event images**: Permite leitura pública das imagens de eventos

## Critérios de Autorização

Todas as políticas de administrador verificam:
1. O usuário está autenticado (`authenticated` role)
2. Existe um perfil na tabela `profiles` com:
   - `id` igual ao `auth.uid()` do usuário atual
   - `role` igual a 'admin'

## Como Funciona

### Para Administradores
1. O usuário deve estar logado no sistema
2. Deve ter um perfil na tabela `profiles` com `role = 'admin'`
3. Pode fazer upload, ler, atualizar e deletar imagens nos buckets configurados

### Para Usuários Públicos
1. Podem apenas visualizar as imagens (SELECT)
2. Não precisam estar autenticados
3. Acesso limitado aos buckets públicos (product-images e event-images)

## Testando as Políticas

### Verificar se um usuário é admin
```sql
SELECT role FROM profiles WHERE id = auth.uid();
```

### Testar upload (como admin)
```sql
-- Deve funcionar se o usuário for admin
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
VALUES ('product-images', 'test-image.jpg', auth.uid(), '{}');
```

### Verificar políticas ativas
```sql
SELECT policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage' 
ORDER BY policyname;
```

## Solução de Problemas

### Erro: "new row violates row-level security policy"
- Verificar se o usuário tem role 'admin' na tabela profiles
- Confirmar que o usuário está autenticado
- Verificar se o bucket_id está correto

### Erro: "permission denied for table objects"
- Verificar se RLS está habilitado: `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects';`
- Confirmar que as políticas foram criadas corretamente

## Manutenção

### Adicionar novo bucket
1. Criar o bucket no Supabase Dashboard
2. Criar políticas RLS seguindo o padrão existente
3. Atualizar esta documentação

### Modificar permissões
1. Usar `ALTER POLICY` para modificar políticas existentes
2. Ou `DROP POLICY` + `CREATE POLICY` para recriar

---

**Data de criação**: Janeiro 2025  
**Última atualização**: Janeiro 2025  
**Responsável**: Sistema de Administração Queren E-commerce