# 🔍 Sistema de Monitoramento de Duplicatas

Este sistema monitora automaticamente a base de dados em busca de possíveis duplicatas e comportamentos suspeitos, gerando relatórios e alertas para manutenção preventiva.

## 📁 Estrutura dos Arquivos

```
monitoring/
├── monitor-duplicatas.js    # Script principal de monitoramento
├── setup-alerts.js         # Configuração de alertas automáticos
├── README.md               # Esta documentação
├── reports/                # Relatórios gerados automaticamente
└── alerts.log             # Log de alertas
```

## 🚀 Como Usar

### 1. Execução Manual

```bash
# Executar monitoramento básico
node monitoring/monitor-duplicatas.js

# Executar com sistema de alertas
node monitoring/setup-alerts.js

# Testar sistema de alertas
node monitoring/setup-alerts.js --test

# Configurar agendamento automático
node monitoring/setup-alerts.js --setup
```

### 2. Configuração de Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
# Configurações obrigatórias (já existentes)
VITE_SUPABASE_URL=sua_url_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# Configurações opcionais para alertas
ALERT_EMAIL=admin@seudominio.com
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/...
```

## 📊 Funcionalidades

### 🔍 Detecção de Duplicatas

O sistema analisa:
- **Pedidos com mesmo email e valor** em períodos próximos
- **Intervalos de tempo suspeitos** entre pedidos
- **Padrões de comportamento anômalos**

### 👤 Análise de Comportamento

Monitora:
- **Alta frequência de pedidos** do mesmo usuário
- **Pedidos em sucessão rápida** (< 1 minuto)
- **Volumes anômalos** de transações

### 🚨 Sistema de Alertas

Gera alertas para:
- **Mais de 5 grupos** de possíveis duplicatas
- **Usuários com comportamento suspeito**
- **Pedidos em sucessão muito rápida**

## ⚙️ Configurações

### Parâmetros de Monitoramento

```javascript
const MONITORING_CONFIG = {
  ANALYSIS_PERIOD_HOURS: 24,           // Período de análise
  DUPLICATE_THRESHOLD_MINUTES: 5,     // Limite para considerar duplicata
  ALERT_THRESHOLDS: {
    SUSPICIOUS_DUPLICATES: 5,          // Limite de duplicatas suspeitas
    HIGH_FREQUENCY_USER: 10,           // Limite de pedidos por usuário
    RAPID_SUCCESSION: 3                // Limite de pedidos rápidos
  }
};
```

### Níveis de Severidade

- **🔴 HIGH**: Requer ação imediata
- **🟡 MEDIUM**: Monitoramento necessário
- **🟢 LOW**: Informativo

## 📅 Agendamento Automático

### Windows (Task Scheduler)

1. Execute: `node monitoring/setup-alerts.js --setup`
2. Como administrador: `schtasks /create /tn "Monitoramento Duplicatas" /xml "monitoring/duplicates-monitor-task.xml"`

### Linux/Mac (Cron)

1. Execute: `node monitoring/setup-alerts.js --setup`
2. Adicione ao cron: `crontab -e`
3. Insira a linha gerada em `monitoring/crontab-entry.txt`

## 📈 Relatórios

### Estrutura do Relatório

```json
{
  "timestamp": "2024-01-01T09:00:00.000Z",
  "period": "24 horas",
  "summary": {
    "totalOrders": 150,
    "suspiciousDuplicates": 2,
    "totalUsers": 120,
    "suspiciousUsers": 1
  },
  "alerts": [
    {
      "type": "RAPID_SUCCESSION_ORDERS",
      "severity": "HIGH",
      "message": "1 usuário fez pedidos em sucessão muito rápida"
    }
  ],
  "details": {
    "duplicatesAnalysis": { /* ... */ },
    "behaviorAnalysis": { /* ... */ }
  }
}
```

### Localização dos Relatórios

- **Arquivo**: `monitoring/reports/duplicates-report-YYYY-MM-DDTHH-mm-ss.json`
- **Formato**: JSON estruturado
- **Retenção**: Manual (recomendado: 30 dias)

## 🔧 Integração com Notificações

### Email

Configure seu provedor de email preferido:

```javascript
// Exemplo com Nodemailer
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

### Webhook (Slack/Discord)

```javascript
// Configurar webhook URL
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/SEU_WEBHOOK_URL_AQUI
```

## 🛠️ Manutenção

### Limpeza de Relatórios

```bash
# Remover relatórios antigos (> 30 dias)
find monitoring/reports -name "*.json" -mtime +30 -delete
```

### Verificação de Logs

```bash
# Ver últimos alertas
tail -f monitoring/alerts.log

# Contar alertas por tipo
grep "HIGH" monitoring/alerts.log | wc -l
```

## 🔍 Troubleshooting

### Problemas Comuns

1. **Erro de permissão no Supabase**
   - Verificar `SUPABASE_SERVICE_ROLE_KEY`
   - Confirmar permissões RLS

2. **Relatórios não são gerados**
   - Verificar diretório `monitoring/reports`
   - Confirmar variáveis de ambiente

3. **Alertas não funcionam**
   - Testar com `--test`
   - Verificar configurações de email/webhook

### Debug

```bash
# Executar com debug
DEBUG=* node monitoring/monitor-duplicatas.js

# Verificar configurações
node -e "console.log(process.env.VITE_SUPABASE_URL)"
```

## 📋 Checklist de Implementação

- [ ] ✅ Scripts de monitoramento criados
- [ ] ✅ Sistema de alertas configurado
- [ ] ⏳ Agendamento automático configurado
- [ ] ⏳ Notificações por email/webhook configuradas
- [ ] ⏳ Processo de limpeza de relatórios definido

## 🔄 Próximos Passos

1. **Configurar agendamento automático**
2. **Implementar notificações**
3. **Definir processo de limpeza**
4. **Treinar equipe no uso dos relatórios**

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs em `monitoring/alerts.log`
2. Executar teste: `node monitoring/setup-alerts.js --test`
3. Consultar documentação do Supabase MCP

---

**Última atualização**: Janeiro 2024  
**Versão**: 1.0.0