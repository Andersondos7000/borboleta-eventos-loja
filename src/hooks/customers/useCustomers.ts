import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRealtimeSync } from '../realtime/useRealtimeSync';
import { useOfflineFirst } from '../realtime/useOfflineFirst';
import type { Customer, CustomerFilters, CustomerSortOptions } from '../../types/customer';

interface UseCustomersOptions {
  filters?: CustomerFilters;
  sortBy?: CustomerSortOptions;
  limit?: number;
  realtime?: boolean;
}

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  // Actions
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  createCustomer: (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  // Realtime status
  syncStatus: 'synced' | 'pending' | 'conflict' | 'offline';
  conflictCount: number;
}

export const useCustomers = ({
  filters = {},
  sortBy = { field: 'created_at', direction: 'desc' },
  limit = 50,
  realtime = true
}: UseCustomersOptions = {}): UseCustomersReturn => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);

  // Offline-first hook para cache e sincronização
  const {
    data: cachedCustomers,
    syncStatus,
    conflictCount,
    updateCache,
    clearCache
  } = useOfflineFirst<Customer[]>({
    key: `customers_${JSON.stringify({ filters, sortBy })}`,
    initialData: [],
    syncInterval: 30000 // 30 segundos
  });

  // Realtime sync para atualizações em tempo real
  const { isConnected } = useRealtimeSync({
    table: 'customers',
    filter: buildRealtimeFilter(filters),
    onUpdate: handleRealtimeUpdate,
    onError: (err) => setError(err.message),
    enabled: realtime
  });

  // Construir filtro para realtime
  function buildRealtimeFilter(filters: CustomerFilters): string {
    const conditions: string[] = [];
    
    if (filters.status) {
      conditions.push(`status=eq.${filters.status}`);
    }
    if (filters.customerType) {
      conditions.push(`customer_type=eq.${filters.customerType}`);
    }
    if (filters.userId) {
      conditions.push(`user_id=eq.${filters.userId}`);
    }
    
    return conditions.join('&');
  }

  // Handler para atualizações realtime
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setCustomers(current => {
      switch (eventType) {
        case 'INSERT':
          // Verificar se já existe para evitar duplicatas
          if (current.find(c => c.id === newRecord.id)) {
            return current;
          }
          return [newRecord, ...current];
          
        case 'UPDATE':
          return current.map(customer => 
            customer.id === newRecord.id ? newRecord : customer
          );
          
        case 'DELETE':
          return current.filter(customer => customer.id !== oldRecord.id);
          
        default:
          return current;
      }
    });
    
    // Atualizar cache offline
    updateCache(customers => {
      switch (eventType) {
        case 'INSERT':
          return [newRecord, ...customers];
        case 'UPDATE':
          return customers.map(c => c.id === newRecord.id ? newRecord : c);
        case 'DELETE':
          return customers.filter(c => c.id !== oldRecord.id);
        default:
          return customers;
      }
    });
  }, [updateCache]);

  // Buscar clientes do servidor
  const fetchCustomers = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentOffset = reset ? 0 : offset;
      
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .range(currentOffset, currentOffset + limit - 1)
        .order(sortBy.field, { ascending: sortBy.direction === 'asc' });
      
      // Aplicar filtros
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.customerType) {
        query = query.eq('customer_type', filters.customerType);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      const { data, error: fetchError, count } = await query;
      
      if (fetchError) throw fetchError;
      
      if (reset) {
        setCustomers(data || []);
        setOffset(limit);
      } else {
        setCustomers(current => [...current, ...(data || [])]);
        setOffset(current => current + limit);
      }
      
      setTotalCount(count || 0);
      
      // Atualizar cache
      updateCache(data || []);
      
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      
      // Em caso de erro, usar dados do cache se disponível
      if (cachedCustomers.length > 0) {
        setCustomers(cachedCustomers);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, limit, offset, updateCache, cachedCustomers]);

  // Refetch (reset)
  const refetch = useCallback(async () => {
    setOffset(0);
    await fetchCustomers(true);
  }, [fetchCustomers]);

  // Load more
  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchCustomers(false);
    }
  }, [fetchCustomers, loading]);

  // Criar cliente
  const createCustomer = useCallback(async (data: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert([{
          ...data,
          user_id: data.user_id || (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();
      
      if (createError) throw createError;
      
      return newCustomer;
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
      throw err;
    }
  }, []);

  // Atualizar cliente
  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>) => {
    try {
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      return updatedCustomer;
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err);
      throw err;
    }
  }, []);

  // Deletar cliente
  const deleteCustomer = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
    } catch (err) {
      console.error('Erro ao deletar cliente:', err);
      throw err;
    }
  }, []);

  // Calcular se há mais dados
  const hasMore = customers.length < totalCount;

  // Carregar dados iniciais
  useEffect(() => {
    fetchCustomers(true);
  }, [filters, sortBy]);

  // Usar dados do cache quando offline
  useEffect(() => {
    if (!isConnected && cachedCustomers.length > 0) {
      setCustomers(cachedCustomers);
    }
  }, [isConnected, cachedCustomers]);

  return {
    customers,
    loading,
    error,
    totalCount,
    hasMore,
    refetch,
    loadMore,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    syncStatus: !isConnected ? 'offline' : syncStatus,
    conflictCount
  };
};