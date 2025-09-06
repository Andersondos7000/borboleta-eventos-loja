#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
INCLUDE_DATA="${INCLUDE_DATA:-true}"
COMPRESS="${COMPRESS:-true}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "💾 Backup do Banco de Dados Supabase"
echo "Projeto: $PROJECT_REF"
echo "Incluir dados: $INCLUDE_DATA"
echo "Compressão: $COMPRESS"

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Gerar timestamp para o nome do arquivo
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="supabase_${PROJECT_REF}_${TIMESTAMP}"

# Vincular projeto
echo "🔗 Vinculando ao projeto $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF"

# Verificar status
echo "📊 Verificando status do projeto..."
supabase status

# Obter URL do banco de dados
DB_URL=$(supabase status | grep 'DB URL' | awk '{print $3}')

# Verificar se a URL do banco foi obtida
if [ -z "$DB_URL" ]; then
    echo "❌ Não foi possível obter a URL do banco de dados"
    exit 1
fi

# Backup do schema
echo "🔄 Criando backup do schema..."
SCHEMA_FILE="${BACKUP_DIR}/${BACKUP_NAME}_schema.sql"

# Usar pg_dump para exportar apenas o schema
echo "Exportando schema para $SCHEMA_FILE..."
pg_dump "$DB_URL" --schema-only --no-owner --no-acl > "$SCHEMA_FILE"

# Verificar se o backup do schema foi criado com sucesso
if [ -f "$SCHEMA_FILE" ]; then
    echo "✅ Backup do schema criado com sucesso"
    
    # Contar número de objetos no schema
    TABLE_COUNT=$(grep -c "CREATE TABLE" "$SCHEMA_FILE" || echo 0)
    FUNCTION_COUNT=$(grep -c "CREATE FUNCTION" "$SCHEMA_FILE" || echo 0)
    TRIGGER_COUNT=$(grep -c "CREATE TRIGGER" "$SCHEMA_FILE" || echo 0)
    
    echo "📊 Estatísticas do schema:"
    echo "   - $TABLE_COUNT tabelas"
    echo "   - $FUNCTION_COUNT funções"
    echo "   - $TRIGGER_COUNT triggers"
else
    echo "❌ Falha ao criar backup do schema"
    exit 1
fi

# Backup dos dados (se solicitado)
if [ "$INCLUDE_DATA" = "true" ]; then
    echo "🔄 Criando backup dos dados..."
    DATA_FILE="${BACKUP_DIR}/${BACKUP_NAME}_data.sql"
    
    # Usar pg_dump para exportar apenas os dados
    echo "Exportando dados para $DATA_FILE..."
    pg_dump "$DB_URL" --data-only --no-owner --no-acl --inserts > "$DATA_FILE"
    
    # Verificar se o backup dos dados foi criado com sucesso
    if [ -f "$DATA_FILE" ]; then
        echo "✅ Backup dos dados criado com sucesso"
        
        # Contar número de linhas INSERT
        INSERT_COUNT=$(grep -c "INSERT INTO" "$DATA_FILE" || echo 0)
        
        echo "📊 Estatísticas dos dados:"
        echo "   - $INSERT_COUNT instruções INSERT"
    else
        echo "❌ Falha ao criar backup dos dados"
        exit 1
    fi
    
    # Criar backup completo (schema + dados)
    echo "🔄 Criando backup completo..."
    FULL_FILE="${BACKUP_DIR}/${BACKUP_NAME}_full.sql"
    
    # Concatenar arquivos
    cat "$SCHEMA_FILE" "$DATA_FILE" > "$FULL_FILE"
    
    # Verificar se o backup completo foi criado com sucesso
    if [ -f "$FULL_FILE" ]; then
        echo "✅ Backup completo criado com sucesso"
    else
        echo "❌ Falha ao criar backup completo"
        exit 1
    fi
fi

# Compressão dos arquivos (se solicitado)
if [ "$COMPRESS" = "true" ]; then
    echo "🔄 Comprimindo arquivos de backup..."
    
    # Comprimir schema
    gzip -f "$SCHEMA_FILE"
    
    # Verificar se a compressão do schema foi bem-sucedida
    if [ -f "${SCHEMA_FILE}.gz" ]; then
        echo "✅ Schema comprimido com sucesso"
        SCHEMA_FILE="${SCHEMA_FILE}.gz"
    else
        echo "❌ Falha ao comprimir schema"
    fi
    
    # Comprimir dados (se existir)
    if [ "$INCLUDE_DATA" = "true" ]; then
        gzip -f "$DATA_FILE"
        
        # Verificar se a compressão dos dados foi bem-sucedida
        if [ -f "${DATA_FILE}.gz" ]; then
            echo "✅ Dados comprimidos com sucesso"
            DATA_FILE="${DATA_FILE}.gz"
        else
            echo "❌ Falha ao comprimir dados"
        fi
        
        # Comprimir backup completo
        gzip -f "$FULL_FILE"
        
        # Verificar se a compressão do backup completo foi bem-sucedida
        if [ -f "${FULL_FILE}.gz" ]; then
            echo "✅ Backup completo comprimido com sucesso"
            FULL_FILE="${FULL_FILE}.gz"
        else
            echo "❌ Falha ao comprimir backup completo"
        fi
    fi
fi

# Criar arquivo de metadados
echo "🔄 Criando arquivo de metadados..."
META_FILE="${BACKUP_DIR}/${BACKUP_NAME}_metadata.json"

cat > "$META_FILE" << EOL
{
  "project_ref": "$PROJECT_REF",
  "timestamp": "$(date -Iseconds)",
  "backup_files": [
    "$(basename "$SCHEMA_FILE")"
$([ "$INCLUDE_DATA" = "true" ] && echo "    ,\"$(basename "$DATA_FILE")\""
[ "$INCLUDE_DATA" = "true" ] && echo "    ,\"$(basename "$FULL_FILE")\"")
  ],
  "statistics": {
    "tables": $TABLE_COUNT,
    "functions": $FUNCTION_COUNT,
    "triggers": $TRIGGER_COUNT
$([ "$INCLUDE_DATA" = "true" ] && echo "    ,\"inserts\": $INSERT_COUNT")
  }
}
EOL

# Verificar se o arquivo de metadados foi criado com sucesso
if [ -f "$META_FILE" ]; then
    echo "✅ Arquivo de metadados criado com sucesso"
else
    echo "❌ Falha ao criar arquivo de metadados"
    exit 1
fi

# Listar arquivos de backup
echo "📁 Arquivos de backup criados:"
ls -lh "$BACKUP_DIR/${BACKUP_NAME}"*

echo "✅ Backup concluído com sucesso"
echo "📂 Diretório de backup: $BACKUP_DIR"