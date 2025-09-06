/**
 * Hook para gerenciar múltiplas cobranças do AbacatePay
 * Listagem, filtros e operações em lote
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AbacatePayService } from '../services/abacatepay.service';
import type {
  ChargeResponse,
  PaymentStatus,
  ListChargesRequest,
  ListChargesResponse
} from '../services/abacatepay.service';

export interface ChargeFilter {
  status?: PaymentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  customerEmail?: string;
  customerCpf?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface UseAbacateChargesOptions {
  autoLoad?: boolean;
  pageSize?: number;
  refreshInterval?: number; // em ms, 0 para desabilitar
  onError?: (error: string) => void;
}

export interface UseAbacateChargesReturn {
  // Estados
  charges: ChargeResponse[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Filtros
  filters: ChargeFilter;
  
  // Ações
  loadCharges: (page?: number, filters?: ChargeFilter) => Promise<void>;
  refreshCharges: () => Promise<void>;
  setFilters: (filters: ChargeFilter) => void;
  clearFilters: () => void;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  
  // Operações individuais
  getChargeById: (id: string) => ChargeResponse | null;
  updateChargeInList: (charge: ChargeResponse) => void;
  removeChargeFromList: (id: string) => void;
  
  // Utilitários
  getChargesByStatus: (status: PaymentStatus) => ChargeResponse[];
  getTotalByStatus: (status: PaymentStatus) => number;
  getRevenueTotal: () => number;
  
  // Controle
  clearError: () => void;
  reset: () => void;
}

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_FILTERS: ChargeFilter = {};

export function useAbacateCharges(options: UseAbacateChargesOptions = {}): UseAbacateChargesReturn {
  const {
    autoLoad = true,
    pageSize = DEFAULT_PAGE_SIZE,
    refreshInterval = 0,
    onError
  } = options;

  // Estados
  const [charges, setCharges] = useState<ChargeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFiltersState] = useState<ChargeFilter>(DEFAULT_FILTERS);

  // Refs
  const abacatePayService = useRef(new AbacatePayService()).current;
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cálculos derivados
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Função para carregar cobranças
  const loadCharges = useCallback(async (page = 1, newFilters?: ChargeFilter) => {
    try {
      const isInitialLoad = charges.length === 0;
      
      if (isInitialLoad) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      setError(null);
      
      const activeFilters = newFilters || filters;
      
      console.log('📋 [AbacateCharges] Carregando cobranças:', {
        page,
        pageSize,
        filters: activeFilters
      });
      
      // Preparar request
      const request: ListChargesRequest = {
        page,
        limit: pageSize,
        ...(activeFilters.status?.length && { status: activeFilters.status }),
        ...(activeFilters.dateFrom && { created_after: activeFilters.dateFrom.toISOString() }),
        ...(activeFilters.dateTo && { created_before: activeFilters.dateTo.toISOString() }),
        ...(activeFilters.customerEmail && { customer_email: activeFilters.customerEmail }),
        ...(activeFilters.customerCpf && { customer_cpf: activeFilters.customerCpf }),
        ...(activeFilters.minAmount && { min_amount: activeFilters.minAmount }),
        ...(activeFilters.maxAmount && { max_amount: activeFilters.maxAmount })
      };
      
      const result = await abacatePayService.listCharges(request);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      const response = result.data;
      
      console.log('✅ [AbacateCharges] Cobranças carregadas:', {
        count: response.data.length,
        total: response.total,
        page: response.page
      });
      
      setCharges(response.data);
      setTotalCount(response.total);
      setCurrentPage(response.page);
      
      if (newFilters) {
        setFiltersState(newFilters);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar cobranças';
      console.error('❌ [AbacateCharges] Erro:', errorMessage);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [abacatePayService, charges.length, filters, pageSize, onError]);

  // Função para atualizar cobranças
  const refreshCharges = useCallback(async () => {
    await loadCharges(currentPage, filters);
  }, [loadCharges, currentPage, filters]);

  // Função para definir filtros
  const setFilters = useCallback(async (newFilters: ChargeFilter) => {
    console.log('🔍 [AbacateCharges] Aplicando filtros:', newFilters);
    await loadCharges(1, newFilters);
  }, [loadCharges]);

  // Função para limpar filtros
  const clearFilters = useCallback(async () => {
    console.log('🗑️ [AbacateCharges] Limpando filtros');
    await loadCharges(1, DEFAULT_FILTERS);
  }, [loadCharges]);

  // Navegação de páginas
  const nextPage = useCallback(async () => {
    if (hasNextPage) {
      await loadCharges(currentPage + 1, filters);
    }
  }, [hasNextPage, currentPage, filters, loadCharges]);

  const previousPage = useCallback(async () => {
    if (hasPreviousPage) {
      await loadCharges(currentPage - 1, filters);
    }
  }, [hasPreviousPage, currentPage, filters, loadCharges]);

  const goToPage = useCallback(async (page: number) => {
    if (page >= 1 && page <= totalPages) {
      await loadCharges(page, filters);
    }
  }, [totalPages, filters, loadCharges]);

  // Operações individuais
  const getChargeById = useCallback((id: string): ChargeResponse | null => {
    return charges.find(charge => charge.id === id) || null;
  }, [charges]);

  const updateChargeInList = useCallback((updatedCharge: ChargeResponse) => {
    setCharges(prevCharges => 
      prevCharges.map(charge => 
        charge.id === updatedCharge.id ? updatedCharge : charge
      )
    );
  }, []);

  const removeChargeFromList = useCallback((id: string) => {
    setCharges(prevCharges => prevCharges.filter(charge => charge.id !== id));
    setTotalCount(prev => Math.max(0, prev - 1));
  }, []);

  // Utilitários
  const getChargesByStatus = useCallback((status: PaymentStatus): ChargeResponse[] => {
    return charges.filter(charge => charge.status === status);
  }, [charges]);

  const getTotalByStatus = useCallback((status: PaymentStatus): number => {
    return getChargesByStatus(status).reduce((total, charge) => total + charge.valor, 0);
  }, [getChargesByStatus]);

  const getRevenueTotal = useCallback((): number => {
    return charges
      .filter(charge => charge.status === 'pago')
      .reduce((total, charge) => total + charge.valor, 0);
  }, [charges]);

  // Função para limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Função para resetar estado
  const reset = useCallback(() => {
    console.log('🔄 [AbacateCharges] Resetando estado');
    
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    setCharges([]);
    setIsLoading(false);
    setIsRefreshing(false);
    setError(null);
    setTotalCount(0);
    setCurrentPage(1);
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      console.log(`🔄 [AbacateCharges] Configurando auto-refresh: ${refreshInterval}ms`);
      
      refreshIntervalRef.current = setInterval(() => {
        if (!isLoading && !isRefreshing) {
          refreshCharges();
        }
      }, refreshInterval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, isLoading, isRefreshing, refreshCharges]);

  // Auto-load inicial
  useEffect(() => {
    if (autoLoad && charges.length === 0 && !isLoading) {
      console.log('🚀 [AbacateCharges] Auto-carregando cobranças');
      loadCharges(1, DEFAULT_FILTERS);
    }
  }, [autoLoad, charges.length, isLoading, loadCharges]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // Estados
    charges,
    isLoading,
    isRefreshing,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    
    // Filtros
    filters,
    
    // Ações
    loadCharges,
    refreshCharges,
    setFilters,
    clearFilters,
    nextPage,
    previousPage,
    goToPage,
    
    // Operações individuais
    getChargeById,
    updateChargeInList,
    removeChargeFromList,
    
    // Utilitários
    getChargesByStatus,
    getTotalByStatus,
    getRevenueTotal,
    
    // Controle
    clearError,
    reset
  };
}