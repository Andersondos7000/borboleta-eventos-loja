#!/bin/bash

# Script para configurar o banco de dados Supabase
echo "🔧 Configurando banco de dados Supabase..."

# Verificar se supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado. Instalando..."
    npm install -g supabase
fi

# Aplicar migrações
echo "📊 Aplicando migrações do banco de dados..."
supabase db push

# Verificar se as tabelas foram criadas
echo "✅ Verificando se as tabelas foram criadas..."
supabase db dump --data-only --table=orders 2>/dev/null && echo "✅ Tabela orders criada" || echo "⚠️ Tabela orders não encontrada"
supabase db dump --data-only --table=order_items 2>/dev/null && echo "✅ Tabela order_items criada" || echo "⚠️ Tabela order_items não encontrada"

# Deploy das Edge Functions
echo "🚀 Fazendo deploy das Edge Functions..."
supabase functions deploy create-abacate-payment

echo "✅ Configuração concluída!"
echo "🔍 Para testar: acesse /checkout na aplicação"
