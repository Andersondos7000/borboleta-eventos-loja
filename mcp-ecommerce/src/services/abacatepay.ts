import axios from 'axios';

export interface AbacatePayPixRequest {
  amount: number;
  description: string;
  external_id?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
  };
  metadata?: Record<string, any>;
}

export interface AbacatePayPixResponse {
  // Propriedades principais
  id: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired' | 'PENDING' | 'PAID' | 'EXPIRED';
  amount: number;
  description: string;
  external_id?: string;
  
  // Códigos PIX - diferentes formatos suportados
  pix_code?: string;
  pix_qr_code?: string;
  brCode?: string; // Código copia-e-cola
  brCodeBase64?: string; // QR Code em base64
  
  // URLs e dados adicionais
  qr_code?: string;
  qr_code_url?: string;
  url?: string;
  billingUrl?: string;
  
  // Datas
  expires_at?: string;
  expiresAt?: string; // Alias para expires_at
  created_at: string;
  updated_at?: string;
  paid_at?: string;
  
  // Dados do cliente
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    cellphone?: string;
    document?: string;
    taxId?: string; // CPF - alias para document
  };
  
  // Metadados e configurações
  metadata?: Record<string, any>;
  devMode?: boolean;
  platformFee?: number;
  
  // Estrutura aninhada para compatibilidade com diferentes APIs
  data?: {
    id?: string;
    amount?: number;
    status?: string;
    brCode?: string;
    brCodeBase64?: string;
    expiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  
  // Estrutura PIX aninhada para compatibilidade
  pix?: {
    qr_code: string;
    qr_code_url: string;
    expires_at: string;
  };
  
  // Campos de formatação
  valor?: number;
  valorFormatado?: string;
  descricao?: string;
  
  // Tratamento de erros
  error?: any;
}

export interface AbacatePayWebhook {
  id: string;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  amount: number;
  external_id?: string;
  paid_at?: string;
  metadata?: Record<string, any>;
}

export class AbacatePayService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ABACATE_PAY_API_KEY || '';
    this.baseUrl = 'https://api.abacatepay.com/v1';
    
    if (!this.apiKey) {
      throw new Error('AbacatePay API Key é obrigatória');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createPixPayment(request: AbacatePayPixRequest): Promise<AbacatePayPixResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/billing/pix`,
        request,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro AbacatePay: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string): Promise<AbacatePayPixResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/billing/pix/${paymentId}`,
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao buscar status do pagamento:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro AbacatePay: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  async cancelPayment(paymentId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/billing/pix/${paymentId}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Erro AbacatePay: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  validateWebhook(payload: any): AbacatePayWebhook {
    // Validação básica do webhook
    if (!payload.id || !payload.status || !payload.amount) {
      throw new Error('Payload do webhook inválido');
    }

    return payload as AbacatePayWebhook;
  }
}