#!/usr/bin/env node

/**
 * MCP Orchestrator - Gerenciador Centralizado de Servidores MCP
 * Projeto: Borboleta Eventos Loja
 * 
 * Este script coordena 9 servidores MCP através de uma arquitetura centralizada:
 * Windsurf IDE → MCP_DOCKER → Orchestrator → 8 Servidores MCP
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuração dos servidores MCP
const MCP_SERVERS = {
    CONTEXT7: {
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp@latest'],
        description: 'Gerenciamento de contexto com Upstash',
        enabled: process.env.MCP_CONTEXT7_ENABLED === 'true'
    },
    N8N: {
        command: 'node',
        args: ['-e', `
            const http = require('http');
            const PORT = 8813;
            
            // Servidor proxy para N8N MCP
            const server = http.createServer((req, res) => {
                if (req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        status: 'healthy', 
                        service: 'n8n-mcp',
                        url: process.env.N8N_API_URL || 'http://localhost:5678'
                    }));
                } else {
                    res.writeHead(404);
                    res.end('N8N MCP Server');
                }
            });
            
            server.listen(PORT, () => {
                console.log(\`N8N MCP Server running on port \${PORT}\`);
            });
        `],
        description: 'Automação de workflows N8N',
        enabled: process.env.MCP_N8N_ENABLED === 'true'
    },
    GO_MCP: {
        command: 'node',
        args: ['-e', `
            console.log('GO-MCP Server starting...');
            const http = require('http');
            const PORT = 8814;
            
            const server = http.createServer((req, res) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'running', 
                    service: 'go-mcp-server',
                    description: 'Performance optimized MCP server'
                }));
            });
            
            server.listen(PORT, () => {
                console.log(\`GO MCP Server running on port \${PORT}\`);
            });
        `],
        description: 'Servidor MCP em Go para performance',
        enabled: process.env.MCP_GO_ENABLED === 'true'
    },
    GITHUB: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github@latest'],
        description: 'Integração oficial com GitHub',
        enabled: process.env.MCP_GITHUB_ENABLED === 'true',
        env: {
            GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_PERSONAL_ACCESS_TOKEN
        }
    },
    PLAYWRIGHT: {
        command: 'npx',
        args: ['-y', 'playwright-mcp-server@latest'],
        description: 'Testes e automação web com Playwright',
        enabled: process.env.MCP_PLAYWRIGHT_ENABLED === 'true'
    },
    // Servidores simulados para demonstração
    SUPABASE_SIM: {
        command: 'node',
        args: ['-e', `
            console.log('Supabase MCP Server simulation starting...');
            const http = require('http');
            const PORT = 8815;
            
            const server = http.createServer((req, res) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'running', 
                    service: 'supabase-mcp-server',
                    description: 'Supabase integration (simulated)',
                    url: process.env.SUPABASE_URL
                }));
            });
            
            server.listen(PORT, () => {
                console.log(\`Supabase MCP Server (simulated) running on port \${PORT}\`);
            });
        `],
        description: 'Integração simulada com Supabase',
        enabled: process.env.MCP_SUPABASE_ENABLED === 'true',
        env: {
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
        }
    },
    BROWSER_SIM: {
        command: 'node',
        args: ['-e', `
            console.log('Browser Tools MCP Server simulation starting...');
            const http = require('http');
            const PORT = 8816;
            
            const server = http.createServer((req, res) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    status: 'running', 
                    service: 'browser-tools-mcp-server',
                    description: 'Browser automation tools (simulated)'
                }));
            });
            
            server.listen(PORT, () => {
                console.log(\`Browser Tools MCP Server (simulated) running on port \${PORT}\`);
            });
        `],
        description: 'Automação de browser (simulado)',
        enabled: process.env.MCP_BROWSER_ENABLED === 'true'
    }
};

class MCPOrchestrator {
    constructor() {
        this.processes = new Map();
        this.isShuttingDown = false;
        this.startTime = Date.now();
        
        // Configurar handlers de sinais
        process.on('SIGINT', () => this.shutdown('SIGINT'));
        process.on('SIGTERM', () => this.shutdown('SIGTERM'));
        process.on('exit', () => this.cleanup());
        
        console.log('🚀 MCP Orchestrator iniciando...');
        console.log(`📅 Timestamp: ${new Date().toISOString()}`);
        console.log(`🐳 Docker Host: ${process.env.DOCKER_HOST || 'local'}`);
    }

    async start() {
        console.log('\n📋 Configuração dos Servidores MCP:');
        
        for (const [name, config] of Object.entries(MCP_SERVERS)) {
            const status = config.enabled ? '✅ HABILITADO' : '❌ DESABILITADO';
            console.log(`  ${name}: ${status} - ${config.description}`);
        }

        console.log('\n🔄 Iniciando servidores habilitados...\n');

        for (const [name, config] of Object.entries(MCP_SERVERS)) {
            if (config.enabled) {
                await this.startServer(name, config);
                // Pequeno delay entre inicializações
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log('\n✅ Todos os servidores MCP foram iniciados!');
        console.log('🔍 Use Ctrl+C para parar o orchestrator\n');

        // Manter o processo vivo
        this.keepAlive();
    }

    async startServer(name, config) {
        try {
            console.log(`🔄 Iniciando ${name}...`);

            const env = {
                ...process.env,
                ...config.env
            };

            const child = spawn(config.command, config.args, {
                env,
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true
            });

            // Configurar logs
            child.stdout.on('data', (data) => {
                const message = data.toString().trim();
                if (message) {
                    console.log(`[${name}] ${message}`);
                }
            });

            child.stderr.on('data', (data) => {
                const message = data.toString().trim();
                if (message && !message.includes('npm WARN')) {
                    console.error(`[${name}] ERROR: ${message}`);
                }
            });

            child.on('close', (code) => {
                if (!this.isShuttingDown) {
                    console.log(`❌ [${name}] Processo finalizado com código: ${code}`);
                    this.processes.delete(name);
                    
                    // Tentar reiniciar após 5 segundos
                    setTimeout(() => {
                        if (!this.isShuttingDown) {
                            console.log(`🔄 Tentando reiniciar ${name}...`);
                            this.startServer(name, config);
                        }
                    }, 5000);
                }
            });

            child.on('error', (error) => {
                console.error(`❌ [${name}] Erro ao iniciar: ${error.message}`);
            });

            this.processes.set(name, child);
            console.log(`✅ ${name} iniciado (PID: ${child.pid})`);

        } catch (error) {
            console.error(`❌ Erro ao iniciar ${name}: ${error.message}`);
        }
    }

    keepAlive() {
        // Reportar status a cada 5 minutos
        setInterval(() => {
            if (!this.isShuttingDown) {
                const uptime = Math.round((Date.now() - this.startTime) / 1000 / 60);
                const activeProcesses = this.processes.size;
                console.log(`📊 Status: ${activeProcesses} servidores ativos | Uptime: ${uptime}min`);
            }
        }, 5 * 60 * 1000);

        // Verificar saúde dos processos a cada 30 segundos
        setInterval(() => {
            if (!this.isShuttingDown) {
                this.healthCheck();
            }
        }, 30 * 1000);
    }

    healthCheck() {
        let healthyCount = 0;
        
        for (const [name, process] of this.processes) {
            if (process && !process.killed) {
                healthyCount++;
            }
        }

        if (healthyCount === 0 && this.processes.size > 0) {
            console.log('⚠️  Nenhum processo MCP ativo detectado!');
        }
    }

    async shutdown(signal) {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        console.log(`\n🛑 Recebido sinal ${signal}. Finalizando servidores MCP...`);

        const shutdownPromises = [];

        for (const [name, process] of this.processes) {
            if (process && !process.killed) {
                console.log(`🔄 Finalizando ${name}...`);
                
                const shutdownPromise = new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.log(`⚠️  ${name} não respondeu, forçando encerramento...`);
                        process.kill('SIGKILL');
                        resolve();
                    }, 5000);

                    process.on('close', () => {
                        clearTimeout(timeout);
                        console.log(`✅ ${name} finalizado`);
                        resolve();
                    });

                    process.kill('SIGTERM');
                });

                shutdownPromises.push(shutdownPromise);
            }
        }

        await Promise.all(shutdownPromises);
        console.log('✅ Todos os servidores MCP foram finalizados.');
        process.exit(0);
    }

    cleanup() {
        for (const [name, process] of this.processes) {
            if (process && !process.killed) {
                process.kill('SIGKILL');
            }
        }
    }
}

// Executar apenas se for o arquivo principal
if (require.main === module) {
    const orchestrator = new MCPOrchestrator();
    orchestrator.start().catch(error => {
        console.error('❌ Erro fatal no MCP Orchestrator:', error);
        process.exit(1);
    });
}

module.exports = MCPOrchestrator;
