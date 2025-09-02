-- Migração da tabela: profiles
-- Gerado em: 2025-08-30T04:00:19.293Z

-- Atualizando constraints
ALTER TABLE profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
ALTER TABLE profiles ADD CONSTRAINT profiles_username_length CHECK (length(username) >= 3);

