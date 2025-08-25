// Configurações de CORS para Edge Functions
// Permite requisições do frontend e outros domínios autorizados

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400', // 24 horas
}

// Configurações específicas para produção
export const productionCorsHeaders = {
  'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'https://yourdomain.com',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-device-id, x-sync-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}

// Headers para desenvolvimento
export const developmentCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': '*',
  'Access-Control-Max-Age': '86400',
}

// Função para obter headers baseado no ambiente
export function getCorsHeaders() {
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development'
  return isDevelopment ? developmentCorsHeaders : productionCorsHeaders
}

// Middleware para tratar requisições OPTIONS
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: getCorsHeaders(),
      status: 200
    })
  }
  return null
}

// Validar origem da requisição
export function isValidOrigin(origin: string | null): boolean {
  if (!origin) return false
  
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://yourdomain.com',
    process.env.FRONTEND_URL
  ].filter(Boolean)
  
  return allowedOrigins.includes(origin)
}

// Headers de segurança adicionais
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'"
}

// Combinar todos os headers
export function getAllHeaders() {
  return {
    ...getCorsHeaders(),
    ...securityHeaders,
    'Content-Type': 'application/json'
  }
}