FROM node:20

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de configuração primeiro (para cache de layers)
COPY package*.json ./
COPY scripts/ ./scripts/

# Instalar dependências do projeto
RUN npm install

# Instalar servidores MCP globalmente
RUN npm install -g @modelcontextprotocol/server-supabase@latest && \
    npm install -g @modelcontextprotocol/server-github@latest && \
    npm install -g @modelcontextprotocol/server-browser@latest && \
    npm install -g @upstash/context7-mcp@latest && \
    npm install -g @21st-dev/magic-mcp@latest || true

# Configurar orchestrator MCP
RUN chmod +x /app/scripts/setup-mcp.sh && \
    chmod +x /app/scripts/verify-mcp.sh && \
    chmod +x /app/scripts/mcp-orchestrator.js && \
    ln -sf /app/scripts/mcp-orchestrator.js /usr/local/bin/mcp-orchestrator

# Copiar resto dos arquivos
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
