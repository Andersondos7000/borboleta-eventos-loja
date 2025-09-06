/**
 * Hook para gerenciar webhooks do AbacatePay
 * Centraliza o processamento de eventos de webhook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AbacatePayService } from '../services/abacatepay.service';
import type { WebhookPayload, PaymentStatus } from '../services/abacatepay.service';

export interface WebhookEvent {
  id: string;
  timestamp: Date;
  evento: string;
  cobranca_id: string;
  status: PaymentStatus;
  processed: boolean;
}

export interface UseAbacateWebhookOptions {
  onWebhookReceived?: (payload: WebhookPayload) => void;
  onPaymentStatusChange?: (chargeId: string, status: PaymentStatus) => void;
  onError?: (error: string) => void;
  maxEvents?: number; // máximo de eventos para manter no histórico
}

export interface UseAbacateWebhookReturn {
  // Estados
  events: WebhookEvent[];
  isProcessing: boolean;
  error: string | null;
  lastEvent: WebhookEvent | null;
  
  // Ações
  processWebhook: (payload: WebhookPayload, signature?: string) => Promise<boolean>;
  validateWebhook: (payload: string, signature: string) => boolean;
  clearEvents: () => void;
  clearError: () => void;
  
  // Utilitários
  getEventsByChargeId: (chargeId: string) => WebhookEvent[];
  getLatestEventForCharge: (chargeId: string) => WebhookEvent | null;
}

export function useAbacateWebhook(options: UseAbacateWebhookOptions = {}): UseAbacateWebhookReturn {
  const {
    onWebhookReceived,
    onPaymentStatusChange,
    onError,
    maxEvents = 100
  } = options;

  // Estados
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<WebhookEvent | null>(null);

  // Instância do serviço
  const abacatePayService = useRef(new AbacatePayService()).current;

  // Função para validar webhook
  const validateWebhook = useCallback((payload: string, signature: string): boolean => {
    try {
      return abacatePayService.validateWebhook(payload, signature);
    } catch (err) {
      console.error('❌ [Webhook] Erro na validação:', err);
      return false;
    }
  }, [abacatePayService]);

  // Função para processar webhook
  const processWebhook = useCallback(async (payload: WebhookPayload, signature?: string): Promise<boolean> => {
    try {
      setIsProcessing(true);
      setError(null);
      
      console.log('📨 [Webhook] Processando evento:', {
        evento: payload.evento,
        cobranca_id: payload.dados.id,
        status: payload.dados.status,
        timestamp: payload.timestamp
      });
      
      // Validar assinatura se fornecida
      if (signature) {
        const isValid = validateWebhook(JSON.stringify(payload), signature);
        if (!isValid) {
          throw new Error('Assinatura do webhook inválida');
        }
        console.log('✅ [Webhook] Assinatura validada');
      }
      
      // Criar evento
      const webhookEvent: WebhookEvent = {
        id: `${payload.dados.id}_${Date.now()}`,
        timestamp: new Date(payload.timestamp),
        evento: payload.evento,
        cobranca_id: payload.dados.id,
        status: payload.dados.status,
        processed: true
      };
      
      // Adicionar ao histórico
      setEvents(prevEvents => {
        const newEvents = [webhookEvent, ...prevEvents];
        // Manter apenas os últimos N eventos
        return newEvents.slice(0, maxEvents);
      });
      
      setLastEvent(webhookEvent);
      
      // Callbacks
      onWebhookReceived?.(payload);
      onPaymentStatusChange?.(payload.dados.id, payload.dados.status);
      
      console.log('✅ [Webhook] Evento processado com sucesso');
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao processar webhook';
      console.error('❌ [Webhook] Erro no processamento:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [validateWebhook, maxEvents, onWebhookReceived, onPaymentStatusChange, onError]);

  // Função para obter eventos por ID da cobrança
  const getEventsByChargeId = useCallback((chargeId: string): WebhookEvent[] => {
    return events.filter(event => event.cobranca_id === chargeId);
  }, [events]);

  // Função para obter último evento de uma cobrança
  const getLatestEventForCharge = useCallback((chargeId: string): WebhookEvent | null => {
    const chargeEvents = getEventsByChargeId(chargeId);
    return chargeEvents.length > 0 ? chargeEvents[0] : null;
  }, [getEventsByChargeId]);

  // Função para limpar eventos
  const clearEvents = useCallback(() => {
    console.log('🗑️ [Webhook] Limpando histórico de eventos');
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Função para limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Estados
    events,
    isProcessing,
    error,
    lastEvent,
    
    // Ações
    processWebhook,
    validateWebhook,
    clearEvents,
    clearError,
    
    // Utilitários
    getEventsByChargeId,
    getLatestEventForCharge
  };
}

// Hook para escutar webhooks via WebSocket (opcional)
export function useAbacateWebhookListener(options: {
  endpoint?: string;
  onWebhook?: (payload: WebhookPayload) => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
}) {
  const { endpoint, onWebhook, onError, autoConnect = false } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const connect = useCallback(() => {
    if (!endpoint) {
      console.warn('⚠️ [WebhookListener] Endpoint não configurado');
      return;
    }
    
    try {
      console.log('🔌 [WebhookListener] Conectando ao WebSocket:', endpoint);
      
      wsRef.current = new WebSocket(endpoint);
      
      wsRef.current.onopen = () => {
        console.log('✅ [WebhookListener] Conectado');
        setIsConnected(true);
        setConnectionError(null);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const payload: WebhookPayload = JSON.parse(event.data);
          console.log('📨 [WebhookListener] Webhook recebido via WebSocket');
          onWebhook?.(payload);
        } catch (err) {
          console.error('❌ [WebhookListener] Erro ao parsear webhook:', err);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ [WebhookListener] Erro na conexão:', error);
        const errorMessage = 'Erro na conexão WebSocket';
        setConnectionError(errorMessage);
        onError?.(errorMessage);
      };
      
      wsRef.current.onclose = () => {
        console.log('🔌 [WebhookListener] Conexão fechada');
        setIsConnected(false);
      };
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar WebSocket';
      console.error('❌ [WebhookListener] Erro:', errorMessage);
      setConnectionError(errorMessage);
      onError?.(errorMessage);
    }
  }, [endpoint, onWebhook, onError]);
  
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      console.log('🔌 [WebhookListener] Desconectando');
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);
  
  // Auto-conectar se habilitado
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);
  
  return {
    isConnected,
    connectionError,
    connect,
    disconnect
  };
}