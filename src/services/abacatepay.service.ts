/**
 * Serviço principal do AbacatePay
 * Centraliza todas as operações de pagamento e oferece interface simplificada
 */

import { abacatePaySDK } from '../lib/abacatepay';
import { abacatePayConfig, ConfigUtils } from '../config/abacatepay';

// Tipos específicos do serviço
export interface CreateChargeRequest {
  valor: number; // Valor em centavos (ex: 2990 = R$ 29,90)
  descricao: string;
  cliente: {
    nome: string;
    email: string;
    cpf: string;
    telefone?: string;
  };
  items?: Array<{
    productId?: string;
    ticketId?: string;
    price: number;
    quantity: number;
    size?: string;
  }>;
  metodos?: ('pix' | 'cartao' | 'boleto')[];
  expires_in?: number; // Tempo de expiração em segundos
  external_reference?: string; // Referência externa (ID do pedido)
}

export interface ChargeResponse {
  id: string;
  status: 'aguardando_pagamento' | 'pago' | 'expirado' | 'falhou';
  valor: number;
  descricao: string;
  external_reference?: string;
  pix?: {
    qr_code: string;
    qr_code_url: string;
    copia_cola: string;
  };
  cartao?: {
    checkout_url: string;
  };
  boleto?: {
    linha_digitavel: string;
    codigo_barras: string;
    pdf_url: string;
  };
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentStatusResponse {
  id: string;
  status: 'aguardando_pagamento' | 'pago' | 'expirado' | 'falhou';
  valor: number;
  valor_pago?: number;
  metodo_pagamento?: string;
  data_pagamento?: string;
  external_reference?: string;
}

export interface WebhookEvent {
  id: string;
  event: 'cobranca.criada' | 'cobranca.paga' | 'cobranca.expirada' | 'cobranca.falhou';
  data: {
    id: string;
    status: string;
    valor: number;
    external_reference?: string;
    [key: string]: unknown;
  };
  created_at: string;
}

/**
 * Classe principal do serviço AbacatePay
 */
export class AbacatePayService {
  private static instance: AbacatePayService;
  
  private constructor() {
    ConfigUtils.debugLog('Serviço AbacatePay inicializado');
  }
  
  /**
   * Singleton - retorna a instância única do serviço
   */
  public static getInstance(): AbacatePayService {
    if (!AbacatePayService.instance) {
      AbacatePayService.instance = new AbacatePayService();
    }
    return AbacatePayService.instance;
  }
  
