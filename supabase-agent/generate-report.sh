#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
OUTPUT_DIR="${OUTPUT_DIR:-reports}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-markdown}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "📊 Gerando Relatório de Saúde do Banco de Dados"

# Criar diretório de relatórios
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$OUTPUT_DIR/health_report_$TIMESTAMP.$OUTPUT_FORMAT"

# Vincular projeto
supabase link --project-ref "$PROJECT_REF"

# Verificar status
supabase status

# Iniciar relatório
if [ "$OUTPUT_FORMAT" = "markdown" ]; then
    echo "# Relatório de Saúde do Banco de Dados" > "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "**Data:** $(date)" >> "$REPORT_FILE"
    echo "**Projeto:** $PROJECT_REF" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
else
    echo "Relatório de Saúde do Banco de Dados" > "$REPORT_FILE"
    echo "Data: $(date)" >> "$REPORT_FILE"
    echo "Projeto: $PROJECT_REF" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

# Função para executar comando e adicionar ao relatório
run_command() {
    local title="$1"
    local command="$2"
    local temp_file="$(mktemp)"
    
    echo "🔍 Executando: $title"
    
    # Executar comando e capturar saída
    eval "$command" > "$temp_file" 2>&1
    
    # Adicionar ao relatório
    if [ "$OUTPUT_FORMAT" = "markdown" ]; then
        echo "## $title" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        cat "$temp_file" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    else
        echo "=== $title ===" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        cat "$temp_file" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
    
    # Limpar arquivo temporário
    rm "$temp_file"
}

# Executar comandos e adicionar ao relatório
run_command "Status do Projeto" "supabase status"
run_command "Diferenças no Schema" "supabase db diff --linked || echo 'Diferenças detectadas'"
run_command "Lista de Migrações" "supabase migration list --linked"
run_command "Tabelas Grandes" "supabase inspect db tables --linked | head -n 20"
run_command "Queries Lentas" "supabase inspect db outliers --linked | head -n 20"
run_command "Tabelas Inchadas" "supabase inspect db bloat --linked | head -n 20"
run_command "Estatísticas de Vacuum" "supabase inspect db vacuum-stats --linked | head -n 20"
run_command "Locks Ativos" "supabase inspect db locks --linked | head -n 20"
run_command "Índices Não Utilizados" "supabase inspect db indexes --linked | grep -A 10 'unused indexes' || echo 'Nenhum índice não utilizado encontrado'"
run_command "Conexões Ativas" "supabase inspect db connections --linked | head -n 20"

# Adicionar recomendações
if [ "$OUTPUT_FORMAT" = "markdown" ]; then
    echo "## Recomendações" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "Com base na análise, recomendamos:" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "1. **Otimização de Queries Lentas**: Revisar e otimizar as queries identificadas como lentas" >> "$REPORT_FILE"
    echo "2. **Limpeza de Tabelas Inchadas**: Executar VACUUM FULL nas tabelas com alto índice de bloat" >> "$REPORT_FILE"
    echo "3. **Remoção de Índices Não Utilizados**: Considerar a remoção de índices não utilizados para melhorar performance de escrita" >> "$REPORT_FILE"
    echo "4. **Monitoramento de Conexões**: Verificar se há conexões ociosas que podem ser encerradas" >> "$REPORT_FILE"
    echo "5. **Revisão de RLS**: Garantir que todas as tabelas críticas tenham políticas RLS adequadas" >> "$REPORT_FILE"
else
    echo "=== Recomendações ===" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "Com base na análise, recomendamos:" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "1. Otimização de Queries Lentas: Revisar e otimizar as queries identificadas como lentas" >> "$REPORT_FILE"
    echo "2. Limpeza de Tabelas Inchadas: Executar VACUUM FULL nas tabelas com alto índice de bloat" >> "$REPORT_FILE"
    echo "3. Remoção de Índices Não Utilizados: Considerar a remoção de índices não utilizados para melhorar performance de escrita" >> "$REPORT_FILE"
    echo "4. Monitoramento de Conexões: Verificar se há conexões ociosas que podem ser encerradas" >> "$REPORT_FILE"
    echo "5. Revisão de RLS: Garantir que todas as tabelas críticas tenham políticas RLS adequadas" >> "$REPORT_FILE"
fi

echo "✅ Relatório gerado com sucesso: $REPORT_FILE"