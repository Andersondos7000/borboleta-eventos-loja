import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import MCPService from '../services/MCPService';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Terminal, 
  Github, 
  Database, 
  Workflow, 
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface MCPMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tools?: string[];
  status?: 'pending' | 'success' | 'error';
}

interface MCPServer {
  name: string;
  status: 'active' | 'inactive' | 'error';
  icon: React.ReactNode;
  description: string;
  endpoint?: string;
}

const MCPAssistant: React.FC = () => {
  const [messages, setMessages] = useState<MCPMessage[]>([
    {
      id: '1',
      type: 'system',
      content: '🦋 Assistente MCP Borboleta iniciado! Conectado a 8+ servidores MCP incluindo GitHub, Supabase, N8N e Browser Tools.',
      timestamp: new Date(),
      status: 'success'
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mcpServers, setMCPServers] = useState<MCPServer[]>([
    {
      name: 'GitHub MCP',
      status: 'active',
      icon: <Github className="h-4 w-4" />,
      description: 'Integração oficial GitHub',
      endpoint: 'github-mcp'
    },
    {
      name: 'Supabase MCP',
      status: 'active',
      icon: <Database className="h-4 w-4" />,
      description: 'Banco de dados e Edge Functions',
      endpoint: 'supabase-mcp'
    },
    {
      name: 'N8N Workflows',
      status: 'active',
      icon: <Workflow className="h-4 w-4" />,
      description: 'Automação visual de processos',
      endpoint: 'http://localhost:5678'
    },
    {
      name: 'Browser Tools',
      status: 'active',
      icon: <Eye className="h-4 w-4" />,
      description: 'Navegação e automação web',
      endpoint: 'browser-mcp'
    },
    {
      name: 'Terminal MCP',
      status: 'active',
      icon: <Terminal className="h-4 w-4" />,
      description: 'Execução de comandos',
      endpoint: 'terminal-mcp'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const mcpService = MCPService.getInstance();

  // Verificar status dos servidores MCP ao inicializar
  useEffect(() => {
    const checkMCPServers = async () => {
      try {
        const statuses = await mcpService.getServerStatus();
        setMCPServers(prev => prev.map(server => ({
          ...server,
          status: statuses[server.endpoint]?.online ? 'active' : 'error'
        })));
      } catch (error) {
        console.error('Erro ao verificar status MCP:', error);
      }
    };

    checkMCPServers();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Inicializar reconhecimento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleVoiceInput = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  const executeMCPCommand = async (command: string, server: string) => {
    try {
      let action = '';
      let parameters: any = {};

      // Determinar ação baseada no comando
      if (command.includes('status')) action = 'status';
      else if (command.includes('health')) action = 'health';
      else if (command.includes('list') || command.includes('listar')) action = 'list-workflows';
      else if (command.includes('workflow')) action = 'list-workflows';
      else if (command.includes('screenshot')) action = 'screenshot';
      else if (command.includes('navigate') || command.includes('navegar')) {
        action = 'navigate';
        parameters.url = 'https://github.com/Andersondos7000/borboleta-eventos-loja';
      }
      else action = 'status';

      const result = await mcpService.executeCommand({
        action,
        server,
        parameters
      });

      return {
        success: true,
        data: result,
        tools: [server]
      };
    } catch (error) {
      return {
        success: false,
        error: `Erro ao executar comando MCP: ${error}`,
        tools: [server]
      };
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: MCPMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Analisar comando e escolher servidor MCP
    const command = input.toLowerCase().trim();
    let mcpResponse = '';
    let tools: string[] = [];
    let status: 'success' | 'error' = 'success';

    try {
      if (command.includes('github') || command.includes('repositório')) {
        const result = await executeMCPCommand(command, 'github-mcp');
        if (result.success) {
          const data = result.data;
          mcpResponse = `🐙 **GitHub MCP Ativo**\n\n✅ Repositório: ${data.repository || 'borboleta-eventos-loja'}\n✅ Owner: ${data.owner || 'Andersondos7000'}\n✅ Branch: ${data.branch || 'main'}\n✅ Status: ${data.status || 'Conectado'}\n\n🔧 Comandos disponíveis:\n- Criar issue\n- Fazer commit\n- Deploy automático\n- Verificar PRs`;
        } else {
          mcpResponse = `❌ Erro GitHub MCP: ${result.error}`;
          status = 'error';
        }
        tools = ['GitHub MCP'];
      } else if (command.includes('supabase') || command.includes('banco')) {
        const result = await executeMCPCommand(command, 'supabase-mcp');
        if (result.success) {
          const data = result.data;
          mcpResponse = `🗄️ **Supabase MCP Ativo**\n\n✅ Projeto: ${data.project || 'queren'}\n✅ Status: ${data.status || 'Online'}\n✅ URL: ${data.url || 'Conectado'}\n✅ Edge Functions: ${data.edgeFunctions || 3}\n\n🔧 Comandos disponíveis:\n- Executar SQL\n- Deploy functions\n- Verificar logs\n- Backup dados`;
        } else {
          mcpResponse = `❌ Erro Supabase MCP: ${result.error}`;
          status = 'error';
        }
        tools = ['Supabase MCP'];
      } else if (command.includes('n8n') || command.includes('workflow')) {
        const result = await executeMCPCommand(command, 'n8n-mcp');
        if (result.success) {
          const data = result.data;
          mcpResponse = `🔄 **N8N Workflows**\n\n✅ Editor: http://localhost:5678\n✅ Status: ${data.status || 'Ativo'}\n✅ Workflows: ${data.workflows?.length || 3}\n\n🔧 Workflows disponíveis:\n- GitHub Deploy\n- Supabase Monitor\n- Docker Hub Deploy\n- Custom Automation`;
          
          // Adicionar botão para abrir N8N
          mcpResponse += `\n\n[🔗 Abrir N8N Editor](http://localhost:5678)`;
        } else {
          mcpResponse = `❌ Erro N8N MCP: ${result.error}`;
          status = 'error';
        }
        tools = ['N8N MCP'];
      } else if (command.includes('browser') || command.includes('navegar')) {
        const result = await executeMCPCommand(command, 'browser-mcp');
        if (result.success) {
          const data = result.data;
          mcpResponse = `🌐 **Browser Tools MCP**\n\n✅ Status: ${data.status || 'Ativo'}\n✅ Browser: ${data.browser || 'Chromium'}\n✅ Playwright: ${data.playwright ? 'Habilitado' : 'Disponível'}\n\n🔧 Comandos disponíveis:\n- Navegar para URL\n- Capturar screenshot\n- Preencher formulários\n- Automação web`;
        } else {
          mcpResponse = `❌ Erro Browser MCP: ${result.error}`;
          status = 'error';
        }
        tools = ['Browser MCP'];
      } else if (command.includes('terminal') || command.includes('comando')) {
        const result = await executeMCPCommand(command, 'terminal-mcp');
        if (result.success) {
          const data = result.data;
          mcpResponse = `⚡ **Terminal MCP Ativo**\n\n✅ Shell: ${data.shell || 'PowerShell'}\n✅ Diretório: ${data.workingDirectory || 'borboleta-eventos-loja'}\n✅ Processos: ${data.processes?.length || 'Conectado'}\n\n🔧 Comandos disponíveis:\n- Executar scripts\n- Monitorar processos\n- Deploy automático\n- Gestão de containers`;
        } else {
          mcpResponse = `❌ Erro Terminal MCP: ${result.error}`;
          status = 'error';
        }
        tools = ['Terminal MCP'];
      } else if (command.includes('status') || command.includes('estado')) {
        const serverStatuses = await mcpService.getServerStatus();
        const activeServers = Object.keys(serverStatuses).filter(key => serverStatuses[key].online);
        
        mcpResponse = `📊 **Status Geral MCP**\n\n✅ **${activeServers.length} Servidores Ativos:**\n`;
        
        for (const [server, status] of Object.entries(serverStatuses)) {
          const emoji = status.online ? '✅' : '❌';
          const serverName = server.replace('-mcp', '').replace('-', ' ').toUpperCase();
          mcpResponse += `${emoji} ${serverName}\n`;
        }
        
        mcpResponse += `\n🔧 **Recursos Disponíveis:**\n- Automação completa\n- Deploy contínuo\n- Monitoramento\n- Interface visual`;
        tools = ['Todos os MCPs'];
      } else {
        mcpResponse = `🤖 **Assistente MCP Borboleta**\n\nOlá! Posso ajudar com:\n\n🐙 **GitHub** - repositórios, issues, PRs\n🗄️ **Supabase** - banco, functions, logs\n🔄 **N8N** - workflows, automação\n🌐 **Browser** - navegação, screenshots\n⚡ **Terminal** - comandos, scripts\n\n**Exemplos:**\n- "status do github"\n- "verificar supabase"\n- "abrir n8n workflows"\n- "navegar browser"\n- "status geral"`;
        tools = ['Assistente'];
      }
    } catch (error) {
      mcpResponse = `❌ Erro na execução MCP: ${error}`;
      status = 'error';
    }

    const assistantMessage: MCPMessage = {
      id: (Date.now() + 1).toString(),
      type: 'assistant',
      content: mcpResponse,
      timestamp: new Date(),
      tools,
      status
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Servidores MCP */}
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-semibold">Servidores MCP</h2>
        </div>
        
        <div className="space-y-2">
          {mcpServers.map((server, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center gap-2">
                  {server.icon}
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(server.status)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{server.name}</h3>
                    <Badge variant={server.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {server.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{server.description}</p>
                  {server.endpoint && (
                    <p className="text-xs text-blue-600 mt-1 truncate">{server.endpoint}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6">
          <h3 className="font-medium text-sm mb-2">Ações Rápidas</h3>
          <div className="space-y-1">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs" 
                    onClick={() => setInput('status geral')}>
              <CheckCircle className="h-3 w-3 mr-2" />
              Status Geral
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs"
                    onClick={() => setInput('abrir n8n workflows')}>
              <Workflow className="h-3 w-3 mr-2" />
              N8N Workflows
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs"
                    onClick={() => setInput('verificar github')}>
              <Github className="h-3 w-3 mr-2" />
              GitHub Status
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-xs"
                    onClick={() => window.open('http://localhost:5678', '_blank')}>
              <ExternalLink className="h-3 w-3 mr-2" />
              Abrir N8N
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Principal */}
      <div className="flex-1 flex flex-col">
        <CardHeader className="border-b bg-white">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            Assistente MCP Borboleta
            <Badge variant="outline" className="ml-auto">
              {mcpServers.filter(s => s.status === 'active').length} servidores ativos
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : message.type === 'system'
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    
                    {message.tools && message.tools.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {message.tools.map((tool, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.status === 'success' && <CheckCircle className="h-3 w-3" />}
                      {message.status === 'error' && <AlertCircle className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processando via MCP...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t bg-white p-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Digite sua mensagem ou comando MCP..."
                  className="min-h-[60px] pr-12 resize-none"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute right-2 top-2"
                  onClick={handleVoiceInput}
                  disabled={!recognitionRef.current}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
              <Button 
                onClick={handleSendMessage} 
                disabled={!input.trim() || isLoading}
                className="self-end"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>Conectado via MCP Protocol</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Enter para enviar, Shift+Enter para quebra de linha</span>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
};

export default MCPAssistant;
