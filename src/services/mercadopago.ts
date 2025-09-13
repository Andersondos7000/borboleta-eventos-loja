import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: import.meta.env.VITE_MERCADO_PAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
    idempotencyKey: 'abc'
  }
});

const payment = new Payment(client);
const preference = new Preference(client);

export interface PaymentData {
  amount: number;
  description: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  orderId?: string;
}

export interface PaymentResponse {
  id: string;
  status: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  external_reference?: string;
}

export interface PreferenceData {
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
  }>;
  payer?: {
    name?: string;
    surname?: string;
    email?: string;
    phone?: {
      area_code?: string;
      number?: string;
    };
  };
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  auto_return?: 'approved' | 'all';
  external_reference?: string;
  notification_url?: string;
}

/**
 * Cria um pagamento PIX no Mercado Pago
 */
export async function createPixPayment(data: PaymentData): Promise<PaymentResponse> {
  try {
    const paymentData = {
      transaction_amount: data.amount / 100, // Converter centavos para reais
      description: data.description,
      payment_method_id: 'pix',
      payer: {
        email: data.customerEmail,
        first_name: data.customerName?.split(' ')[0] || 'Cliente',
        last_name: data.customerName?.split(' ').slice(1).join(' ') || 'Mercado Pago'
      },
      external_reference: data.orderId
    };

    const response = await payment.create({ body: paymentData });
    
    return {
      id: response.id!.toString(),
      status: response.status!,
      qr_code: response.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: response.point_of_interaction?.transaction_data?.ticket_url,
      external_reference: response.external_reference || undefined
    };
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    throw new Error('Falha ao criar pagamento PIX');
  }
}

/**
 * Cria uma preferência de pagamento (checkout)
 */
export async function createPaymentPreference(data: PreferenceData): Promise<any> {
  try {
    const preferenceData = {
      items: data.items.map(item => ({
        ...item,
        currency_id: item.currency_id || 'BRL'
      })),
      payer: data.payer,
      back_urls: data.back_urls,
      auto_return: data.auto_return,
      external_reference: data.external_reference,
      notification_url: data.notification_url
    };

    const response = await preference.create({ body: preferenceData });
    
    return {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      external_reference: response.external_reference
    };
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    throw new Error('Falha ao criar preferência de pagamento');
  }
}

/**
 * Consulta o status de um pagamento
 */
export async function getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
  try {
    const response = await payment.get({ id: paymentId });
    
    return {
      id: response.id!.toString(),
      status: response.status!,
      qr_code: response.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: response.point_of_interaction?.transaction_data?.ticket_url,
      external_reference: response.external_reference || undefined
    };
  } catch (error) {
    console.error('Erro ao consultar pagamento:', error);
    throw new Error('Falha ao consultar status do pagamento');
  }
}

/**
 * Mapeia status do Mercado Pago para status interno
 */
export function mapPaymentStatus(mpStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'approved': 'paid',
    'authorized': 'authorized',
    'in_process': 'processing',
    'in_mediation': 'in_mediation',
    'rejected': 'rejected',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'charged_back': 'charged_back'
  };

  return statusMap[mpStatus] || 'unknown';
}

/**
 * Valida webhook do Mercado Pago
 */
export function validateWebhook(signature: string, body: string, secret: string): boolean {
  // Implementar validação de webhook conforme documentação do Mercado Pago
  // Por enquanto, retorna true para desenvolvimento
  return true;
}

export default {
  createPixPayment,
  createPaymentPreference,
  getPaymentStatus,
  mapPaymentStatus,
  validateWebhook
};