  /**
   * Cria uma nova cobrança
   */
  async createCharge(request: CreateChargeRequest): Promise<ChargeResponse> {
    try {
      ConfigUtils.debugLog('Criando cobrança:', ConfigUtils.maskSensitiveData(request));
      
      // Validações básicas
      this.validateChargeRequest(request);
      
      // Transform to Edge Function format
      const edgeFunctionRequest = {
        action: 'create_payment',
        orderData: {
          firstName: request.cliente.nome.split(' ')[0] || request.cliente.nome,
          lastName: request.cliente.nome.split(' ').slice(1).join(' ') || '',
          email: request.cliente.email,
          cpf: request.cliente.cpf,
          phone: request.cliente.telefone || '11999999999'
        },
        total: request.valor / 100, // Convert from cents to reais
        items: request.items || [{
          productId: 'checkout-item',
          price: request.valor / 100,
          quantity: 1,
          size: 'default'
        }]
      };
      
      ConfigUtils.debugLog('Calling Edge Function with:', edgeFunctionRequest);
      
      // Call the Edge Function
      const response = await fetch('/functions/v1/abacatepay-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSupabaseAnonKey()}`
        },
        body: JSON.stringify(edgeFunctionRequest)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        ConfigUtils.debugLog('Edge Function error:', errorText);
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      ConfigUtils.debugLog('Edge Function response:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Payment creation failed');
      }
      
      return {
        id: result.paymentData.data?.id || result.orderId,
        status: 'aguardando_pagamento',
        valor: request.valor,
        descricao: request.descricao,
        external_reference: request.external_reference,
        pix: result.paymentData.data?.pix ? {
          qr_code: result.paymentData.data.pix.code,
          qr_code_url: result.paymentData.data.pix.qrCodeUrl,
          copia_cola: result.paymentData.data.pix.code
        } : undefined,
        expires_at: result.paymentData.data?.expiresAt || new Date(Date.now() + (abacatePayConfig.pixExpirationMinutes * 60 * 1000)).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      ConfigUtils.debugLog('Erro ao criar cobrança:', error);
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Consulta o status de uma cobrança
   */
  async getChargeStatus(chargeId: string): Promise<PaymentStatusResponse> {
    try {
      ConfigUtils.debugLog('Consultando status da cobrança:', { chargeId });
      
      if (!chargeId) {
        throw new Error('ID da cobrança é obrigatório');
      }
      
      const response = await fetch('/functions/v1/abacatepay-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSupabaseAnonKey()}`
        },
        body: JSON.stringify({
          action: 'check_payment_status',
          transactionId: chargeId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to check payment status: ${response.status}`);
      }
      
      const result = await response.json();
      
      ConfigUtils.debugLog('Status consultado:', { 
        chargeId, 
        status: result.data?.status 
      });
      
      return {
        id: chargeId,
        status: this.mapStatus(result.data?.status || 'pending'),
        valor: result.data?.amount || 0,
        valor_pago: result.data?.amount_paid,
        metodo_pagamento: result.data?.payment_method,
        data_pagamento: result.data?.paid_at,
        external_reference: result.data?.external_reference
      };
    } catch (error) {
      ConfigUtils.debugLog('Erro ao consultar status:', error);
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Lista cobranças com filtros opcionais
   */
  async listCharges(filters?: {
    status?: string;
    external_reference?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ charges: ChargeResponse[]; total: number }> {
    try {
      ConfigUtils.debugLog('Listando cobranças:', filters);
      
      // This would need to be implemented in the Edge Function if needed
      ConfigUtils.debugLog('listCharges not implemented in Edge Function yet');
      return {
        charges: [],
        total: 0
      };
    } catch (error) {
      ConfigUtils.debugLog('Erro ao listar cobranças:', error);
      throw this.handleApiError(error);
    }
  }
  
  /**
   * Valida webhook recebido
   */
  validateWebhook(payload: string, signature: string): boolean {
    try {
      if (!abacatePayConfig.webhookSecret) {
        ConfigUtils.debugLog('Webhook secret não configurado, pulando validação');
        return true; // Em desenvolvimento, pode não ter secret configurado
      }
      
      // Implementar validação HMAC
      // Por enquanto, retorna true para desenvolvimento
      return true;
    } catch (error) {
      ConfigUtils.debugLog('Erro ao validar webhook:', error);
      return false;
    }
  }
  
  /**
   * Processa evento de webhook
   */
  processWebhookEvent(payload: any): WebhookEvent {
    try {
      ConfigUtils.debugLog('Processando evento de webhook:', 
        ConfigUtils.maskSensitiveData(payload)
      );
      
      return {
        id: payload.id || `webhook_${Date.now()}`,
        event: this.mapWebhookEvent(payload.event || payload.status),
        data: {
          id: payload.external_reference || payload.id,
          status: payload.status,
          valor: payload.valor || payload.amount,
          external_reference: payload.external_reference,
          ...payload
        },
        created_at: payload.created_at || new Date().toISOString()
      };
    } catch (error) {
      ConfigUtils.debugLog('Erro ao processar webhook:', error);
      throw new Error('Erro ao processar evento de webhook');
    }
  }
  
  /**
   * Utilitários públicos
   */
  public utils = {
    /**
     * Formata valor em centavos para exibição
     */
    formatCurrency: (valueInCents: number): string => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(valueInCents / 100);
    },
    
    /**
     * Converte valor em reais para centavos
     */
    toCents: (valueInReais: number): number => {
      return Math.round(valueInReais * 100);
    },
    
    /**
     * Verifica se cobrança está expirada
     */
    isExpired: (expiresAt: string): boolean => {
      return new Date(expiresAt) < new Date();
    },
    
    /**
     * Calcula tempo restante para expiração
     */
    getTimeToExpiration: (expiresAt: string): number => {
      const expiration = new Date(expiresAt);
      const now = new Date();
      return Math.max(0, expiration.getTime() - now.getTime());
    }
  };
  
  // Métodos privados
  
  private getSupabaseAnonKey(): string {
    // Get the Supabase anon key from environment
    return import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }
  
  private validateChargeRequest(request: CreateChargeRequest): void {
    if (!request.valor || request.valor <= 0) {
      throw new Error('Valor deve ser maior que zero');
    }
    
    if (!request.descricao || request.descricao.trim().length === 0) {
      throw new Error('Descrição é obrigatória');
    }
    
    if (!request.cliente.nome || request.cliente.nome.trim().length === 0) {
      throw new Error('Nome do cliente é obrigatório');
    }
    
    if (!request.cliente.email || !this.isValidEmail(request.cliente.email)) {
      throw new Error('Email válido é obrigatório');
    }
    
    if (!request.cliente.cpf || !this.isValidCpf(request.cliente.cpf)) {
      throw new Error('CPF válido é obrigatório');
    }
  }
  
  private formatCpf(cpf: string): string {
    // Remove caracteres não numéricos
    const numbers = cpf.replace(/\D/g, '');
    
    // Formata como XXX.XXX.XXX-XX
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private isValidCpf(cpf: string): boolean {
    const numbers = cpf.replace(/\D/g, '');
    
    if (numbers.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(numbers)) return false; // Todos os dígitos iguais
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers[i]) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers[i]) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return parseInt(numbers[9]) === digit1 && parseInt(numbers[10]) === digit2;
  }
  
  private normalizeChargeResponse(response: any): ChargeResponse {
    return {
      id: response.id,
      status: this.mapStatus(response.status),
      valor: response.valor || response.amount,
      descricao: response.descricao || response.description,
      external_reference: response.external_reference,
      pix: response.pix ? {
        qr_code: response.pix.qr_code,
        qr_code_url: response.pix.qr_code_url,
        copia_cola: response.pix.copia_cola || response.pix.qr_code
      } : undefined,
      cartao: response.cartao ? {
        checkout_url: response.cartao.checkout_url
      } : undefined,
      boleto: response.boleto ? {
        linha_digitavel: response.boleto.linha_digitavel,
        codigo_barras: response.boleto.codigo_barras,
        pdf_url: response.boleto.pdf_url
      } : undefined,
      expires_at: response.expires_at,
      created_at: response.created_at,
      updated_at: response.updated_at
    };
  }
  
  private normalizeStatusResponse(response: any): PaymentStatusResponse {
    return {
      id: response.id,
      status: this.mapStatus(response.status),
      valor: response.valor || response.amount,
      valor_pago: response.valor_pago || response.amount_paid,
      metodo_pagamento: response.metodo_pagamento || response.payment_method,
      data_pagamento: response.data_pagamento || response.paid_at,
      external_reference: response.external_reference
    };
  }
  
  private mapStatus(status: string): 'aguardando_pagamento' | 'pago' | 'expirado' | 'falhou' {
    const statusMap: Record<string, 'aguardando_pagamento' | 'pago' | 'expirado' | 'falhou'> = {
      'pending': 'aguardando_pagamento',
      'aguardando_pagamento': 'aguardando_pagamento',
      'waiting_payment': 'aguardando_pagamento',
      'paid': 'pago',
      'pago': 'pago',
      'approved': 'pago',
      'expired': 'expirado',
      'expirado': 'expirado',
      'failed': 'falhou',
      'falhou': 'falhou',
      'cancelled': 'falhou',
      'cancelado': 'falhou'
    };
    
    return statusMap[status.toLowerCase()] || 'aguardando_pagamento';
  }
  
  private mapWebhookEvent(event: string): 'cobranca.criada' | 'cobranca.paga' | 'cobranca.expirada' | 'cobranca.falhou' {
    const eventMap: Record<string, 'cobranca.criada' | 'cobranca.paga' | 'cobranca.expirada' | 'cobranca.falhou'> = {
      'charge.created': 'cobranca.criada',
      'cobranca.criada': 'cobranca.criada',
      'charge.paid': 'cobranca.paga',
      'cobranca.paga': 'cobranca.paga',
      'paid': 'cobranca.paga',
      'pago': 'cobranca.paga',
      'charge.expired': 'cobranca.expirada',
      'cobranca.expirada': 'cobranca.expirada',
      'expired': 'cobranca.expirada',
      'expirado': 'cobranca.expirada',
      'charge.failed': 'cobranca.falhou',
      'cobranca.falhou': 'cobranca.falhou',
      'failed': 'cobranca.falhou',
      'falhou': 'cobranca.falhou'
    };
    
    return eventMap[event.toLowerCase()] || 'cobranca.criada';
  }
  
  private handleApiError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    return new Error('Erro desconhecido na API do AbacatePay');
  }
}

// Instância singleton para uso global
export const abacatePayService = AbacatePayService.getInstance();

// Exportar tipos para uso em outros módulos
export type {
  CreateChargeRequest,
  ChargeResponse,
  PaymentStatusResponse,
  WebhookEvent
};