/**
 * Hook customizado para gerenciar pagamentos com AbacatePay
 * Integração completa com o serviço AbacatePayService
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AbacatePayService } from '../services/abacatepay.service';
import type {
  CreateChargeRequest,
  ChargeResponse,
  PaymentStatus,
  WebhookPayload
} from '../services/abacatepay.service';

export interface UseAbacatePaymentOptions {
  onSuccess?: (charge: ChargeResponse) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: PaymentStatus, charge: ChargeResponse) => void;
  pollingInterval?: number; // em ms, padrão: 3000
  maxPollingAttempts?: number; // padrão: 200 (10 minutos)
  autoStartPolling?: boolean; // padrão: true
}

export interface UseAbacatePaymentReturn {
  // Estados
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  charge: ChargeResponse | null;
  status: PaymentStatus | null;
  timeRemaining: string | null;
  expiresAt: Date | null;
  
  // Ações
  createCharge: (request: CreateChargeRequest) => Promise<void>;
  checkStatus: (chargeId: string) => Promise<void>;
  startPolling: (chargeId: string) => void;
  stopPolling: () => void;
  clearError: () => void;
  reset: () => void;
  
  // Utilitários PIX
  copyPixCode: () => Promise<boolean>;
  downloadQRCode: () => void;
  
  // Webhook
  processWebhook: (payload: WebhookPayload) => void;
}

export function useAbacatePayment(options: UseAbacatePaymentOptions = {}): UseAbacatePaymentReturn {
  const {
    onSuccess,
    onError,
    onStatusChange,
    pollingInterval = 3000,
    maxPollingAttempts = 200,
    autoStartPolling = true
  } = options;

  // Estados
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [charge, setCharge] = useState<ChargeResponse | null>(null);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Refs para controle
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingAttemptsRef = useRef(0);
  const expirationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentChargeIdRef = useRef<string | null>(null);

  // Instância do serviço
  const abacatePayService = useRef(new AbacatePayService()).current;

  // Função para criar cobrança
  const createCharge = useCallback(async (request: CreateChargeRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 [AbacatePay] Criando cobrança:', {
        valor: request.valor,
        cliente: request.cliente.nome,
        metodos: request.metodos
      });
      
      const result = await abacatePayService.createCharge(request);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const chargeData = result.data;
      console.log('✅ [AbacatePay] Cobrança criada:', {
        id: chargeData.id,
        status: chargeData.status,
        valor: chargeData.valor
      });
      
      setCharge(chargeData);
      setStatus(chargeData.status);
      currentChargeIdRef.current = chargeData.id;
      
      // Configurar expiração
      if (chargeData.expires_at) {
        const expirationDate = new Date(chargeData.expires_at);
        setExpiresAt(expirationDate);
        startExpirationTimer(expirationDate);
      }
      
      // Callback de sucesso
      onSuccess?.(chargeData);
      
      // Iniciar polling automático se status for aguardando_pagamento
      if (autoStartPolling && chargeData.status === 'aguardando_pagamento') {
        startPolling(chargeData.id);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao criar cobrança';
      console.error('❌ [AbacatePay] Erro ao criar cobrança:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [abacatePayService, onSuccess, onError, autoStartPolling]);

  // Função para verificar status
  const checkStatus = useCallback(async (chargeId: string) => {
    try {
      console.log('🔍 [AbacatePay] Verificando status:', chargeId);
      
      const result = await abacatePayService.getCharge(chargeId);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const chargeData = result.data;
      const newStatus = chargeData.status;
      
      console.log('📊 [AbacatePay] Status atual:', {
        id: chargeId,
        status: newStatus,
        anterior: status
      });
      
      // Atualizar estados
      setCharge(chargeData);
      setStatus(newStatus);
      
      // Callback de mudança de status
      if (newStatus !== status) {
        onStatusChange?.(newStatus, chargeData);
      }
      
      // Verificar se deve parar polling
      const finalStatuses: PaymentStatus[] = ['pago', 'expirado', 'falhou', 'cancelado'];
      if (finalStatuses.includes(newStatus)) {
        stopPolling();
        
        if (newStatus === 'pago') {
          console.log('🎉 [AbacatePay] Pagamento aprovado!');
          onSuccess?.(chargeData);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao verificar status';
      console.error('❌ [AbacatePay] Erro ao verificar status:', errorMessage);
      setError(errorMessage);
    }
  }, [abacatePayService, status, onStatusChange, onSuccess]);

  // Função para iniciar polling
  const startPolling = useCallback((chargeId: string) => {
    // Parar polling anterior se existir
    stopPolling();
    
    console.log('🔄 [AbacatePay] Iniciando polling:', chargeId);
    
    setIsPolling(true);
    pollingAttemptsRef.current = 0;
    currentChargeIdRef.current = chargeId;
    
    pollingIntervalRef.current = setInterval(async () => {
      pollingAttemptsRef.current += 1;
      
      console.log(`🔄 [AbacatePay] Polling ${pollingAttemptsRef.current}/${maxPollingAttempts}`);
      
      if (pollingAttemptsRef.current >= maxPollingAttempts) {
        console.log('⏰ [AbacatePay] Máximo de tentativas atingido');
        stopPolling();
        return;
      }
      
      await checkStatus(chargeId);
    }, pollingInterval);
  }, [checkStatus, pollingInterval, maxPollingAttempts]);

  // Função para parar polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('⏹️ [AbacatePay] Parando polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    setIsPolling(false);
    pollingAttemptsRef.current = 0;
  }, []);

  // Timer de expiração
  const startExpirationTimer = useCallback((expirationDate: Date) => {
    // Limpar timer anterior
    if (expirationTimerRef.current) {
      clearInterval(expirationTimerRef.current);
    }
    
    const updateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiration = expirationDate.getTime();
      const diff = expiration - now;
      
      if (diff <= 0) {
        setTimeRemaining('Expirado');
        setStatus('expirado');
        stopPolling();
        
        if (expirationTimerRef.current) {
          clearInterval(expirationTimerRef.current);
          expirationTimerRef.current = null;
        }
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };
    
    // Atualizar imediatamente
    updateTimeRemaining();
    
    // Atualizar a cada segundo
    expirationTimerRef.current = setInterval(updateTimeRemaining, 1000);
  }, [stopPolling]);

  // Função para copiar código PIX
  const copyPixCode = useCallback(async (): Promise<boolean> => {
    if (!charge?.pix?.copia_cola) {
      console.warn('⚠️ [AbacatePay] Código PIX não disponível');
      return false;
    }
    
    try {
      await navigator.clipboard.writeText(charge.pix.copia_cola);
      console.log('📋 [AbacatePay] Código PIX copiado');
      return true;
    } catch (err) {
      console.error('❌ [AbacatePay] Erro ao copiar código PIX:', err);
      return false;
    }
  }, [charge?.pix?.copia_cola]);

  // Função para baixar QR Code
  const downloadQRCode = useCallback(() => {
    if (!charge?.pix?.qr_code_url) {
      console.warn('⚠️ [AbacatePay] QR Code não disponível');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = charge.pix.qr_code_url;
      link.download = `qrcode-pix-${charge.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('💾 [AbacatePay] QR Code baixado');
    } catch (err) {
      console.error('❌ [AbacatePay] Erro ao baixar QR Code:', err);
    }
  }, [charge]);

  // Função para processar webhook
  const processWebhook = useCallback((payload: WebhookPayload) => {
    console.log('📨 [AbacatePay] Processando webhook:', {
      evento: payload.evento,
      cobranca_id: payload.dados.id
    });
    
    // Verificar se é da cobrança atual
    if (payload.dados.id === currentChargeIdRef.current) {
      const newStatus = payload.dados.status;
      
      setCharge(payload.dados);
      setStatus(newStatus);
      
      onStatusChange?.(newStatus, payload.dados);
      
      // Se pagamento foi aprovado, parar polling
      if (newStatus === 'pago') {
        stopPolling();
        onSuccess?.(payload.dados);
      }
    }
  }, [onStatusChange, onSuccess, stopPolling]);

  // Função para limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Função para resetar estado
  const reset = useCallback(() => {
    console.log('🔄 [AbacatePay] Resetando estado');
    
    stopPolling();
    
    if (expirationTimerRef.current) {
      clearInterval(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
    
    setIsLoading(false);
    setError(null);
    setCharge(null);
    setStatus(null);
    setTimeRemaining(null);
    setExpiresAt(null);
    currentChargeIdRef.current = null;
  }, [stopPolling]);

  // Cleanup ao desmontar
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
    charge,
    status,
    timeRemaining,
    expiresAt,
    
    // Ações
    createCharge,
    checkStatus,
    startPolling,
    stopPolling,
    clearError,
    reset,
    
    // Utilitários
    copyPixCode,
    downloadQRCode,
    
    // Webhook
    processWebhook
  };
}