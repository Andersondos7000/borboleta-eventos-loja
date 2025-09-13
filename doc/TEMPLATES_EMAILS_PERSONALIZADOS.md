# 📧 Templates de Emails Personalizados - Borboleta Eventos

## 🎯 Visão Geral

Este documento apresenta todos os **templates personalizados de email** criados para o projeto Borboleta Eventos, incluindo diferentes versões e estilos para diversos tipos de comunicação.

---

## 📋 Templates Disponíveis

### 1. 🦋 **Template de Confirmação de Cadastro - Versão Completa**

**Arquivo:** `PERSONALIZACAO_EMAILS_SUPABASE.md` (linhas 95-150)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Confirme seu cadastro - Borboleta Eventos</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .button { 
            display: inline-block; 
            background: #8B5CF6; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
        }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🦋 Borboleta Eventos</h1>
        </div>
        
        <div class="content">
            <h2>Bem-vindo(a)! 🎉</h2>
            
            <p>Obrigado por se cadastrar na <strong>Borboleta Eventos</strong>!</p>
            
            <p>Para ativar sua conta e começar a comprar ingressos e produtos incríveis, clique no botão abaixo:</p>
            
            <div style="text-align: center;">
                <a href="{{ .ConfirmationURL }}" class="button">
                    ✅ Confirmar Cadastro
                </a>
            </div>
            
            <p><small>Ou copie e cole este link no seu navegador:<br>
            <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></small></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            
            <p><strong>🎫 O que você pode fazer:</strong></p>
            <ul>
                <li>Comprar ingressos para eventos exclusivos</li>
                <li>Adquirir produtos da nossa loja</li>
                <li>Receber ofertas especiais</li>
                <li>Acompanhar seus pedidos</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>Este email foi enviado por <strong>Borboleta Eventos</strong></p>
            <p>Se você não se cadastrou, pode ignorar este email.</p>
            <p>© 2025 Borboleta Eventos - Todos os direitos reservados</p>
        </div>
    </div>
</body>
</html>
```

**Características:**
- ✅ Design responsivo
- ✅ Cores da marca (#8B5CF6)
- ✅ Botão de call-to-action destacado
- ✅ Lista de benefícios
- ✅ Footer com informações legais

---

### 2. 🎨 **Template de Confirmação - Versão Moderna (Gradiente)**

**Arquivo:** `mcp-smtp-config.js` (linhas 140-170)

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🦋 Borboleta Eventos</h1>
  </div>
  
  <div style="padding: 40px 30px; background: white;">
    <h2 style="color: #374151; margin-bottom: 20px;">Bem-vindo(a)!</h2>
    
    <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
      Obrigado por se cadastrar na Borboleta Eventos! Para completar seu cadastro, 
      clique no botão abaixo para confirmar seu email.
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="{{ .ConfirmationURL }}" 
         style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
        ✅ Confirmar Email
      </a>
    </div>
    
    <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
      Se você não se cadastrou, pode ignorar este email.
    </p>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 12px; margin: 0;">
      © 2024 Borboleta Eventos - Todos os direitos reservados
    </p>
  </div>
</div>
```

**Características:**
- ✅ Header com gradiente moderno
- ✅ Tipografia otimizada (Tailwind colors)
- ✅ Design minimalista
- ✅ Botão com bordas arredondadas
- ✅ Footer discreto

---

### 3. ⚡ **Template para Edge Function - Versão Dinâmica**

**Arquivo:** `PERSONALIZACAO_EMAILS_SUPABASE.md` (linhas 180-200)

```typescript
// supabase/functions/custom-auth-emails/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

serve(async (req) => {
  const { type, user, email_data } = await req.json()
  
  if (type === 'signup') {
    const { error } = await resend.emails.send({
      from: 'Borboleta Eventos <noreply@borboletaeventos.com.br>',
      to: user.email,
      subject: '🦋 Confirme seu cadastro na Borboleta Eventos',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h1>🦋 Bem-vindo à Borboleta Eventos!</h1>
          <p>Clique no link para confirmar:</p>
          <a href="${email_data.confirmation_url}" 
             style="background: #8B5CF6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Confirmar Cadastro
          </a>
        </div>
      `
    })
    
    if (error) {
      return new Response(JSON.stringify({ error }), { status: 400 })
    }
  }
  
  return new Response(JSON.stringify({ success: true }))
})
```

**Características:**
- ✅ Controle total via Edge Function
- ✅ Integração com Resend
- ✅ Template dinâmico em JavaScript
- ✅ Tratamento de erros
- ✅ Resposta JSON estruturada

---

### 4. 🔧 **Template via Management API - Versão Programática**

**Arquivo:** `MCP_SUPABASE_LIMITACOES_EMAILS.md` (linhas 70-85)

```bash
# Configurar template via API
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_subjects_confirmation": "Confirme seu cadastro - Borboleta Eventos",
    "mailer_templates_confirmation_content": "<h2>Bem-vindo à Borboleta Eventos!</h2><p>Clique no link para confirmar:</p><p><a href=\"{{ .ConfirmationURL }}\">Confirmar Email</a></p>",
    "mailer_sender_name": "Borboleta Eventos"
  }'
