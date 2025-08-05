#!/usr/bin/env node

/**
 * MCP Orchestrator Simplificado - Borboleta Eventos
 * Versão focada nos servidores MCP funcionais
 */

const { spawn } = require('child_process');

// Configuração simplificada dos servidores MCP
const MCP_SERVERS = {
    CONTEXT7: {
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp@latest'],
        description: 'Gerenciamento de contexto com Upstash',
        enabled: process.env.MCP_CONTEXT7_ENABLED === 'true'
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
    SUPABASE: {
        command: 'npx',
        args: ['-y', '@supabase/mcp-server-supabase@latest', '--read-only', `--project-ref=${process.env.SUPABASE_PROJECT_REF || 'pxcvoiffnandpdyotped'}`],
        description: 'Supabase MCP Server oficial',
        enabled: process.env.MCP_SUPABASE_ENABLED === 'true',
        env: {
            SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
        }
    },
    N8N: {
        command: 'npx',
        args: ['-y', 'n8n-mcp'],
        description: 'Integração com n8n para automação de workflows',
        enabled: process.env.MCP_N8N_ENABLED === 'true',
        env: {
            N8N_API_URL: process.env.N8N_API_URL || 'http://localhost:5678'
        }
    },
    BROWSER: {
        command: 'npx',
        args: ['-y', 'browser-mcp-server@latest'],
        description: 'Browser automation and web interaction tools',
        enabled: process.env.MCP_BROWSER_ENABLED === 'true'
    },
    MAGIC: {
        command: 'npx',
        args: ['-y', '@21st-dev/magic'],
        description: '21st Century Development Magic Tools',
        enabled: process.env.MCP_MAGIC_ENABLED === 'true'
    },
    PLAYWRIGHT: {
        command: 'npx',
        args: ['-y', 'playwright-mcp-server@latest'],
        description: 'Testes e automação web com Playwright',
        enabled: process.env.MCP_PLAYWRIGHT_ENABLED === 'true'
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
        
        console.log('🚀 MCP Orchestrator (Simplificado) iniciando...');
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

        const enabledServers = Object.entries(MCP_SERVERS).filter(([_, config]) => config.enabled);
        
        if (enabledServers.length === 0) {
            console.log('⚠️  Nenhum servidor MCP habilitado!');
            console.log('💡 Configure as variáveis de ambiente MCP_*_ENABLED=true');
            return;
        }

        for (const [name, config] of enabledServers) {
            await this.startServer(name, config);
            // Pequeno delay entre inicializações
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\n✅ Servidores MCP iniciados!');
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
                shell: false
            });

            // Configurar logs
            child.stdout.on('data', (data) => {
                const message = data.toString().trim();
                if (message && !message.includes('npm WARN')) {
                    console.log(`[${name}] ${message}`);
                }
            });

            child.stderr.on('data', (data) => {
                const message = data.toString().trim();
                if (message && !message.includes('npm WARN') && !message.includes('deprecated')) {
                    console.error(`[${name}] ERROR: ${message}`);
                }
            });

            child.on('close', (code) => {
                if (!this.isShuttingDown) {
                    console.log(`❌ [${name}] Processo finalizado com código: ${code}`);
                    this.processes.delete(name);
                    
                    // Tentar reiniciar após 10 segundos
                    setTimeout(() => {
                        if (!this.isShuttingDown && code !== 0) {
                            console.log(`🔄 Tentando reiniciar ${name}...`);
                            this.startServer(name, config);
                        }
                    }, 10000);
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
        // Reportar status a cada 30 minutos
        setInterval(() => {
            if (!this.isShuttingDown) {
                const uptime = Math.round((Date.now() - this.startTime) / 1000 / 60);
                const activeProcesses = this.processes.size;
                console.log(`📊 Status: ${activeProcesses} servidores ativos | Uptime: ${uptime}min`);
            }
        }, 30 * 60 * 1000);

        // Verificar saúde dos processos a cada 60 segundos
        setInterval(() => {
            if (!this.isShuttingDown) {
                this.healthCheck();
            }
        }, 60 * 1000);
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
