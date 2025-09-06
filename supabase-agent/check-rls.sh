#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
OUTPUT_DIR="${OUTPUT_DIR:-reports}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "🔒 Verificando Políticas RLS"

# Criar diretório de relatórios
mkdir -p "$OUTPUT_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RLS_REPORT="$OUTPUT_DIR/rls_report_$TIMESTAMP.md"

# Vincular projeto
supabase link --project-ref "$PROJECT_REF"

# Verificar status
supabase status

# Obter URL do banco de dados
DB_URL=$(supabase status | grep 'DB URL' | awk '{print $3}')

# Iniciar relatório
echo "# Relatório de Segurança RLS" > "$RLS_REPORT"
echo "" >> "$RLS_REPORT"
echo "**Data:** $(date)" >> "$RLS_REPORT"
echo "**Projeto:** $PROJECT_REF" >> "$RLS_REPORT"
echo "" >> "$RLS_REPORT"

# Obter lista de tabelas públicas
echo "## Tabelas Públicas" >> "$RLS_REPORT"
echo "" >> "$RLS_REPORT"
echo "| Tabela | RLS Ativo | Políticas | Status |" >> "$RLS_REPORT"
echo "|-------|-----------|-----------|--------|" >> "$RLS_REPORT"

# Tabelas críticas que devem ter RLS ativo
CRITICAL_TABLES=("profiles" "customers" "orders" "payments" "tickets" "users" "products" "cart_items" "order_items" "events")

# Verificar RLS em todas as tabelas públicas
TABLES=$(psql "$DB_URL" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public'" | tr -d ' ')

for table in $TABLES; do
    # Verificar se RLS está ativo
    RLS_ENABLED=$(psql "$DB_URL" -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = '$table' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')" | tr -d ' ')
    
    # Contar políticas
    POLICY_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_policy WHERE schemaname = 'public' AND tablename = '$table'" | tr -d ' ')
    
    # Determinar status
    if [[ " ${CRITICAL_TABLES[@]} " =~ " $table " ]]; then
        if [ "$RLS_ENABLED" = "t" ] && [ "$POLICY_COUNT" -gt 0 ]; then
            STATUS="✅ Seguro"
        else
            STATUS="❌ CRÍTICO - Requer RLS"
        fi
    else
        if [ "$RLS_ENABLED" = "t" ] && [ "$POLICY_COUNT" -gt 0 ]; then
            STATUS="✅ Seguro"
        elif [ "$RLS_ENABLED" = "t" ] && [ "$POLICY_COUNT" -eq 0 ]; then
            STATUS="⚠️ Sem políticas"
        else
            STATUS="⚠️ RLS desativado"
        fi
    fi
    
    # Adicionar à tabela
    echo "| $table | ${RLS_ENABLED/t/✅ Sim}${RLS_ENABLED/f/❌ Não} | $POLICY_COUNT | $STATUS |" >> "$RLS_REPORT"
done

# Listar políticas para tabelas críticas
echo "" >> "$RLS_REPORT"
echo "## Detalhes de Políticas para Tabelas Críticas" >> "$RLS_REPORT"
echo "" >> "$RLS_REPORT"

for table in "${CRITICAL_TABLES[@]}"; do
    # Verificar se a tabela existe
    TABLE_EXISTS=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = '$table'" | tr -d ' ')
    
    if [ "$TABLE_EXISTS" -eq 0 ]; then
        continue
    fi
    
    echo "### Tabela: $table" >> "$RLS_REPORT"
    echo "" >> "$RLS_REPORT"
    
    # Obter políticas
    POLICIES=$(psql "$DB_URL" -t -c "SELECT policyname, permissive, cmd, qual, with_check FROM pg_policy WHERE schemaname = 'public' AND tablename = '$table'")
    
    if [ -z "$POLICIES" ]; then
        echo "⚠️ Nenhuma política definida" >> "$RLS_REPORT"
    else
        echo "| Nome | Tipo | Operação | Usando (qual) | Com verificação |" >> "$RLS_REPORT"
        echo "|------|------|----------|---------------|----------------|" >> "$RLS_REPORT"
        
        echo "$POLICIES" | while read -r line; do
            POLICY_NAME=$(echo "$line" | awk -F'|' '{print $1}' | tr -d ' ')
            PERMISSIVE=$(echo "$line" | awk -F'|' '{print $2}' | tr -d ' ')
            CMD=$(echo "$line" | awk -F'|' '{print $3}' | tr -d ' ')
            QUAL=$(echo "$line" | awk -F'|' '{print $4}' | tr -d ' ')
            WITH_CHECK=$(echo "$line" | awk -F'|' '{print $5}' | tr -d ' ')
            
            # Formatar operação
            case "$CMD" in
                "r") CMD="SELECT" ;;
                "a") CMD="INSERT" ;;
                "w") CMD="UPDATE" ;;
                "d") CMD="DELETE" ;;
                "*") CMD="ALL" ;;
            esac
            
            echo "| $POLICY_NAME | ${PERMISSIVE/t/Permissiva}${PERMISSIVE/f/Restritiva} | $CMD | $QUAL | $WITH_CHECK |" >> "$RLS_REPORT"
        done
    fi
    
    echo "" >> "$RLS_REPORT"
done

# Adicionar recomendações
echo "## Recomendações de Segurança" >> "$RLS_REPORT"
echo "" >> "$RLS_REPORT"
echo "1. **Ativar RLS em Todas as Tabelas Críticas**: Todas as tabelas que armazenam dados sensíveis devem ter RLS ativado." >> "$RLS_REPORT"
echo "2. **Definir Políticas Adequadas**: Cada tabela com RLS ativo deve ter políticas que definam claramente quem pode acessar os dados." >> "$RLS_REPORT"
echo "3. **Testar Políticas**: Verifique se as políticas estão funcionando corretamente com diferentes perfis de usuário." >> "$RLS_REPORT"
echo "4. **Revisar Regularmente**: Faça revisões periódicas das políticas RLS para garantir que continuam adequadas." >> "$RLS_REPORT"
echo "5. **Documentar Políticas**: Mantenha documentação clara sobre as políticas RLS implementadas." >> "$RLS_REPORT"

echo "✅ Relatório de RLS gerado com sucesso: $RLS_REPORT"