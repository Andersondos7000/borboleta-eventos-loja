import { useState, useCallback } from 'react';
import { 
  createPixPayment, 
  createPaymentPreference, 
  getPaymentStatus,
  PaymentData,
  PaymentResponse,
  PreferenceData
} from '@/services/mercadopago';
import { useToast } from '@/hooks/use-toast';

export interface UseMercadoPagoReturn {
  // Estados
  isLoading: boolean;
  error: string | null;
  paymentData: PaymentResponse | null;
  preferenceData: any | null;
  
  // Funções
  createPix: (data: PaymentData) => Promise<PaymentResponse | null>;
  createPreference: (data: PreferenceData) => Promise<any | null>;
  checkPaymentStatus: (paymentId: string) => Promise<PaymentResponse | null>;
  clearError: () => void;
  reset: () => void;
}

export function useMercadoPago(): UseMercadoPagoReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
  const [preferenceData, setPreferenceData] = useState<any | null>(null);
  const { toast } = useToast();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setPaymentData(null);
    setPreferenceData(null);
  }, []);

  const createPix = useCallback(async (data: PaymentData): Promise<PaymentResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await createPixPayment(data);
      setPaymentData(response);
      
      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código PIX para pagar.",
        variant: "default"
      });
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast({
        title: "Erro ao gerar PIX",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const createPreference = useCallback(async (data: PreferenceData): Promise<any | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await createPaymentPreference(data);
      setPreferenceData(response);
      
      toast({
        title: "Checkout criado com sucesso!",
        description: "Redirecionando para o pagamento...",
        variant: "default"
      });
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast({
        title: "Erro ao criar checkout",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const checkPaymentStatus = useCallback(async (paymentId: string): Promise<PaymentResponse | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await getPaymentStatus(paymentId);
      setPaymentData(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      
      toast({
        title: "Erro ao consultar pagamento",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    error,
    paymentData,
    preferenceData,
    createPix,
    createPreference,
    checkPaymentStatus,
    clearError,
    reset
  };
}

/**
 * Hook para monitorar status de pagamento em tempo real
 */
export function usePaymentMonitor(paymentId: string | null, intervalMs: number = 5000) {
  const [status, setStatus] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { checkPaymentStatus } = useMercadoPago();

  const startMonitoring = useCallback(() => {
    if (!paymentId) return;
    
    setIsMonitoring(true);
    
    const interval = setInterval(async () => {
      const response = await checkPaymentStatus(paymentId);
      if (response) {
        setStatus(response.status);
        
        // Parar monitoramento se pagamento foi aprovado ou rejeitado
        if (['approved', 'rejected', 'cancelled'].includes(response.status)) {
          setIsMonitoring(false);
          clearInterval(interval);
        }
      }
    }, intervalMs);

    return () => {
      clearInterval(interval);
      setIsMonitoring(false);
    };
  }, [paymentId, intervalMs, checkPaymentStatus]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  return {
    status,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
}

export default useMercadoPago;