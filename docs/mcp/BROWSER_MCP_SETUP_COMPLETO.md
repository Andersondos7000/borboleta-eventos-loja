# Browser MCP - Instalação Completa

## ✅ Status da Instalação

### Componentes Instalados
- ✅ **@agentdeskai/browser-tools-mcp@latest** - Servidor MCP instalado
- ✅ **@agentdeskai/browser-tools-server@latest** - Servidor Node.js middleware instalado
- ✅ **Configuração no mcp-config.json** - Browser MCP configurado
- ✅ **Browser Tools Server** - Rodando na porta 3026 dentro do container

### Componentes Pendentes
- ⏳ **Extensão do Chrome** - Precisa ser instalada manualmente

## 🔧 Configuração Atual

### mcp-config.json
```json
"browser": {
  "command": "npx",
  "args": ["@agentdeskai/browser-tools-mcp@latest"],
  "description": "Browser monitoring and interaction tool via MCP - AgentDeskAI",
  "env": {
    "BROWSER_WS_ENDPOINT": "ws://localhost:9222"
  }
}
```

### Serviços Ativos
- **Browser Tools Server**: `http://localhost:3026` (dentro do container)
- **MCP Server**: Conectado e funcionando
- **Auto-discovery**: Funcionando corretamente

## 📥 Próximos Passos

### 1. Instalar Extensão do Chrome

**Download da Extensão:**
- 🔗 **Link oficial**: [v1.2.0 BrowserToolsMCP Chrome Extension](https://github.com/AgentDeskAI/browser-tools-mcp/releases/latest)
- 📁 Baixe o arquivo ZIP da extensão
- 📂 Extraia o conteúdo em uma pasta

**Instalação no Chrome:**
1. Abra o Chrome
2. Vá para `chrome://extensions/`
3. Ative o "Modo do desenvolvedor" (canto superior direito)
4. Clique em "Carregar sem compactação"
5. Selecione a pasta extraída da extensão
6. A extensão será instalada

### 2. Configurar a Extensão

1. **Abrir DevTools**: Pressione `F12` ou `Ctrl+Shift+I`
2. **Localizar painel**: Procure pela aba "BrowserToolsMCP" no DevTools
3. **Verificar conexão**: A extensão deve se conectar automaticamente ao servidor

### 3. Funcionalidades Disponíveis

#### 🔍 Monitoramento
- **Console Logs**: Captura logs do console do navegador
- **Network Traffic**: Monitora requisições HTTP/XHR
- **DOM Elements**: Analisa elementos selecionados
- **Screenshots**: Captura telas automaticamente

#### 🛠️ Ferramentas de Auditoria
- **Accessibility Audit**: Verifica conformidade WCAG
- **Performance Audit**: Identifica gargalos de performance
- **SEO Audit**: Avalia fatores de otimização
- **Best Practices**: Verifica boas práticas de desenvolvimento
- **NextJS Audit**: Análise específica para NextJS

#### 🎯 Modos Especiais
- **Audit Mode**: Executa todas as auditorias em sequência
- **Debugger Mode**: Executa todas as ferramentas de debug

### 4. Comandos de Exemplo

Após a instalação completa, você pode usar comandos como:

```
"Tire um screenshot desta página"
"Execute uma auditoria de acessibilidade"
"Verifique os logs do console"
"Analise a performance desta página"
"Execute o modo de auditoria completa"
"Capture o tráfego de rede"
```

## 🔧 Troubleshooting

### Problemas Comuns

1. **Extensão não aparece no DevTools**
   - Verifique se a extensão está ativada em `chrome://extensions/`
   - Recarregue a página e abra o DevTools novamente

2. **Servidor não conecta**
   - Verifique se o browser-tools-server está rodando
   - Confirme que a porta 3026 está acessível

3. **MCP não responde**
   - Reinicie o container Docker
   - Verifique os logs do servidor

### Comandos de Verificação

```bash
# Verificar se o servidor está rodando
docker exec queren-app-1 ps aux | grep browser

# Testar conexão do MCP
docker exec queren-app-1 npx @agentdeskai/browser-tools-mcp@latest --help

# Verificar porta do servidor
docker exec queren-app-1 netstat -tlnp | grep 3026
```

## 📚 Documentação Adicional

- **GitHub**: https://github.com/AgentDeskAI/browser-tools-mcp
- **Documentação**: https://browsertools.agentdesk.ai/
- **Releases**: https://github.com/AgentDeskAI/browser-tools-mcp/releases

## 🎉 Benefícios

Com o Browser MCP instalado, você terá:

- **Debugging Avançado**: Análise em tempo real do comportamento do navegador
- **Auditorias Automatizadas**: Verificações de acessibilidade, performance e SEO
- **Integração com IA**: Capacidades de browser diretamente no seu IDE
- **Privacidade**: Todos os dados ficam localmente, nada é enviado para terceiros
- **Produtividade**: Análise e debugging sem sair do ambiente de desenvolvimento

---

**Status**: Browser MCP instalado e configurado ✅  
**Próximo passo**: Instalar extensão do Chrome para funcionalidade completa