#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
OUTPUT_DIR="${OUTPUT_DIR:-reports}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "🔍 Monitoramento de Saúde do Banco de Dados"

# Criar diretório de relatórios
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Vincular projeto
supabase link --project-ref "$PROJECT_REF"

# Verificar status
supabase status

# Executar comandos de monitoramento
echo "📊 Gerando relatórios de monitoramento..."

# 1. Queries lentas
echo "🐢 Verificando queries lentas..."
supabase inspect db outliers --linked > "$OUTPUT_DIR/outliers_$TIMESTAMP.txt"

# 2. Tabelas inchadas
echo "🎈 Verificando tabelas inchadas..."
supabase inspect db bloat --linked > "$OUTPUT_DIR/bloat_$TIMESTAMP.txt"

# 3. Estatísticas de vacuum
echo "🧹 Verificando estatísticas de vacuum..."
supabase inspect db vacuum-stats --linked > "$OUTPUT_DIR/vacuum_$TIMESTAMP.txt"

# 4. Locks
echo "🔒 Verificando locks..."
supabase inspect db locks --linked > "$OUTPUT_DIR/locks_$TIMESTAMP.txt"

# 5. Estatísticas de tabelas
echo "📈 Verificando estatísticas de tabelas..."
supabase inspect db tables --linked > "$OUTPUT_DIR/tables_$TIMESTAMP.txt"

# 6. Estatísticas de índices
echo "🔍 Verificando estatísticas de índices..."
supabase inspect db indexes --linked > "$OUTPUT_DIR/indexes_$TIMESTAMP.txt"

# 7. Conexões
echo "🔌 Verificando conexões..."
supabase inspect db connections --linked > "$OUTPUT_DIR/connections_$TIMESTAMP.txt"

# 8. Resumo
echo "📑 Gerando resumo..."
echo "Relatório de Monitoramento - $(date)" > "$OUTPUT_DIR/summary_$TIMESTAMP.txt"
echo "" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"

# Verificar tabelas grandes
echo "Tabelas Grandes:" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"
grep -A 5 "largest tables" "$OUTPUT_DIR/tables_$TIMESTAMP.txt" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"
echo "" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"

# Verificar índices não utilizados
echo "Índices Não Utilizados:" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"
grep -A 10 "unused indexes" "$OUTPUT_DIR/indexes_$TIMESTAMP.txt" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"
echo "" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"

# Verificar queries lentas
echo "Queries Lentas:" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"
head -n 20 "$OUTPUT_DIR/outliers_$TIMESTAMP.txt" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"
echo "" >> "$OUTPUT_DIR/summary_$TIMESTAMP.txt"

echo "✅ Monitoramento concluído. Relatórios disponíveis em $OUTPUT_DIR"
echo "📑 Resumo disponível em $OUTPUT_DIR/summary_$TIMESTAMP.txt"