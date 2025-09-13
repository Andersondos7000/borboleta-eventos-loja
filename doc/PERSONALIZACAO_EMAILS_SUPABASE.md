# 📧 Personalização de Emails no Supabase

## 🎯 Resumo Executivo

**SIM, é possível personalizar completamente os emails de confirmação do Supabase!** <mcreference link="https://supabase.com/docs/guides/auth/auth-email-templates" index="1">1</mcreference>

Você pode:
- ✅ **Alterar o nome do remetente** (sair de "Supabase Auth")
- ✅ **Personalizar templates HTML** dos emails
- ✅ **Usar seu próprio servidor SMTP**
- ✅ **Configurar domínio personalizado**
- ✅ **Customizar assunto e conteúdo**

---

## 🔧 Configuração SMTP Personalizada

### 1. Acessar Configurações do Projeto

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Selecione seu projeto: **boboleta** (ojxmfxbflbfinodkhixk)
3. Vá em **Settings** → **Authentication**
4. Role até **SMTP Settings**

### 2. Habilitar SMTP Customizado

<mcreference link="https://sendlayer.com/blog/supabase-custom-smtp-and-email-configuration-guide/" index="5">5</mcreference>

```bash
# No Dashboard do Supabase:
# 1. Toggle "Enable Custom SMTP" = ON
# 2. Configurar:
```

**Configurações Recomendadas:**

| Campo | Valor Sugerido |
|-------|----------------|
| **Sender Name** | `Borboleta Eventos` |
| **Sender Email** | `noreply@borboletaeventos.com.br` |
| **Host** | `smtp.gmail.com` (Gmail) ou seu provedor |
| **Port** | `587` (TLS) ou `465` (SSL) |
| **Username** | Seu email completo |
| **Password** | Senha de app ou senha normal |

### 3. Provedores SMTP Recomendados

#### 🥇 **Gmail (Gratuito até 500/dia)**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-de-app
```

#### 🥈 **SendGrid (Gratuito até 100/dia)**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=sua-api-key-sendgrid
```

#### 🥉 **Resend (Moderno, 3000/mês grátis)**
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=sua-api-key-resend
```

---

## 🎨 Personalização de Templates

### 1. Acessar Templates de Email

<mcreference link="https://supabase.com/docs/guides/auth/auth-email-templates" index="1">1</mcreference>

1. **Settings** → **Authentication** → **Email Templates**
2. Você pode editar 5 tipos de email:

| Template | Quando é Enviado |
|----------|------------------|
| **Confirm Signup** | Confirmação de cadastro |
| **Invite User** | Convite de usuário |
| **Magic Link** | Login sem senha |
| **Change Email** | Alteração de email |
| **Reset Password** | Recuperação de senha |

### 2. Template Personalizado - Confirmação de Cadastro

<mcreference link="https://supabase.com/docs/guides/local-development/customizing-email-templates" index="2">2</mcreference>

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

### 3. Variáveis Disponíveis nos Templates

<mcreference link="https://supabase.com/docs/guides/local-development/customizing-email-templates" index="2">2</mcreference>

| Variável | Descrição |
|----------|----------|
| `{{ .ConfirmationURL }}` | Link de confirmação completo |
| `{{ .Token }}` | Token de confirmação (para OTP) |
| `{{ .TokenHash }}` | Hash do token |
| `{{ .SiteURL }}` | URL do seu site |
| `{{ .Email }}` | Email do usuário |

---

## 🚀 Implementação com Edge Functions

### Para Controle Total dos Emails

<mcreference link="https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend" index="4">4</mcreference>

Crie uma Edge Function para interceptar e personalizar completamente:

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

---

## 📋 Checklist de Implementação

### ✅ Configuração Básica (5 minutos)
- [ ] Acessar Dashboard → Settings → Authentication
- [ ] Habilitar "Enable Custom SMTP"
- [ ] Configurar nome: `Borboleta Eventos`
- [ ] Configurar email: `noreply@borboletaeventos.com.br`
- [ ] Testar envio

### ✅ Personalização Avançada (30 minutos)
- [ ] Editar template "Confirm Signup"
- [ ] Personalizar HTML com cores da marca
- [ ] Adicionar logo da empresa
- [ ] Configurar variáveis dinâmicas
- [ ] Testar em diferentes clientes de email

### ✅ Configuração de Domínio (Opcional)
- [ ] Configurar SPF record
- [ ] Configurar DKIM
- [ ] Configurar DMARC
- [ ] Validar deliverability

---

## 🔧 Configuração no Projeto Atual

### 1. Atualizar Configuração Local

```toml
# supabase/config.toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true  # ← Alterar para true
max_frequency = 3600

# Adicionar configurações SMTP
[auth.external.smtp]
enabled = true
host = "smtp.gmail.com"
port = 587
user = "seu-email@gmail.com"
pass = "env(SMTP_PASSWORD)"
sender_name = "Borboleta Eventos"
```

### 2. Variáveis de Ambiente

```bash
# .env.local
SMTP_PASSWORD=sua-senha-de-app-gmail
SUPABASE_SMTP_HOST=smtp.gmail.com
SUPABASE_SMTP_PORT=587
```

### 3. Testar Configuração

```bash
# Testar localmente
supabase start
supabase functions serve

# Deploy para produção
supabase db push --linked
supabase functions deploy
```

---

## 📊 Monitoramento e Analytics

### Métricas Importantes
- **Taxa de entrega** (delivery rate)
- **Taxa de abertura** (open rate)
- **Taxa de clique** (click rate)
- **Bounces** e **spam complaints**

### Ferramentas Recomendadas
- **Supabase Dashboard** - Logs básicos
- **SendGrid Analytics** - Métricas detalhadas
- **Google Analytics** - Tracking de conversão

---

## 🎯 Resultado Final

Após a implementação, seus usuários receberão:

✅ **Emails com sua marca** ("Borboleta Eventos" ao invés de "Supabase Auth")  
✅ **Design personalizado** com cores e logo da empresa  
✅ **Conteúdo relevante** focado no seu negócio  
✅ **Melhor deliverability** com SMTP dedicado  
✅ **Experiência profissional** desde o primeiro contato  

---

## 📞 Próximos Passos

1. **Imediato**: Configurar SMTP customizado no Dashboard
2. **Esta semana**: Personalizar templates de email
3. **Próximo mês**: Implementar Edge Functions para controle total
4. **Futuro**: Configurar domínio próprio e analytics avançados

---

**💡 Dica Pro**: Comece com a configuração básica no Dashboard (5 minutos) e evolua gradualmente para soluções mais avançadas conforme a necessidade!

**🔗 Links Úteis:**
- [Documentação Oficial - Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Configuração SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Edge Functions para Emails](https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend)

---

*📝 Documento criado em $(date) para o projeto Borboleta Eventos*  
*🔄 Última atualização: Janeiro 2025*