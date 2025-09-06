/**
 * Configuração centralizada do AbacatePay
 * Gerencia variáveis de ambiente e validações
 */

export interface AbacatePayConfig {
  apiKey: string;
  webhookEndpoint: string;
  baseUrl: string;
  environment: 'development' | 'production';
  pixExpirationMinutes: number;
  paymentPollingInterval: number;
  webhookSecret: string;
  webhookTimeout: number;
  debug: boolean;
}

/**
 * Valida se uma chave de API do AbacatePay é válida
 */
const validateApiKey = (apiKey: string): boolean => {
  if (!apiKey) return false;
  
  // Chaves de desenvolvimento devem começar com 'abc_dev_'
  // Chaves de produção devem começar com 'abc_live_'
  const devPattern = /^abc_dev_[a-zA-Z0-9]{20,}$/;
  const livePattern = /^abc_live_[a-zA-Z0-9]{20,}$/;
  
  return devPattern.test(apiKey) || livePattern.test(apiKey);
};

/**
 * Valida se um endpoint de webhook é válido
 */
const validateWebhookEndpoint = (endpoint: string): boolean => {
  if (!endpoint) return false;
  
  // Endpoints devem começar com 'webh_dev_' ou 'webh_live_'
  const devPattern = /^webh_dev_[a-zA-Z0-9]{20,}$/;
  const livePattern = /^webh_live_[a-zA-Z0-9]{20,}$/;
  
  return devPattern.test(endpoint) || livePattern.test(endpoint);
};

/**
 * Determina o ambiente baseado na chave de API
 */
const getEnvironmentFromApiKey = (apiKey: string): 'development' | 'production' => {
  return apiKey.startsWith('abc_live_') ? 'production' : 'development';
};

/**
 * Carrega e valida a configuração do AbacatePay
 */
const loadConfig = (): AbacatePayConfig => {
  const apiKey = import.meta.env.VITE_ABACATE_PAY_API_KEY || '';
  const webhookEndpoint = import.meta.env.VITE_ABACATE_PAY_WEBHOOK_ENDPOINT || '';
  const baseUrl = import.meta.env.VITE_ABACATE_PAY_BASE_URL || 'https://api.abacatepay.com/v1';
  const environment = import.meta.env.VITE_ENVIRONMENT === 'production' ? 'production' : 'development';
  
  // Validações
  if (!validateApiKey(apiKey)) {
    throw new Error(
      `Chave de API do AbacatePay inválida. ` +
      `Deve começar com 'abc_dev_' (desenvolvimento) ou 'abc_live_' (produção). ` +
      `Verifique a variável VITE_ABACATE_PAY_API_KEY.`
    );
  }
  
  if (!validateWebhookEndpoint(webhookEndpoint)) {
    console.warn(
      `Endpoint de webhook do AbacatePay inválido ou não configurado. ` +
      `Deve começar com 'webh_dev_' ou 'webh_live_'. ` +
      `Verifique a variável VITE_ABACATE_PAY_WEBHOOK_ENDPOINT.`
    );
  }
  
  // Verificar consistência entre ambiente e chave
  const keyEnvironment = getEnvironmentFromApiKey(apiKey);
  if (keyEnvironment !== environment) {
    console.warn(
      `Inconsistência detectada: ambiente configurado como '${environment}' ` +
      `mas chave de API é de '${keyEnvironment}'. ` +
      `Usando ambiente da chave de API.`
    );
  }
  
  return {
    apiKey,
    webhookEndpoint,
    baseUrl,
    environment: keyEnvironment,
    pixExpirationMinutes: parseInt(import.meta.env.VITE_PIX_EXPIRATION_MINUTES || '30'),
    paymentPollingInterval: parseInt(import.meta.env.VITE_PAYMENT_POLLING_INTERVAL || '5000'),
    webhookSecret: import.meta.env.VITE_WEBHOOK_SECRET || '',
    webhookTimeout: parseInt(import.meta.env.VITE_WEBHOOK_TIMEOUT || '30000'),
    debug: import.meta.env.VITE_DEBUG === 'true' || environment === 'development'
  };
};

/**
 * Configuração global do AbacatePay
 * Carregada uma vez na inicialização da aplicação
 */
export const abacatePayConfig = loadConfig();

/**
 * Utilitários de configuração
 */
export const ConfigUtils = {
  /**
   * Verifica se está em ambiente de desenvolvimento
   */
  isDevelopment: (): boolean => abacatePayConfig.environment === 'development',
  
  /**
   * Verifica se está em ambiente de produção
   */
  isProduction: (): boolean => abacatePayConfig.environment === 'production',
  
  /**
   * Retorna a URL base da API com versão
   */
  getApiUrl: (endpoint: string = ''): string => {
    const baseUrl = abacatePayConfig.baseUrl.endsWith('/') 
      ? abacatePayConfig.baseUrl.slice(0, -1) 
      : abacatePayConfig.baseUrl;
    
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
  },
  
  /**
   * Retorna headers padrão para requisições
   */
  getDefaultHeaders: (): Record<string, string> => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${abacatePayConfig.apiKey}`,
    'User-Agent': `AbacatePay-SDK/1.0.0 (${abacatePayConfig.environment})`
  }),
  
  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debugLog: (message: string, data?: unknown): void => {
    if (abacatePayConfig.debug) {
      console.log(`[AbacatePay Debug] ${message}`, data || '');
    }
  },
  
  /**
   * Máscara para logs (oculta informações sensíveis)
   */
  maskSensitiveData: (data: Record<string, unknown>): Record<string, unknown> => {
    const masked = { ...data };
    
    // Mascarar chaves de API
    if (masked.apiKey && typeof masked.apiKey === 'string') {
      masked.apiKey = masked.apiKey.substring(0, 10) + '***';
    }
    
    // Mascarar CPF
    if (masked.cpf && typeof masked.cpf === 'string') {
      masked.cpf = masked.cpf.replace(/(\d{3})\d{6}(\d{2})/, '$1***.**$2');
    }
    
    // Mascarar email
    if (masked.email && typeof masked.email === 'string') {
      const [local, domain] = masked.email.split('@');
      if (local && domain) {
        masked.email = `${local.substring(0, 2)}***@${domain}`;
      }
    }
    
    return masked;
  }
};

// Log da configuração carregada (com dados mascarados)
if (abacatePayConfig.debug) {
  console.log('[AbacatePay] Configuração carregada:', 
    ConfigUtils.maskSensitiveData(abacatePayConfig as Record<string, unknown>)
  );
}