# 🚫 Limitações do MCP Supabase para Configuração de Emails

## ❌ Resposta Direta: **NÃO via MCP atual**

O **MCP do Supabase disponível no Trae AI** atualmente **NÃO possui ferramentas específicas** para:
- ❌ Configurar SMTP personalizado
- ❌ Editar templates de email
- ❌ Alterar nome do remetente
- ❌ Gerenciar configurações de autenticação por email

## 🔍 Ferramentas MCP Supabase Disponíveis

Segundo a documentação do projeto, o MCP atual oferece:

### ✅ Ferramentas Disponíveis
- `list_organizations` - Listar organizações
- `get_organization` - Detalhes da organização  
- `list_projects` - Listar projetos
- `get_project` - Detalhes do projeto
- `create_project` - Criar projeto
- `list_tables` - Listar tabelas
- `execute_sql` - Executar SQL
- `apply_migration` - Aplicar migrações
- `deploy_edge_function` - Deploy de Edge Functions

### ❌ Ferramentas NÃO Disponíveis
- `configure_smtp` - **Não existe**
- `update_email_templates` - **Não existe**
- `set_auth_settings` - **Não existe**
- `manage_email_config` - **Não existe**

---

## 🛠️ Alternativas Disponíveis

### 1. 🌐 **Via Dashboard Web do Supabase**

**✅ Método Recomendado e Mais Simples:**

1. Acesse: https://supabase.com/dashboard/project/ojxmfxbflbfinodkhixk
2. **Settings** → **Authentication** → **SMTP Settings**
3. Toggle "Enable Custom SMTP" = ON
4. Configure:
   ```
   Sender Name: Borboleta Eventos
   Sender Email: noreply@borboletaeventos.com.br
   Host: smtp.gmail.com
   Port: 587
   Username: seu-email@gmail.com
   Password: sua-senha-de-app
   ```

### 2. 🔧 **Via Management API do Supabase**

**Usando curl ou scripts:**

```bash
# Configurar SMTP via API
export SUPABASE_ACCESS_TOKEN="seu-token"
export PROJECT_REF="ojxmfxbflbfinodkhixk"

curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_email_enabled": true,
    "smtp_admin_email": "noreply@borboletaeventos.com.br",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "seu-email@gmail.com",
    "smtp_pass": "sua-senha-de-app",
    "smtp_sender_name": "Borboleta Eventos"
  }'
```

### 3. 🎨 **Templates de Email via API**

```bash
# Atualizar templates via API
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_subjects_confirmation": "Confirme seu cadastro - Borboleta Eventos",
    "mailer_templates_confirmation_content": "<h2>Bem-vindo à Borboleta Eventos!</h2><p>Clique no link para confirmar:</p><p><a href=\"{{ .ConfirmationURL }}\">Confirmar Email</a></p>",
    "mailer_sender_name": "Borboleta Eventos"
  }'
```

### 4. ⚡ **Edge Functions para Controle Total**

**Criar função personalizada:**

```typescript
// supabase/functions/custom-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { type, user, email_data } = await req.json()
  
  // Lógica personalizada de email
  const customEmail = {
    to: user.email,
    from: 'Borboleta Eventos <noreply@borboletaeventos.com.br>',
    subject: 'Confirme seu cadastro - Borboleta Eventos',
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #6366f1;">Bem-vindo à Borboleta Eventos! 🦋</h2>
        <p>Clique no botão abaixo para confirmar seu email:</p>
        <a href="${email_data.confirmation_url}" 
           style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Confirmar Email
        </a>
      </div>
    `
  }
  
  // Enviar via provedor SMTP
  // ...
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## 🎯 Recomendação Imediata

### Para o Projeto Borboleta:

**1. 🚀 Ação Imediata (5 minutos):**
- Acesse o Dashboard do Supabase
- Configure SMTP via interface web
- Teste com um email de confirmação

**2. 🎨 Personalização (15 minutos):**
- Edite templates na seção "Email Templates"
- Customize assunto e conteúdo HTML
- Adicione logo e cores da marca

**3. 🔧 Automação Futura:**
- Considere criar Edge Function para controle total
- Implemente tracking de emails
- Configure domínio personalizado

---

## 📋 Checklist de Implementação

### ✅ Via Dashboard (Recomendado)
- [ ] Acessar projeto ojxmfxbflbfinodkhixk
- [ ] Habilitar SMTP customizado
- [ ] Configurar Gmail/SendGrid
- [ ] Alterar nome remetente para "Borboleta Eventos"
- [ ] Personalizar template de confirmação
- [ ] Testar com email real

### 🔧 Via API (Avançado)
- [ ] Obter SUPABASE_ACCESS_TOKEN
- [ ] Configurar SMTP via curl
- [ ] Atualizar templates via API
- [ ] Validar configurações

### ⚡ Via Edge Functions (Controle Total)
- [ ] Criar função custom-email
- [ ] Implementar lógica personalizada
- [ ] Deploy da função
- [ ] Configurar webhook de auth

---

## 🚨 Limitação Atual do MCP

**O MCP do Supabase no Trae AI é focado em:**
- ✅ Gerenciamento de banco de dados
- ✅ Deploy de Edge Functions
- ✅ Execução de SQL
- ✅ Migrações

**Mas NÃO inclui:**
- ❌ Configurações de autenticação
- ❌ Gerenciamento de SMTP
- ❌ Templates de email
- ❌ Configurações de projeto avançadas

---

## 💡 Conclusão

**Para personalizar emails do Supabase:**

1. **🎯 Melhor opção:** Dashboard web (mais rápido)
2. **🔧 Opção técnica:** Management API
3. **⚡ Opção avançada:** Edge Functions
4. **❌ NÃO disponível:** Via MCP atual

**O MCP pode ser usado para deploy das Edge Functions personalizadas, mas a configuração inicial deve ser feita via Dashboard ou API.**