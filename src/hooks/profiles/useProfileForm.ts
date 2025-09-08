import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { supabase } from '../../lib/supabase';
import { useOfflineQueue } from '../realtime/useOfflineQueue';
import type { Customer } from '../../types/customer';

// Schema de validação Zod para clientes
const customerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  phone: z.string().optional().refine(
    (val) => !val || /^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/.test(val),
    'Formato de telefone inválido'
  ),
  document_type: z.enum(['cpf', 'cnpj']).optional(),
  document_number: z.string().optional().refine(
    (val, ctx) => {
      if (!val) return true;
      const docType = ctx.parent.document_type;
      if (docType === 'cpf') {
        return /^\d{11}$/.test(val.replace(/\D/g, ''));
      }
      if (docType === 'cnpj') {
        return /^\d{14}$/.test(val.replace(/\D/g, ''));
      }
      return true;
    },
    'Formato de documento inválido'
  ),
  birth_date: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    'Data de nascimento inválida'
  ),
  address_street: z.string().max(255, 'Endereço muito longo').optional(),
  address_number: z.string().max(20, 'Número muito longo').optional(),
  address_complement: z.string().max(100, 'Complemento muito longo').optional(),
  address_neighborhood: z.string().max(100, 'Bairro muito longo').optional(),
  address_city: z.string().max(100, 'Cidade muito longa').optional(),
  address_state: z.string().length(2, 'Estado deve ter 2 caracteres').optional(),
  address_zipcode: z.string().optional().refine(
    (val) => !val || /^\d{5}-?\d{3}$/.test(val),
    'CEP inválido'
  ),
  address_country: z.string().max(50, 'País muito longo').optional().default('Brasil'),
  status: z.enum(['active', 'inactive', 'blocked']).default('active'),
  customer_type: z.enum(['individual', 'business']).default('individual'),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional().default([])
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface UseCustomerFormOptions {
  customerId?: string;
  onSuccess?: (customer: Customer) => void;
  onError?: (error: string) => void;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

interface UseCustomerFormReturn {
  // Form state
  formData: CustomerFormData;
  originalData: CustomerFormData | null;
  isDirty: boolean;
  isValid: boolean;
  errors: Record<string, string>;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  
  // Actions
  setField: <K extends keyof CustomerFormData>(field: K, value: CustomerFormData[K]) => void;
  setFormData: (data: Partial<CustomerFormData>) => void;
  resetForm: () => void;
  validateForm: () => boolean;
  submitForm: () => Promise<Customer | null>;
  
  // Auto-save
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  
  // Offline support
  isOffline: boolean;
  queuedOperations: number;
}

const defaultFormData: CustomerFormData = {
  name: '',
  email: '',
  phone: '',
  document_type: undefined,
  document_number: '',
  birth_date: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zipcode: '',
  address_country: 'Brasil',
  status: 'active',
  customer_type: 'individual',
  notes: '',
  tags: []
};

export const useCustomerForm = ({
  customerId,
  onSuccess,
  onError,
  autoSave = false,
  autoSaveDelay = 2000
}: UseCustomerFormOptions = {}): UseCustomerFormReturn => {
  const [formData, setFormDataState] = useState<CustomerFormData>(defaultFormData);
  const [originalData, setOriginalData] = useState<CustomerFormData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Offline queue para operações quando offline
  const {
    addOperation,
    isOffline,
    queuedOperations
  } = useOfflineQueue();

  // Verificar se o formulário foi modificado
  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);

  // Validar formulário
  const validateForm = useCallback(() => {
    try {
      customerSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  }, [formData]);

  // Verificar se o formulário é válido
  const isValid = Object.keys(errors).length === 0 && formData.name.trim() !== '' && formData.email.trim() !== '';

  // Carregar dados do cliente existente
  const loadCustomer = useCallback(async () => {
    if (!customerId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (error) throw error;
      
      const customerData: CustomerFormData = {
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        document_type: data.document_type,
        document_number: data.document_number || '',
        birth_date: data.birth_date || '',
        address_street: data.address_street || '',
        address_number: data.address_number || '',
        address_complement: data.address_complement || '',
        address_neighborhood: data.address_neighborhood || '',
        address_city: data.address_city || '',
        address_state: data.address_state || '',
        address_zipcode: data.address_zipcode || '',
        address_country: data.address_country || 'Brasil',
        status: data.status || 'active',
        customer_type: data.customer_type || 'individual',
        notes: data.notes || '',
        tags: data.tags || []
      };
      
      setFormDataState(customerData);
      setOriginalData(customerData);
      
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
      onError?.(error instanceof Error ? error.message : 'Erro ao carregar cliente');
    } finally {
      setLoading(false);
    }
  }, [customerId, onError]);

  // Definir campo específico
  const setField = useCallback(<K extends keyof CustomerFormData>(
    field: K,
    value: CustomerFormData[K]
  ) => {
    setFormDataState(current => ({
      ...current,
      [field]: value
    }));
    
    // Limpar erro do campo se existir
    if (errors[field]) {
      setErrors(current => {
        const newErrors = { ...current };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Configurar auto-save
    if (autoSave && !saving) {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      
      const timeout = setTimeout(() => {
        handleAutoSave();
      }, autoSaveDelay);
      
      setAutoSaveTimeout(timeout);
    }
  }, [errors, autoSave, saving, autoSaveDelay, autoSaveTimeout]);

  // Definir dados do formulário
  const setFormData = useCallback((data: Partial<CustomerFormData>) => {
    setFormDataState(current => ({ ...current, ...data }));
  }, []);

  // Resetar formulário
  const resetForm = useCallback(() => {
    if (originalData) {
      setFormDataState(originalData);
    } else {
      setFormDataState(defaultFormData);
    }
    setErrors({});
  }, [originalData]);

  // Auto-save
  const handleAutoSave = useCallback(async () => {
    if (!customerId || !isDirty || !isValid) return;
    
    try {
      setAutoSaveStatus('saving');
      
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', customerId);
      
      if (error) throw error;
      
      setAutoSaveStatus('saved');
      setLastSaved(new Date());
      setOriginalData(formData);
      
      // Limpar status após 3 segundos
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 3000);
      
    } catch (error) {
      console.error('Erro no auto-save:', error);
      setAutoSaveStatus('error');
      
      // Adicionar à fila offline se necessário
      if (isOffline) {
        addOperation({
          type: 'update',
          table: 'profiles',
          data: formData,
          id: customerId
        });
      }
    }
  }, [customerId, isDirty, isValid, formData, isOffline, addOperation]);

  // Submeter formulário
  const submitForm = useCallback(async (): Promise<Customer | null> => {
    if (!validateForm()) {
      return null;
    }
    
    try {
      setSaving(true);
      
      let result;
      
      if (customerId) {
        // Atualizar cliente existente
        const { data, error } = await supabase
          .from('profiles')
          .update(formData)
          .eq('id', customerId)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Criar novo cliente
        const { data, error } = await supabase
          .from('profiles')
          .insert([{
            ...formData,
            user_id: (await supabase.auth.getUser()).data.user?.id
          }])
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      setOriginalData(formData);
      setLastSaved(new Date());
      onSuccess?.(result);
      
      return result;
      
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar cliente';
      onError?.(errorMessage);
      
      // Adicionar à fila offline se necessário
      if (isOffline) {
        addOperation({
          type: customerId ? 'update' : 'create',
          table: 'profiles',
          data: formData,
          id: customerId
        });
      }
      
      return null;
    } finally {
      setSaving(false);
    }
  }, [validateForm, customerId, formData, onSuccess, onError, isOffline, addOperation]);

  // Carregar dados iniciais
  useEffect(() => {
    if (customerId) {
      loadCustomer();
    } else {
      setOriginalData(defaultFormData);
    }
  }, [customerId, loadCustomer]);

  // Validar formulário quando dados mudarem
  useEffect(() => {
    validateForm();
  }, [validateForm]);

  // Cleanup do timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  return {
    formData,
    originalData,
    isDirty,
    isValid,
    errors,
    loading,
    saving,
    setField,
    setFormData,
    resetForm,
    validateForm,
    submitForm,
    autoSaveStatus,
    lastSaved,
    isOffline,
    queuedOperations: queuedOperations.length
  };
};