```

**Características:**
- ✅ Configuração via API REST
- ✅ Template inline (sem CSS externo)
- ✅ Variáveis Supabase nativas
- ✅ Automação via scripts
- ✅ Versionamento via código

---

## 🎯 Variáveis Disponíveis

### Variáveis Supabase Nativas

| Variável | Descrição | Exemplo |
|----------|-----------|----------|
| `{{ .ConfirmationURL }}` | Link completo de confirmação | `https://app.com/confirm?token=abc123` |
| `{{ .Token }}` | Token de confirmação | `abc123def456` |
| `{{ .TokenHash }}` | Hash do token | `sha256:xyz789` |
| `{{ .SiteURL }}` | URL base do site | `https://borboletaeventos.com.br` |
| `{{ .Email }}` | Email do usuário | `usuario@email.com` |

### Variáveis Customizadas (Edge Functions)

```javascript
// Variáveis adicionais disponíveis em Edge Functions
const customData = {
  user_name: user.user_metadata?.username || 'Usuário',
  signup_date: new Date().toLocaleDateString('pt-BR'),
  welcome_bonus: '10% OFF',
  next_event: 'Festival de Verão 2025'
}
```

---

## 🎨 Paleta de Cores

### Cores Principais
```css
/* Roxo principal */
#8B5CF6  /* Usado no template completo */
#6366f1  /* Usado no template moderno */
#8b5cf6  /* Gradiente final */

/* Cores de texto */
#374151  /* Títulos */
#6b7280  /* Texto principal */
#9ca3af  /* Texto secundário */

/* Cores de fundo */
#f5f5f5  /* Fundo geral */
#f9fafb  /* Footer */
#ffffff  /* Conteúdo */
```

---

## 📱 Responsividade

### Media Queries Recomendadas
```css
@media only screen and (max-width: 600px) {
  .container {
    width: 100% !important;
    padding: 0 !important;
  }
  
  .content {
    padding: 20px !important;
  }
  
  .button {
    display: block !important;
    width: 100% !important;
    text-align: center !important;
  }
}
```

---

## 🚀 Como Implementar

### 1. **Via Dashboard (Mais Fácil)**
1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Projeto: **boboleta** (ojxmfxbflbfinodkhixk)
3. Settings → Authentication → Email Templates
4. Cole o HTML do template desejado

### 2. **Via Script Automatizado**
```bash
# Usar o script criado
node scripts/mcp-smtp-config.js

# Ou PowerShell
.\scripts\configure-smtp-supabase.ps1
```

### 3. **Via Management API**
```bash
# Configurar via curl
export SUPABASE_ACCESS_TOKEN="seu_token"
export PROJECT_REF="ojxmfxbflbfinodkhixk"

# Executar comando curl do template escolhido
```

### 4. **Via Edge Function**
```bash
# Deploy da função personalizada
supabase functions deploy custom-auth-emails

# Configurar webhook no Dashboard
# Auth → Settings → Auth Hooks
```

---

## 📊 Comparação de Templates

| Template | Complexidade | Personalização | Manutenção | Recomendado Para |
|----------|--------------|----------------|------------|------------------|
| **Completo** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Produção |
| **Moderno** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Startups |
| **Edge Function** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Empresas |
| **API** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Automação |

---

## 🧪 Testes

### Checklist de Validação
- [ ] **Renderização**: Testar em Gmail, Outlook, Apple Mail
- [ ] **Responsividade**: Verificar em mobile e desktop
- [ ] **Links**: Confirmar que `{{ .ConfirmationURL }}` funciona
- [ ] **Variáveis**: Validar substituição de todas as variáveis
- [ ] **Deliverability**: Verificar se não vai para spam
- [ ] **Acessibilidade**: Contraste e leitores de tela

### Ferramentas de Teste
- [Litmus](https://litmus.com) - Teste em múltiplos clientes
- [Email on Acid](https://emailonacid.com) - Validação completa
- [Mail Tester](https://mail-tester.com) - Score de spam

---

## 📋 Próximos Passos

### ✅ Implementação Imediata
1. Escolher template (recomendo o **Moderno**)
2. Configurar SMTP no Dashboard
3. Testar com email real
4. Validar em diferentes clientes

### 🔮 Melhorias Futuras
1. **A/B Testing** de templates
2. **Personalização dinâmica** baseada no usuário
3. **Templates para outros tipos** (reset password, welcome)
4. **Integração com analytics** (tracking de abertura)
5. **Templates sazonais** (Natal, Black Friday)

---

## 📞 Suporte

**Documentação Relacionada:**
- <mcfile name="PERSONALIZACAO_EMAILS_SUPABASE.md" path="k:\Protegido\queren _Backup\doc\PERSONALIZACAO_EMAILS_SUPABASE.md"></mcfile>
- <mcfile name="MCP_SUPABASE_LIMITACOES_EMAILS.md" path="k:\Protegido\queren _Backup\doc\MCP_SUPABASE_LIMITACOES_EMAILS.md"></mcfile>
- <mcfile name="mcp-smtp-config.js" path="k:\Protegido\queren _Backup\scripts\mcp-smtp-config.js"></mcfile>

**Links Úteis:**
- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Edge Functions for Auth](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend)

---

*📝 Documento criado em Janeiro 2025 para o projeto Borboleta Eventos*  
*🔄 Última atualização: Janeiro 2025*