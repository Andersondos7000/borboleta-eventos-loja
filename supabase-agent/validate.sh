#!/bin/bash
set -euo pipefail

echo "🔍 Validação Avançada"

# 1. Verificar RLS em tabelas críticas
echo "🔒 Verificando RLS..."
CRITICAL_TABLES=("customers" "orders" "payments" "tickets")

for table in "${CRITICAL_TABLES[@]}"; do
    RLS_ENABLED=$(psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -t -c "
        SELECT relrowsecurity FROM pg_class 
        WHERE relname = '$table' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    " | tr -d ' ')
    
    if [ "$RLS_ENABLED" = "t" ]; then
        echo "✅ RLS ativo: $table"
    else
        echo "⚠️ RLS inativo: $table"
    fi
done

# 2. Verificar foreign keys
echo "🔗 Verificando foreign keys..."
FK_VIOLATIONS=$(psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -t -c "
    SELECT COUNT(*) FROM pg_constraint
    WHERE contype = 'f' AND NOT pg_catalog.pg_constraint_is_valid(oid)
" | tr -d ' ')

if [ "$FK_VIOLATIONS" -eq 0 ]; then
    echo "✅ Foreign keys válidas"
else
    echo "❌ $FK_VIOLATIONS foreign keys violadas"
fi

# 3. Performance checks
echo "📊 Verificando performance..."
mkdir -p reports
supabase inspect db outliers --linked > reports/outliers.txt
supabase inspect db bloat --linked > reports/bloat.txt
supabase inspect db vacuum-stats --linked > reports/vacuum.txt

echo "✅ Validação concluída"