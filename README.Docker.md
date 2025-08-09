# 🦋 Borboleta Eventos Loja - Docker Hub

[![Docker Image](https://img.shields.io/docker/v/andersondos7000/borboleta-eventos-loja?label=docker%20hub&logo=docker)](https://hub.docker.com/r/andersondos7000/borboleta-eventos-loja)
[![Docker Pulls](https://img.shields.io/docker/pulls/andersondos7000/borboleta-eventos-loja)](https://hub.docker.com/r/andersondos7000/borboleta-eventos-loja)
[![Docker Image Size](https://img.shields.io/docker/image-size/andersondos7000/borboleta-eventos-loja/latest)](https://hub.docker.com/r/andersondos7000/borboleta-eventos-loja)
[![MCP Integration](https://img.shields.io/badge/MCP-Integrated-blue)](https://modelcontextprotocol.io/)

## 🚀 E-commerce Platform with Advanced MCP Integration

Borboleta Eventos Loja is a modern e-commerce platform built with **React**, **TypeScript**, **Supabase**, and **Docker MCP Gateway** integration. This Docker image provides a production-ready deployment with enterprise-grade MCP (Model Context Protocol) support.

## ✨ Key Features

- 🛒 **Full E-commerce Solution**: Products, cart, checkout, payments
- 💳 **AbacatePay Integration**: Brazilian payment gateway support
- 🔄 **MCP Gateway Integration**: Advanced AI agent support
- 🗄️ **Supabase Backend**: Real-time database and authentication
- 🐳 **Docker Optimized**: Multi-stage builds, security hardened
- 📊 **Health Monitoring**: Built-in health checks and metrics
- 🔧 **VS Code Integration**: Native development environment support

## 🐳 Quick Start

### Basic Usage

```bash
# Pull the latest image
docker pull andersondos7000/borboleta-eventos-loja:latest

# Run with basic configuration
docker run -d \
  --name borboleta-loja \
  -p 5173:5173 \
  -e VITE_SUPABASE_URL=your_supabase_url \
  -e VITE_SUPABASE_ANON_KEY=your_anon_key \
  andersondos7000/borboleta-eventos-loja:latest
```

### MCP Gateway Integration

```bash
# Run with MCP Gateway support
docker run -d \
  --name borboleta-loja-mcp \
  -p 5173:5173 \
  -e MCP_ENABLED=true \
  -e MCP_GATEWAY_URL=http://mcp-gateway:3000 \
  -e VITE_SUPABASE_URL=your_supabase_url \
  -e VITE_SUPABASE_ANON_KEY=your_anon_key \
  --network mcp-network \
  andersondos7000/borboleta-eventos-loja:latest
```

### Docker Compose (Recommended)

```yaml
version: '3.8'

services:
  borboleta-loja:
    image: andersondos7000/borboleta-eventos-loja:latest
    ports:
      - "5173:5173"
    environment:
      - NODE_ENV=production
      - MCP_ENABLED=true
      - MCP_GATEWAY_URL=http://mcp-gateway:3000
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ0eXAi...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `MCP_ENABLED` | `false` | Enable MCP integration |
| `MCP_GATEWAY_URL` | - | MCP Gateway endpoint |
| `VITE_MCP_INTEGRATION` | `false` | Frontend MCP features |

### Advanced Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | - | Server-side Supabase key |
| `ABACATE_PAY_API_KEY` | - | Payment gateway API key |
| `JWT_SECRET` | - | JWT signing secret |

## 🏗️ MCP Architecture

This image is designed to work seamlessly with Docker's MCP ecosystem:

```
┌─────────────────────────────────────────┐
│           MCP Gateway                   │
│         (Port 3000)                     │
├─────────────────────────────────────────┤
│  🐙 GitHub MCP     📊 Supabase MCP     │
│  🌐 Browser MCP    🎭 Playwright MCP   │
│  📋 Docker Hub MCP                     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      Borboleta Eventos Loja             │
│         (Port 5173)                     │
│                                         │
│  ✅ E-commerce Platform                 │
│  ✅ Payment Processing                  │
│  ✅ MCP Client Integration              │
│  ✅ Health Monitoring                   │
└─────────────────────────────────────────┘
```

## 📊 Health Monitoring

The image includes comprehensive health monitoring:

### Health Check Endpoint

```bash
curl http://localhost:5173/health
```

```json
{
  "status": "healthy",
  "timestamp": "2025-01-08T12:00:00Z",
  "version": "3.0.0",
  "mcp_enabled": true,
  "services": {
    "app": "running",
    "mcp_gateway": true,
    "supabase": "configured"
  }
}
```

### Docker Health Check

Built-in Docker health check that monitors:
- Application responsiveness
- Health endpoint availability
- MCP Gateway connectivity (if enabled)

## 🔒 Security Features

- 🛡️ **Non-root user**: Runs as `borboleta` user (UID 1001)
- 🔐 **Minimal attack surface**: Alpine-based with minimal packages
- 🏥 **Health monitoring**: Comprehensive health checks
- 📝 **Proper logging**: Structured logging with rotation
- 🔒 **Secret management**: Environment-based configuration

## 🚀 Advanced Usage

### Multi-Architecture Support

```bash
# For ARM64 (Apple Silicon, ARM servers)
docker pull andersondos7000/borboleta-eventos-loja:latest

# For AMD64 (Intel/AMD processors)
docker pull andersondos7000/borboleta-eventos-loja:latest
```

### Development Mode

```bash
docker run -d \
  --name borboleta-dev \
  -p 5173:5173 \
  -e NODE_ENV=development \
  -v $(pwd):/app \
  andersondos7000/borboleta-eventos-loja:latest
```

### Custom Configuration

```bash
# Mount custom configuration
docker run -d \
  --name borboleta-custom \
  -p 5173:5173 \
  -v ./config:/app/config \
  -v ./logs:/app/logs \
  andersondos7000/borboleta-eventos-loja:latest
```

## 📋 Available Tags

| Tag | Description | Use Case |
|-----|-------------|----------|
| `latest` | Latest stable release | Production |
| `v3.0.0` | Specific version | Production (pinned) |
| `main` | Main branch build | Staging |
| `develop` | Development branch | Testing |
| `YYYY.MM.DD-{sha}` | Date-based build | Specific builds |

## 🛠️ Building from Source

```bash
# Clone repository
git clone https://github.com/Andersondos7000/borboleta-eventos-loja.git
cd borboleta-eventos-loja

# Build Docker image
docker build -f Dockerfile.hub -t borboleta-eventos-loja .

# Run locally
docker run -p 5173:5173 borboleta-eventos-loja
```

## 🔗 Integration Examples

### With MCP Gateway Stack

```yaml
version: '3.8'

networks:
  mcp-network:
    driver: bridge

services:
  mcp-gateway:
    image: docker/mcp-gateway:latest
    ports:
      - "3000:3000"
    networks:
      - mcp-network

  borboleta-loja:
    image: andersondos7000/borboleta-eventos-loja:latest
    ports:
      - "5173:5173"
    environment:
      - MCP_ENABLED=true
      - MCP_GATEWAY_URL=http://mcp-gateway:3000
    networks:
      - mcp-network
    depends_on:
      - mcp-gateway
```

### With Load Balancer

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

  borboleta-loja-1:
    image: andersondos7000/borboleta-eventos-loja:latest
    environment:
      - INSTANCE_ID=1

  borboleta-loja-2:
    image: andersondos7000/borboleta-eventos-loja:latest
    environment:
      - INSTANCE_ID=2
```

## 📚 Documentation

- **GitHub Repository**: [borboleta-eventos-loja](https://github.com/Andersondos7000/borboleta-eventos-loja)
- **MCP Documentation**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Supabase Docs**: [Supabase Documentation](https://supabase.com/docs)
- **Docker Hub**: [Image Repository](https://hub.docker.com/r/andersondos7000/borboleta-eventos-loja)

## 🤝 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/Andersondos7000/borboleta-eventos-loja/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Andersondos7000/borboleta-eventos-loja/discussions)
- 📧 **Email**: anderson@borboletaeventos.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/Andersondos7000/borboleta-eventos-loja/blob/main/LICENSE) file for details.

---

**Built with ❤️ by Borboleta Eventos Team**

*Powered by Docker Hub, MCP Gateway, and modern web technologies*
