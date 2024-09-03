-- Criação da tabela de participantes para gerenciamento persistente
-- Esta tabela permitirá salvar, editar e gerenciar participantes em massa

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text,
  email text,
  phone text,
  shirt_size text CHECK (shirt_size IN ('PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG')),
  dress_size text CHECK (dress_size IN ('PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_order_id ON participants(order_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON participants(created_at);

-- RLS (Row Level Security)
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios participantes
CREATE POLICY "Users can view own participants" ON participants
  FOR SELECT USING (auth.uid() = user_id);

-- Política: Usuários podem inserir participantes para si mesmos
CREATE POLICY "Users can insert own participants" ON participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar seus próprios participantes
CREATE POLICY "Users can update own participants" ON participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios participantes
CREATE POLICY "Users can delete own participants" ON participants
  FOR DELETE USING (auth.uid() = user_id);

-- Política: Administradores podem ver todos os participantes
CREATE POLICY "Admins can view all participants" ON participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER participants_updated_at_trigger
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION update_participants_updated_at();

-- Comentários para documentação
COMMENT ON TABLE participants IS 'Tabela para gerenciar participantes de eventos e caravanas';
COMMENT ON COLUMN participants.user_id IS 'ID do usuário que criou o participante';
COMMENT ON COLUMN participants.order_id IS 'ID do pedido associado (opcional)';
COMMENT ON COLUMN participants.name IS 'Nome completo do participante';
COMMENT ON COLUMN participants.cpf IS 'CPF do participante (opcional)';
COMMENT ON COLUMN participants.email IS 'Email do participante (opcional)';
COMMENT ON COLUMN participants.phone IS 'Telefone do participante (opcional)';
COMMENT ON COLUMN participants.shirt_size IS 'Tamanho da camiseta';
COMMENT ON COLUMN participants.dress_size IS 'Tamanho do vestido';
COMMENT ON COLUMN participants.status IS 'Status do participante (active, inactive, cancelled)';
COMMENT ON COLUMN participants.notes IS 'Observações adicionais sobre o participante';