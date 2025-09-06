#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
OUTPUT_DIR="${OUTPUT_DIR:-./src/types}"
OUTPUT_FILE="${OUTPUT_FILE:-database.types.ts}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "📄 Gerador de Tipos TypeScript para Supabase"

# Vincular projeto
echo "🔗 Vinculando ao projeto $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

# Verificar status
echo "📊 Verificando status do projeto..."
supabase status

# Criar diretório de saída se não existir
mkdir -p "$OUTPUT_DIR"

# Gerar tipos TypeScript
echo "🔄 Gerando tipos TypeScript..."
OUTPUT_PATH="$OUTPUT_DIR/$OUTPUT_FILE"

# Gerar tipos com cabeçalho personalizado
cat > "$OUTPUT_PATH" << EOL
/**
 * Tipos gerados automaticamente do banco de dados Supabase
 * Gerado em: $(date)
 * Projeto: $PROJECT_REF
 *
 * ATENÇÃO: NÃO EDITE ESTE ARQUIVO DIRETAMENTE!
 * Este arquivo é gerado automaticamente e será sobrescrito.
 */

EOL

# Adicionar tipos gerados ao arquivo
supabase gen types typescript --linked >> "$OUTPUT_PATH"

# Verificar se o arquivo foi gerado com sucesso
if [ -f "$OUTPUT_PATH" ]; then
    echo "✅ Tipos TypeScript gerados com sucesso em $OUTPUT_PATH"
    
    # Contar número de tipos gerados
    TYPE_COUNT=$(grep -c "export type" "$OUTPUT_PATH" || echo 0)
    TABLE_COUNT=$(grep -c "Tables =" "$OUTPUT_PATH" || echo 0)
    
    echo "📊 Estatísticas:"
    echo "   - $TYPE_COUNT tipos gerados"
    echo "   - $TABLE_COUNT tabelas encontradas"
    
    # Verificar se há tipos para tabelas críticas
    CRITICAL_TABLES=("profiles" "customers" "orders" "payments" "tickets" "users" "products")
    
    echo "🔍 Verificando tipos para tabelas críticas:"
    for table in "${CRITICAL_TABLES[@]}"; do
        if grep -q "$table:" "$OUTPUT_PATH"; then
            echo "   ✅ $table: Tipo encontrado"
        else
            echo "   ⚠️ $table: Tipo não encontrado"
        fi
    done
else
    echo "❌ Falha ao gerar tipos TypeScript"
    exit 1
fi

# Gerar arquivo de barril (index.ts) para exportar todos os tipos
if [ "$OUTPUT_FILE" != "index.ts" ]; then
    echo "🔄 Gerando arquivo de barril (index.ts)..."
    
    INDEX_PATH="$OUTPUT_DIR/index.ts"
    
    cat > "$INDEX_PATH" << EOL
/**
 * Arquivo de barril para exportar todos os tipos do banco de dados
 * Gerado em: $(date)
 */

export * from './${OUTPUT_FILE%.*}';

EOL
    
    echo "✅ Arquivo de barril gerado com sucesso em $INDEX_PATH"
fi

echo "✅ Processo de geração de tipos concluído com sucesso"