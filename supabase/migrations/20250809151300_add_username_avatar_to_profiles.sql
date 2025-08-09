-- Adicionar campos username e avatar_url à tabela profiles

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Criar índice único para username (opcional, mas recomendado)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique 
ON public.profiles (username) 
WHERE username IS NOT NULL;

-- Atualizar trigger para incluir os novos campos
-- O trigger já existe, então não precisamos recriar

-- Comentário: Esta migração adiciona os campos username e avatar_url
-- que são esperados pelo código do frontend, especificamente no Profile.tsx