# GitHub Actions Workflows

## Deploy to Supabase

Este workflow automatiza o deploy das Edge Functions para o Supabase.

### Triggers:
- **Push**: Automático quando há mudanças em `supabase/functions/**`
- **Manual**: Via GitHub Actions UI com opção de especificar função

### Secrets Necessários:
- `SUPABASE_ACCESS_TOKEN`: Token de acesso do Supabase
- `SUPABASE_PROJECT_ID`: ID do projeto Supabase (pxcvoiffnandpdyotped)

### Como usar manualmente:
1. Vá para Actions tab no GitHub
2. Selecione "Deploy to Supabase"
3. Clique em "Run workflow"
4. Opcionalmente especifique uma função específica

### Logs:
O workflow mostra logs detalhados do processo de deploy.

### Status Atual:
- ✅ Workflow criado
- ✅ **Deploy via MCP GitHub realizado**
- ✅ **Código da Edge Function atualizado**
- ✅ **Problema do AbacatePay corrigido**
- ⏳ Aguardando configuração de secrets para automação futura
