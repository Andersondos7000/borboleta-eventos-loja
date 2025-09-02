-- Criar tabela de clientes
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados pessoais
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  document VARCHAR(20), -- CPF ou CNPJ
  document_type VARCHAR(10) CHECK (document_type IN ('cpf', 'cnpj')),
  birth_date DATE,
  
  -- Endereço
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_neighborhood VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zipcode VARCHAR(10),
  address_country VARCHAR(50) DEFAULT 'Brasil',
  
  -- Metadados
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  customer_type VARCHAR(20) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
  notes TEXT,
  
  -- Campos de auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Campos de sincronização realtime
  version INTEGER DEFAULT 1,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_status VARCHAR(20) DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_document ON customers(document);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_sync_status ON customers(sync_status);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  NEW.last_sync_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Configurar RLS (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios clientes
CREATE POLICY "Users can view own customers" ON customers
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Política: Usuários podem inserir clientes para si mesmos
CREATE POLICY "Users can insert own customers" ON customers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Política: Usuários podem atualizar seus próprios clientes
CREATE POLICY "Users can update own customers" ON customers
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  ) WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Política: Apenas admins podem deletar clientes
CREATE POLICY "Only admins can delete customers" ON customers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Habilitar realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- Função para validar CPF (simplificada)
CREATE OR REPLACE FUNCTION validate_cpf(cpf TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove caracteres não numéricos
  cpf := regexp_replace(cpf, '[^0-9]', '', 'g');
  
  -- Verifica se tem 11 dígitos
  IF length(cpf) != 11 THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica se não são todos iguais (111.111.111-11, etc.)
  IF cpf ~ '^(.)\1{10}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Aqui poderia ter a validação completa do CPF
  -- Por simplicidade, retornamos TRUE se passou nas validações básicas
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para validar CNPJ (simplificada)
CREATE OR REPLACE FUNCTION validate_cnpj(cnpj TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove caracteres não numéricos
  cnpj := regexp_replace(cnpj, '[^0-9]', '', 'g');
  
  -- Verifica se tem 14 dígitos
  IF length(cnpj) != 14 THEN
    RETURN FALSE;
  END IF;
  
  -- Verifica se não são todos iguais
  IF cnpj ~ '^(.)\1{13}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Aqui poderia ter a validação completa do CNPJ
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar documento antes de inserir/atualizar
CREATE OR REPLACE FUNCTION validate_customer_document()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.document IS NOT NULL AND NEW.document_type IS NOT NULL THEN
    IF NEW.document_type = 'cpf' AND NOT validate_cpf(NEW.document) THEN
      RAISE EXCEPTION 'CPF inválido: %', NEW.document;
    END IF;
    
    IF NEW.document_type = 'cnpj' AND NOT validate_cnpj(NEW.document) THEN
      RAISE EXCEPTION 'CNPJ inválido: %', NEW.document;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_customer_document
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_customer_document();

-- Comentários na tabela
COMMENT ON TABLE customers IS 'Tabela de clientes com suporte a realtime e sincronização';
COMMENT ON COLUMN customers.version IS 'Versão do registro para controle de conflitos';
COMMENT ON COLUMN customers.sync_status IS 'Status de sincronização realtime';
COMMENT ON COLUMN customers.document IS 'CPF ou CNPJ do cliente';
COMMENT ON COLUMN customers.document_type IS 'Tipo do documento: cpf ou cnpj';