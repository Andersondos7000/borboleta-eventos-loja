-- Adicionar campos do checkout à tabela profiles
-- Baseado nos campos do CustomerInformation.tsx

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS person_type TEXT CHECK (person_type IN ('fisica', 'juridica')),
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Brasil',
ADD COLUMN IF NOT EXISTS zip_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN public.profiles.person_type IS 'Tipo de pessoa: física ou jurídica';
COMMENT ON COLUMN public.profiles.cpf IS 'CPF ou CNPJ do usuário';
COMMENT ON COLUMN public.profiles.country IS 'País do usuário';
COMMENT ON COLUMN public.profiles.zip_code IS 'CEP do endereço';
COMMENT ON COLUMN public.profiles.address IS 'Endereço completo (rua, avenida, etc.)';
COMMENT ON COLUMN public.profiles.address_number IS 'Número do endereço';
COMMENT ON COLUMN public.profiles.neighborhood IS 'Bairro do endereço';
COMMENT ON COLUMN public.profiles.city IS 'Cidade do endereço';
COMMENT ON COLUMN public.profiles.state IS 'Estado/UF do endereço';

-- Log da migração
INSERT INTO public.migration_logs (migration_name, description, executed_at)
VALUES (
  '20250128000000_add_checkout_fields_to_profiles',
  'Adiciona campos do checkout (endereço, CPF, etc.) à tabela profiles para permitir visualização completa dos dados do usuário',
  NOW()
);