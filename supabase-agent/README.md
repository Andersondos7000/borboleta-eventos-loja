# 🤖 Agente Supabase Deploy

Este agente automatiza o processo de deploy e sincronização entre o ambiente local e o Supabase Cloud, garantindo consistência, validação e monitoramento.

## 🎯 Funcionalidades

- Deploy sem login manual (via `SUPABASE_ACCESS_TOKEN`)
- Vinculação automática via `project-ref`
- Aplicação de migrações com `db push`
- Validação de estado antes/após deploy
- Geração de tipos TypeScript
- Execução de testes e validações
- Monitoramento de performance e integridade

## 🔧 Requisitos

- Supabase CLI instalado
- Token de acesso do Supabase
- Referência do projeto (project-ref)

## 🚀 Como Usar

### Configuração

```bash
# Configurar token de acesso (obrigatório)
export SUPABASE_ACCESS_TOKEN="sbp_your_token_here"

# Configurar referência do projeto (obrigatório)
export PROJECT_REF="seu_project_ref"

# Configurar ambiente (opcional, padrão: staging)
export ENVIRONMENT="staging"

# Configurar modo de simulação (opcional, padrão: false)
export DRY_RUN="false"
```

### Execução

```bash
# Tornar scripts executáveis
chmod +x deploy.sh validate.sh

# Executar deploy
./deploy.sh

# Executar validação avançada
./validate.sh
```

## 📊 Monitoramento

O agente gera relatórios de monitoramento na pasta `reports/`:

- `outliers.txt` - Queries lentas
- `bloat.txt` - Tabelas inchadas
- `vacuum.txt` - Saúde do autovacuum

## 🔄 CI/CD

O agente inclui configuração para GitHub Actions que automatiza:

- Validação em pull requests
- Deploy para staging em push para branch `staging`
- Deploy para produção em push para branch `main`

### Configuração do GitHub Actions

Adicione os seguintes secrets ao seu repositório:

- `SUPABASE_ACCESS_TOKEN` - Token de acesso da API do Supabase
- `SUPABASE_PROJECT_REF_STAGING` - Referência do projeto de staging
- `SUPABASE_PROJECT_REF_PRODUCTION` - Referência do projeto de produção

#### Como configurar os secrets no GitHub

1. Acesse seu repositório no GitHub
2. Vá para **Settings** > **Secrets and variables** > **Actions**
3. Clique em **New repository secret**
4. Adicione cada um dos secrets acima:

   **SUPABASE_ACCESS_TOKEN**
   - Nome: `SUPABASE_ACCESS_TOKEN`
   - Valor: Seu token de acesso do Supabase (obtido em https://supabase.com/dashboard/account/tokens)
   - Permissões necessárias: project:read, project:write, db:write

   **SUPABASE_PROJECT_REF_STAGING**
   - Nome: `SUPABASE_PROJECT_REF_STAGING`
   - Valor: A referência do seu projeto de staging (ex: abcdefghijklm)
   - Pode ser encontrado na URL do dashboard: https://supabase.com/dashboard/project/[project-ref]

   **SUPABASE_PROJECT_REF_PRODUCTION**
   - Nome: `SUPABASE_PROJECT_REF_PRODUCTION`
   - Valor: A referência do seu projeto de produção
   - Pode ser encontrado na URL do dashboard: https://supabase.com/dashboard/project/[project-ref]

5. Clique em **Add secret** para cada um deles

## 📋 Comandos Essenciais

| Função | Comando |
|------|--------|
| Login automático | `export SUPABASE_ACCESS_TOKEN=...` |
| Vincular | `supabase link --project-ref REF` |
| Aplicar migrações | `supabase db push --linked` |
| Gerar tipos | `supabase gen types typescript --linked` |
| Verificar diff | `supabase db diff --linked` |
| Listar migrações | `supabase migration list --linked` |

## ⚙️ Otimizações Recomendadas

- **UUIDv7**: Migrar de `gen_random_uuid()` para `uuid_generate_v7()`
- **Índices compostos**: `orders(customer_id, created_at)`, `tickets(event_id, user_id)`
- **JSONB**: Consolidar endereços em campo único
- **RLS**: Ativar em todas as tabelas principais

## 🔐 Segurança

- Nunca comite o token de acesso
- Utilize variáveis de ambiente para configuração
- Verifique RLS em tabelas críticas
- Monitore foreign keys e constraints