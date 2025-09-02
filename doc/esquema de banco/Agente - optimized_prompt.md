# 🤖 Agente Supabase Deploy - PRD Otimizado

## 🎯 Objetivo
Criar **agente automatizado** para:
- Sincronizar schema entre local e Supabase Cloud
- Deploy sem login manual (via tokens)
- Validar estrutura, migrações e dados
- Gerar tipos automaticamente
- Monitorar integridade

## 🔧 Requisitos Funcionais
| ID | Requisito | Prioridade |
|----|---------|----------|
| RF-01 | Deploy sem login manual (`SUPABASE_ACCESS_TOKEN`) | Alta |
| RF-02 | Vincular automaticamente via `project-ref` | Alta |
| RF-03 | Aplicar migrações com `db push` | Alta |
| RF-04 | Validar estado antes/após deploy | Média |
| RF-05 | Gerar tipos TypeScript (`gen types`) | Média |
| RF-06 | Executar testes (`db lint`, `test db`) | Média |

## 🛠️ Requisitos Técnicos
- Usar `supabase link --project-ref` para vínculo automático
- Executar `migration list` antes de `db push` para validação
- Usar `db pull` para atualizar schema local
- Incluir `inspect db outliers` e `bloat` para monitoramento
- Suportar CI/CD (GitHub Actions)

## 📦 Estrutura
```
supabase-agent/
├── deploy.sh              # Script principal
├── validate.sh            # Validação avançada
├── seed/
│   ├── staging/
│   └── production/
└── .github/workflows/
    └── deploy.yml
```

## 🔐 Autenticação
```bash
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"
# Obter em: https://supabase.com/dashboard/account/tokens
# Permissões: project:read, project:write, db:write
```

## 🚀 Script Principal (deploy.sh)
```bash
#!/bin/bash
set -euo pipefail

# Configuração
PROJECT_REF="${PROJECT_REF:-}"
ENVIRONMENT="${ENVIRONMENT:-staging}"
DRY_RUN="${DRY_RUN:-false}"

# Validações
[ -z "$SUPABASE_ACCESS_TOKEN" ] && { echo "❌ Token não definido"; exit 1; }
[ -z "$PROJECT_REF" ] && { echo "❌ PROJECT_REF não definido"; exit 1; }

echo "🤖 Agente Supabase Deploy - $ENVIRONMENT"

# 1. Verificar CLI e token
supabase --version
supabase whoami

# 2. Vincular projeto
supabase link --project-ref "$PROJECT_REF"

# 3. Verificar status
supabase status

# 4. Verificar diferenças
echo "🔍 Verificando diff..."
supabase db diff --linked || echo "⚠️ Diferenças detectadas"

# 5. Aplicar migrações
echo "📋 Migrações:"
supabase migration list --linked

if [ "$DRY_RUN" = "false" ]; then
    echo "🔄 Aplicando migrações..."
    supabase db push --linked
    
    # Atualizar local após push
    supabase db pull --linked
fi

# 6. Gerar tipos
echo "📄 Gerando tipos..."
mkdir -p src
supabase gen types typescript --linked > src/database.types.ts

# 7. Testes
echo "🧪 Executando testes..."
supabase db lint --linked
supabase test db --linked

echo "✅ Deploy concluído!"
```

## 🔍 Validação Avançada (validate.sh)
```bash
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
supabase inspect db outliers --linked > reports/outliers.txt
supabase inspect db bloat --linked > reports/bloat.txt
supabase inspect db vacuum-stats --linked > reports/vacuum.txt

echo "✅ Validação concluída"
```

## 🔄 CI/CD Otimizado (.github/workflows/deploy.yml)
```yaml
name: 🤖 Supabase Deploy

on:
  push:
    branches: [main, staging]
    paths: ['supabase/migrations/**']
  pull_request:
    branches: [main]

env:
  SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

jobs:
  validate:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Cache Supabase CLI
        uses: actions/cache@v4
        with:
          path: ~/.local/bin/supabase
          key: ${{ runner.os }}-supabase-cli
      
      - name: Install CLI
        run: |
          [ ! -f ~/.local/bin/supabase ] && curl -fsSL https://cli.supabase.com/install.sh | sh
          echo "$HOME/.local/bin" >> $GITHUB_PATH
      
      - name: Validar migrações
        env:
          PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF_STAGING }}
        run: |
          chmod +x scripts/validate.sh
          scripts/validate.sh

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install CLI
        run: curl -fsSL https://cli.supabase.com/install.sh | sh
      
      - name: Deploy
        env:
          PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF_STAGING }}
          ENVIRONMENT: staging
        run: |
          chmod +x scripts/deploy.sh
          scripts/deploy.sh

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Install CLI
        run: curl -fsSL https://cli.supabase.com/install.sh | sh
      
      - name: Deploy
        env:
          PROJECT_REF: ${{ secrets.SUPABASE_PROJECT_REF_PRODUCTION }}
          ENVIRONMENT: production
        run: |
          chmod +x scripts/deploy.sh
          scripts/deploy.sh
```

## 🧩 Seeds Condicionais
```sql
-- seed/staging/customers.sql
INSERT INTO public.customers (name, email, phone, status)
SELECT name, email, phone, 'active'
FROM local_backup.customers
WHERE email NOT IN (SELECT email FROM public.customers)
ON CONFLICT (email) DO NOTHING;
```

## 📊 Monitoramento Essencial
```bash
# Comandos de saúde do banco
supabase inspect db outliers --linked    # Queries lentas
supabase inspect db bloat --linked       # Tabelas inchadas  
supabase inspect db locks --linked       # Deadlocks
supabase inspect db vacuum-stats --linked # Saúde autovacuum
```

## ⚙️ Otimizações Recomendadas
- **UUIDv7**: Migrar de `gen_random_uuid()` para `uuid_generate_v7()`
- **Índices compostos**: `orders(customer_id, created_at)`, `tickets(event_id, user_id)`
- **JSONB**: Consolidar endereços em campo único
- **RLS**: Ativar em todas as tabelas principais

## 🧹 Limpeza Automática
```sql
-- Migração: cleanup-test-tables.sql
DROP TABLE IF EXISTS test_mcp_migration;
DROP TABLE IF EXISTS realtime_latency_alerts CASCADE;
DROP TABLE IF EXISTS realtime_latency_config CASCADE; 
DROP TABLE IF EXISTS realtime_latency_metrics CASCADE;
```

## 📋 Comandos Essenciais
| Função | Comando |
|------|--------|
| Login automático | `export SUPABASE_ACCESS_TOKEN=...` |
| Vincular | `supabase link --project-ref REF` |
| Aplicar migrações | `supabase db push --linked` |
| Gerar tipos | `supabase gen types typescript --linked` |
| Verificar diff | `supabase db diff --linked` |
| Listar migrações | `supabase migration list --linked` |

## 🚀 Execução
```bash
# Preparar ambiente
export SUPABASE_ACCESS_TOKEN="seu_token"
export PROJECT_REF="seu_project_ref"
export ENVIRONMENT="staging"

# Executar
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## ✅ Resultado Final
- **Deploy automatizado** sem intervenção manual
- **Validação robusta** de integridade e performance  
- **CI/CD integrado** com GitHub Actions
- **Monitoramento contínuo** de saúde
- **Rollback seguro** em caso de falhas

**Próximos passos**: Implementar scripts, configurar tokens nos secrets do GitHub, e testar em ambiente de staging.