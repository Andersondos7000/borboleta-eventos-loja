import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Tipo para resultado com tratamento de erro obrigatório
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

// Status de conexão
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';

// Interface para configuração do hook
export interface RealtimeSyncOptions<T> {
  table: string;
  filter?: string;
  select?: string;
  orderBy?: string;
  limit?: number;
  enableOptimistic?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onUpdate?: (data: T) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

// Interface para retorno do hook
export interface RealtimeSyncReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  subscribe: () => void;
  unsubscribe: () => void;
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  optimisticUpdate: (item: Partial<T> & { id: string }, operation: 'insert' | 'update' | 'delete') => void;
  rollbackOptimistic: (id: string) => void;
  metrics: {
    totalUpdates: number;
    lastUpdate: Date | null;
    reconnectCount: number;
  };
}

// Interface para configuração do hook (compatibilidade)
interface UseRealtimeSyncOptions<T> extends RealtimeSyncOptions<T> {}

// Interface para retorno do hook (compatibilidade)
interface UseRealtimeSyncReturn<T> extends RealtimeSyncReturn<T> {}

/**
 * Hook principal para sincronização em tempo real com Supabase
 * Implementa padrões obrigatórios do PRD com tratamento robusto de erros
 */
export function useRealtimeSync<T = any>(options: UseRealtimeSyncOptions<T>): UseRealtimeSyncReturn<T> {
  const {
    table,
    filter,
    select = '*',
    orderBy,
    limit,
    enableOptimistic = true,
    enableRetry = true,
    maxRetries = 3,
    retryDelay = 1000,
    onUpdate,
    onError,
    onConnectionChange
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [optimisticData, setOptimisticData] = useState<Map<string, { item: Partial<T> & { id: string }, operation: 'insert' | 'update' | 'delete' }>>(new Map());
  const [metrics, setMetrics] = useState({
    totalUpdates: 0,
    lastUpdate: null as Date | null,
    reconnectCount: 0
  });
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para atualizar status de conexão
  const updateConnectionStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    setIsConnected(status === 'connected');
    onConnectionChange?.(status);
  }, [onConnectionChange]);

  // Função para buscar dados iniciais
  const fetchInitialData = useCallback(async (): Promise<Result<T[], Error>> => {
    try {
      setLoading(true);
      setError(null);
      updateConnectionStatus('connecting');
      
      let query = supabase.from(table).select(select);
      
      if (filter) {
        // Aplicar filtros dinâmicos
        const filterParts = filter.split(',');
        filterParts.forEach(filterPart => {
          const [column, operator, value] = filterPart.split('.');
          if (column && operator && value) {
            query = query.filter(column, operator, value);
          }
        });
      }
      
      if (orderBy) {
        const [column, ascending = 'asc'] = orderBy.split(':');
        query = query.order(column, { ascending: ascending === 'asc' });
      }
      
      if (limit) {
        query = query.limit(limit);
      }

      const { data: fetchedData, error: fetchError } = await query;
      
      if (fetchError) {
        throw new Error(`Erro ao buscar dados da tabela ${table}: ${fetchError.message}`);
      }

      setData(fetchedData || []);
      updateConnectionStatus('connected');
      retryCountRef.current = 0; // Reset retry count on success
      return { success: true, data: fetchedData || [] };
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro desconhecido ao buscar dados');
      setError(error);
      updateConnectionStatus('error');
      onError?.(error);
      
      // Retry logic
      if (enableRetry && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        updateConnectionStatus('reconnecting');
        setMetrics(prev => ({ ...prev, reconnectCount: prev.reconnectCount + 1 }));
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchInitialData();
        }, retryDelay * retryCountRef.current);
      }
      
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  }, [table, select, filter, orderBy, limit, onError, enableRetry, maxRetries, retryDelay, updateConnectionStatus]);

  // Função para optimistic updates
  const optimisticUpdate = useCallback((item: Partial<T> & { id: string }, operation: 'insert' | 'update' | 'delete') => {
    if (!enableOptimistic) return;
    
    const optimisticId = `optimistic_${item.id}_${Date.now()}`;
    
    setOptimisticData(prev => new Map(prev.set(optimisticId, { item, operation })));
    
    setData(currentData => {
      let updatedData = [...currentData];
      
      switch (operation) {
        case 'insert':
          updatedData.push({ ...item, __optimistic: true } as T);
          break;
          
        case 'update':
          const updateIndex = updatedData.findIndex((data: any) => data.id === item.id);
          if (updateIndex !== -1) {
            updatedData[updateIndex] = { ...updatedData[updateIndex], ...item, __optimistic: true };
          }
          break;
          
        case 'delete':
          updatedData = updatedData.filter((data: any) => data.id !== item.id);
          break;
      }
      
      return updatedData;
    });
    
    // Auto-rollback após 5 segundos se não confirmado
    setTimeout(() => {
      rollbackOptimistic(optimisticId);
    }, 5000);
    
  }, [enableOptimistic]);
  
  // Função para rollback de optimistic updates
  const rollbackOptimistic = useCallback((optimisticId: string) => {
    const optimisticItem = optimisticData.get(optimisticId);
    if (!optimisticItem) return;
    
    setOptimisticData(prev => {
      const newMap = new Map(prev);
      newMap.delete(optimisticId);
      return newMap;
    });
    
    // Refetch data to ensure consistency
    fetchInitialData();
  }, [optimisticData, fetchInitialData]);

  // Função para processar mudanças em tempo real
  const handleRealtimeChange = useCallback((payload: RealtimePostgresChangesPayload<T>) => {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      // Remove optimistic updates confirmados
      if (newRecord && (newRecord as any).id) {
        setOptimisticData(prev => {
          const newMap = new Map(prev);
          for (const [key, value] of prev.entries()) {
            if (value.item.id === (newRecord as any).id) {
              newMap.delete(key);
            }
          }
          return newMap;
        });
      }
      
      setData(currentData => {
        let updatedData = [...currentData];
        
        switch (eventType) {
          case 'INSERT':
            if (newRecord) {
              // Evita duplicatas e remove versões otimistas
              updatedData = updatedData.filter((item: any) => 
                item.id !== (newRecord as any).id || item.__optimistic
              );
              updatedData.push(newRecord);
            }
            break;
            
          case 'UPDATE':
            if (newRecord) {
              const index = updatedData.findIndex((item: any) => item.id === (newRecord as any).id);
              if (index !== -1) {
                updatedData[index] = newRecord;
              }
            }
            break;
            
          case 'DELETE':
            if (oldRecord) {
              updatedData = updatedData.filter((item: any) => item.id !== (oldRecord as any).id);
            }
            break;
        }
        
        return updatedData;
      });
      
      // Atualizar métricas
      setMetrics(prev => ({
        ...prev,
        totalUpdates: prev.totalUpdates + 1,
        lastUpdate: new Date()
      }));
      
      // Callback personalizado para mudanças
      if (newRecord) {
        onUpdate?.(newRecord as T);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao processar mudança em tempo real');
      setError(error);
      onError?.(error);
    }
  }, [enableOptimistic, onUpdate, onError]);

  // Função para se inscrever no canal realtime
  const subscribe = useCallback(() => {
    if (isSubscribedRef.current || channelRef.current) {
      return;
    }

    try {
      const channelName = `realtime:${table}${filter ? `:${filter}` : ''}`;
      const channel = supabase.channel(channelName);
      
      // Configurar listener para mudanças na tabela
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          ...(filter && { filter })
        },
        handleRealtimeChange
      );
      
      // Configurar listeners de status da conexão
      channel.on('system', {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (payload.status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          const error = new Error(`Erro no canal realtime: ${payload.message || 'Desconhecido'}`);
          setError(error);
          onError?.(error);
        }
      });
      
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          isSubscribedRef.current = true;
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          isSubscribedRef.current = false;
        }
      });
      
      channelRef.current = channel;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao se inscrever no canal realtime');
      setError(error);
      setIsConnected(false);
      onError?.(error);
    }
  }, [table, filter, handleRealtimeChange, onError]);

  // Função para cancelar inscrição
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      isSubscribedRef.current = false;
      setIsConnected(false);
    }
  }, []);

  // Função para recarregar dados
  const refetch = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Efeito para inicialização
  useEffect(() => {
    fetchInitialData();
    subscribe();
    
    return () => {
      unsubscribe();
    };
  }, [fetchInitialData, subscribe, unsubscribe]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      unsubscribe();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [unsubscribe]);
  
  // Cleanup de timeouts quando componente desmonta
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    subscribe,
    unsubscribe,
    isConnected,
    connectionStatus,
    optimisticUpdate,
    rollbackOptimistic,
    metrics
  };
}

// Hook para status de conexão e métricas
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  
  useEffect(() => {
    // Monitorar status da conexão Supabase
    const checkConnection = async () => {
      const startTime = Date.now();
      try {
        const { error } = await supabase.from('products').select('id').limit(1);
        const endTime = Date.now();
        
        if (!error) {
          setIsConnected(true);
          setLatency(endTime - startTime);
          setLastSync(new Date());
          setReconnectAttempts(0);
        } else {
          setIsConnected(false);
          setReconnectAttempts(prev => prev + 1);
        }
      } catch {
        setIsConnected(false);
        setReconnectAttempts(prev => prev + 1);
      }
    };
    
    // Verificar conexão a cada 30 segundos
    const interval = setInterval(checkConnection, 30000);
    checkConnection(); // Verificação inicial
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    isConnected,
    latency,
    reconnectAttempts,
    lastSync
  };
}