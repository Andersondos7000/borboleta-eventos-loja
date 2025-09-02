/**
 * AbacatePay SDK - Cliente para integração com gateway de pagamento
 * Simplifica cobranças digitais com API intuitiva e transparente
 */

import { supabase } from './supabase';

export interface AbacatePayConfig {
  apiKey: string;
  environment: 'test' | 'live';
  baseUrl?: string;
}

export interface PaymentRequest {
  orderData: {
    firstName: string;
    lastName: string;
    email: string;
    cpf: string;
    phone?: string;
  };
  total: number;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  isTestUser?: boolean;
}

export interface PaymentResponse {
  success: boolean;
  orderId?: string;
  data?: {
    id: string;
    orderId: string;
    qrCode: string;
    payload: string;
    transactionId: string;
    amount: number;
    expiresAt: string;
    status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'FAILED';
  };
  error?: string;
}

export interface PixPaymentData {
  qrCode: string;
  payload: string;
  transactionId: string;
  amount: number;
  expiresAt: string;
  status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'FAILED';
}

export interface CreatePaymentRequest {
  amount: number; // Valor em centavos
  description: string;
  customer: {
    name: string;
    email: string;
    cellphone: string;
    taxId: string; // CPF/CNPJ
  };
  expiresIn?: number; // Tempo de expiração em segundos (padrão: 3600)
  metadata?: Record<string, any>;
}

export interface PaymentStatusResponse {
  success: boolean;
  data?: {
    status: 'PENDING' | 'APPROVED' | 'EXPIRED' | 'FAILED';
    transactionId: string;
    amount: number;
    paidAt?: string;
    expiresAt: string;
  };
  error?: string;
}

/**
 * Cria um pagamento usando a função consolidada abacatepay-manager
 */
export const createPayment = async (request: PaymentRequest): Promise<PaymentResponse> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    const { data: paymentResponse, error } = await supabase.functions.invoke('abacatepay-manager', {
      headers: {
        Authorization: `Bearer ${session?.session?.access_token}`
      },
      body: {
        orderData: request.orderData,
        total: request.total,
        items: request.items,
        isTestUser: request.isTestUser || false
      }
    });
    
    if (error) {
      console.error('Erro ao criar pagamento:', error);
      return {
        success: false,
        error: error.message || 'Erro ao criar pagamento'
      };
    }
    
    return paymentResponse || {
      success: false,
      error: 'Resposta inválida do servidor'
    };
  } catch (err) {
    console.error('Erro ao criar pagamento:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
};

/**
 * Verifica o status de um pagamento usando a função consolidada abacatepay-manager
 */
export const checkPaymentStatus = async (transactionId: string): Promise<PaymentStatusResponse> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    const { data: statusResponse, error } = await supabase.functions.invoke('abacatepay-manager', {
      headers: {
        Authorization: `Bearer ${session?.session?.access_token}`
      },
      body: {
        action: 'check',
        transactionId
      }
    });
    
    if (error) {
      console.error('Erro ao verificar status:', error);
      return {
        success: false,
        error: error.message || 'Erro ao verificar status'
      };
    }
    
    return statusResponse || {
      success: false,
      error: 'Resposta inválida do servidor'
    };
  } catch (err) {
    console.error('Erro ao verificar status:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
};


export class AbacatePaySDK {
  private config: AbacatePayConfig;
  private baseUrl: string;

  constructor(config: AbacatePayConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.abacatepay.com/v1';
  }

  /**
   * Cria uma cobrança PIX com QR Code
   */
  async createPixPayment(request: CreatePaymentRequest): Promise<PixPaymentData> {
    const response = await this.makeRequest('/pixQrCode/create', {
      method: 'POST',
      body: JSON.stringify({
        amount: request.amount,
        description: request.description,
        customer: request.customer,
        expiresIn: request.expiresIn || 3600,
        metadata: request.metadata || {}
      })
    });

    if (!response.success) {
      throw new Error(response.error || 'Erro ao criar pagamento PIX');
    }

    return response.data;
  }

  /**
   * Verifica o status de um pagamento PIX
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    const response = await this.makeRequest(`/pixQrCode/check?transactionId=${transactionId}`, {
      method: 'GET'
    });

    if (!response.success) {
      throw new Error(response.error || 'Erro ao verificar status do pagamento');
    }

    return response;
  }

  /**
   * Formata valor em centavos para exibição em reais
   */
  static formatCurrency(amountInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }

  /**
   * Valida CPF
   */
  static validateCPF(cpf: string): boolean {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

    return true;
  }

  /**
   * Formata tempo restante para expiração
   */
  static formatTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expirado';
    
    const seconds = Math.floor(diff / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  }

  /**
   * Faz requisição para a API do AbacatePay
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return await response.json();
  }
}

// Instância padrão para uso no projeto
export const abacatePaySDK = new AbacatePaySDK({
  apiKey: import.meta.env.VITE_ABACATE_PAY_API_KEY || '',
  environment: import.meta.env.VITE_ENVIRONMENT === 'production' ? 'live' : 'test'
});

// Tipos de status de pagamento
export const PaymentStatus = {
  PENDING: 'PENDING' as const,
  APPROVED: 'APPROVED' as const,
  EXPIRED: 'EXPIRED' as const,
  FAILED: 'FAILED' as const
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

// Utilitários para trabalhar com PIX
export const PixUtils = {
  /**
   * Gera um QR Code data URL a partir do payload PIX
   */
  generateQRCodeDataURL: async (payload: string): Promise<string> => {
    // Esta função seria implementada com uma biblioteca de QR Code
    // Por enquanto, retorna uma URL de placeholder
    return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12">QR Code PIX</text></svg>`)}`;
  },

  /**
   * Copia texto para a área de transferência
   */
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Erro ao copiar para área de transferência:', error);
      return false;
    }
  },

  /**
   * Valida se uma string é um payload PIX válido
   */
  isValidPixPayload: (payload: string): boolean => {
    return payload.startsWith('00020126') && payload.length >= 100;
  }
};