export interface Customer {
  id: string;
  user_id: string;
  
  // Dados pessoais
  name: string;
  email: string;
  phone?: string;
  document_type?: 'cpf' | 'cnpj';
  document_number?: string;
  birth_date?: string;
  
  // Endereço
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  address_country?: string;
  
  // Metadados
  status: 'active' | 'inactive' | 'blocked';
  customer_type: 'individual' | 'business';
  notes?: string;
  tags?: string[];
  
  // Campos de auditoria
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  
  // Campos para sincronização realtime
  version: number;
  last_sync_at: string;
  sync_status: 'synced' | 'pending' | 'conflict';
}

export interface CustomerFilters {
  status?: Customer['status'];
  customerType?: Customer['customer_type'];
  userId?: string;
  search?: string;
  tags?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export interface CustomerSortOptions {
  field: keyof Customer;
  direction: 'asc' | 'desc';
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone?: string;
  document_type?: 'cpf' | 'cnpj';
  document_number?: string;
  birth_date?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zipcode?: string;
  address_country?: string;
  status: 'active' | 'inactive' | 'blocked';
  customer_type: 'individual' | 'business';
  notes?: string;
  tags?: string[];
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  blocked: number;
  individual: number;
  business: number;
  recentlyCreated: number;
}

export interface CustomerValidationError {
  field: keyof CustomerFormData;
  message: string;
}

export interface CustomerConflict {
  id: string;
  field: keyof Customer;
  localValue: any;
  serverValue: any;
  timestamp: string;
}

// Utility types
export type CustomerCreateInput = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'version' | 'last_sync_at' | 'sync_status'>;
export type CustomerUpdateInput = Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'version' | 'last_sync_at' | 'sync_status'>>;

// Event types for realtime
export interface CustomerRealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: Customer;
  old?: Customer;
  timestamp: string;
}

// Search and pagination
export interface CustomerSearchParams {
  query?: string;
  filters?: CustomerFilters;
  sort?: CustomerSortOptions;
  page?: number;
  limit?: number;
}

export interface CustomerSearchResult {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Export/Import types
export interface CustomerExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields?: (keyof Customer)[];
  filters?: CustomerFilters;
}

export interface CustomerImportResult {
  success: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: Partial<CustomerFormData>;
  }>;
  duplicates: number;
}

// Address validation
export interface AddressValidation {
  zipcode: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  valid: boolean;
  error?: string;
}

// Document validation
export interface DocumentValidation {
  type: 'cpf' | 'cnpj';
  number: string;
  valid: boolean;
  formatted?: string;
  error?: string;
}