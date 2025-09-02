/**
 * Hook customizado para gerenciar pagamentos PIX com AbacatePay
 * Baseado no guia de implementação oficial
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPayment, checkPaymentStatus, PaymentRequest, PaymentResponse, PaymentStatusResponse } from '../lib/abacatepay';

export interface UsePaymentOptions {
  onSuccess?: (data: PaymentResponse['data']) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  pollingInterval?: number; // em ms, padrão: 5000
  maxPollingAttempts?: number; // padrão: 120 (10 minutos)
}

export interface UsePaymentReturn {
  // Estados
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  paymentData: PaymentResponse['data'] | null;
  paymentStatus: string | null;
  timeRemaining: string | null;
  
  // Ações
  createPayment: (request: PaymentRequest) => Promise<void>;
  checkStatus: (orderId: string) => Promise<void>;
  startPolling: (orderId: string) => void;
  stopPolling: () => void;
  clearError: () => void;
  reset: () => void;
  
  // Utilitários
  copyPixCode: () => Promise<boolean>;
  downloadQRCode: () => void;
}

export function usePayment(options: UsePaymentOptions = {}): UsePaymentReturn {
  const {
    onSuccess,
    onError,
    onStatusChange,
    pollingInterval = 5000,
    maxPollingAttempts = 120
  } = options;

  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentResponse['data'] | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  // Refs para controle de polling
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptsRef = useRef(0);
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Função para criar pagamento
  const handleCreatePayment = useCallback(async (request: PaymentRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 Criando pagamento:', request);
      
      const response = await createPayment(request);
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao criar pagamento');
      }
      
      console.log('✅ Pagamento criado:', response.data);
      
      setPaymentData(response.data!);
      setPaymentStatus(response.data!.status);
      
      // Iniciar timer de expiração
      if (response.data?.expiresAt) {
        startExpirationTimer(response.data.expiresAt);
      }
      
      // Callback de sucesso
      onSuccess?.(response.data!);
      
      // Iniciar polling automático
      if (response.data?.orderId && response.data.status === 'pending') {
        startPolling(response.data.orderId);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('❌ Erro ao criar pagamento:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError]);

  // Função para verificar status
  const handleCheckStatus = useCallback(async (orderId: string) => {
    try {
      console.log('🔍 Verificando status do pagamento:', orderId);
      
      const response = await checkPaymentStatus(orderId);
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao verificar status');
      }
      
      const newStatus = response.data!.status;
      console.log('📊 Status atual:', newStatus);
      
      setPaymentStatus(newStatus);
      onStatusChange?.(newStatus);
      
      // Se pagamento foi aprovado ou expirou, parar polling
      if (newStatus === 'paid' || newStatus === 'expired' || newStatus === 'cancelled') {
        stopPolling();
        
        if (newStatus === 'paid') {
          console.log('🎉 Pagamento aprovado!');
          onSuccess?.(response.data!);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar status';
      console.error('❌ Erro ao verificar status:', errorMessage);
      setError(errorMessage);
    }
  }, [onSuccess, onStatusChange]);

  // Função para iniciar polling
  const startPolling = useCallback((orderId: string) => {
    console.log('🔄 Iniciando polling para:', orderId);
    
    setIsPolling(true);
    pollingAttemptsRef.current = 0;
    
    pollingIntervalRef.current = setInterval(async () => {
      pollingAttemptsRef.current += 1;
      
      console.log(`🔄 Polling attempt ${pollingAttemptsRef.current}/${maxPollingAttempts}`);
      
      if (pollingAttemptsRef.current >= maxPollingAttempts) {
        console.log('⏰ Máximo de tentativas de polling atingido');
        stopPolling();
        return;
      }
      
      await handleCheckStatus(orderId);
    }, pollingInterval);
  }, [handleCheckStatus, pollingInterval, maxPollingAttempts]);

  // Função para parar polling
  const stopPolling = useCallback(() => {
    console.log('⏹️ Parando polling');
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setIsPolling(false);
    pollingAttemptsRef.current = 0;
  }, []);

  // Timer de expiração
  const startExpirationTimer = useCallback((expiresAt: string) => {
    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiration = new Date(expiresAt).getTime();
      const diff = expiration - now;
      
      if (diff <= 0) {
        setTimeRemaining('Expirado');
        setPaymentStatus('expired');
        stopPolling();
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };
    
    // Atualizar imediatamente
    updateTimeRemaining();
    
    // Atualizar a cada segundo
    expirationTimerRef.current = setInterval(updateTimeRemaining, 1000);
  }, [stopPolling]);

  // Função para copiar código PIX
  const copyPixCode = useCallback(async (): Promise<boolean> => {
    if (!paymentData?.pixCode) {
      console.warn('⚠️ Código PIX não disponível');
      return false;
    }
    
    try {
      await navigator.clipboard.writeText(paymentData.pixCode);
      console.log('📋 Código PIX copiado para área de transferência');
      return true;
    } catch (err) {
      console.error('❌ Erro ao copiar código PIX:', err);
      return false;
    }
  }, [paymentData?.pixCode]);

  // Função para baixar QR Code
  const downloadQRCode = useCallback(() => {
    if (!paymentData?.qrCodeUrl) {
      console.warn('⚠️ QR Code não disponível');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = paymentData.qrCodeUrl;
      link.download = `qrcode-pix-${paymentData.orderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('💾 QR Code baixado');
    } catch (err) {
      console.error('❌ Erro ao baixar QR Code:', err);
    }
  }, [paymentData]);

  // Função para limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Função para resetar estado
  const reset = useCallback(() => {
    console.log('🔄 Resetando estado do pagamento');
    
    stopPolling();
    
    if (expirationTimerRef.current) {
      clearInterval(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
    
    setIsLoading(false);
    setError(null);
    setPaymentData(null);
    setPaymentStatus(null);
    setTimeRemaining(null);
  }, [stopPolling]);

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      stopPolling();
      if (expirationTimerRef.current) {
        clearInterval(expirationTimerRef.current);
      }
    };
  }, [stopPolling]);

  return {
    // Estados
    isLoading,
    isPolling,
    error,
    paymentData,
    paymentStatus,
    timeRemaining,
    
    // Ações
    createPayment: handleCreatePayment,
    checkStatus: handleCheckStatus,
    startPolling,
    stopPolling,
    clearError,
    reset,
    
    // Utilitários
    copyPixCode,
    downloadQRCode
  };
}

// Hook auxiliar para formatação de valores
export function usePaymentFormatters() {
  const formatCurrency = useCallback((amountInCents: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amountInCents / 100);
  }, []);
  
  const formatCPF = useCallback((cpf: string): string => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }, []);
  
  const formatPhone = useCallback((phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) {
      return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }, []);
  
  return {
    formatCurrency,
    formatCPF,
    formatPhone
  };
}

// Hook para validações
export function usePaymentValidators() {
  const validateCPF = useCallback((cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
      return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF[i]) * (10 - i);
    }
    
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    
    if (parseInt(cleanCPF[9]) !== digit) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF[i]) * (11 - i);
    }
    
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    
    return parseInt(cleanCPF[10]) === digit;
  }, []);
  
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);
  
  const validatePhone = useCallback((phone: string): boolean => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  }, []);
  
  const validateAmount = useCallback((amountInCents: number): boolean => {
    return amountInCents >= 100 && amountInCents <= 100000000; // R$ 1,00 a R$ 1.000.000,00
  }, []);
  
  return {
    validateCPF,
    validateEmail,
    validatePhone,
    validateAmount
  };
}