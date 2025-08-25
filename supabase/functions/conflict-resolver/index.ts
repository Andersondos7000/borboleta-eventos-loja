import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface ConflictResolverRequest {
  action: 'detect' | 'resolve' | 'list' | 'auto_resolve';
  conflictId?: string;
  tableName?: string;
  recordId?: string;
  userId?: string;
  resolutionStrategy?: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  mergedData?: any;
}

interface ConflictResponse {
  success: boolean;
  conflicts?: DataConflict[];
  resolvedConflict?: DataConflict;
  message?: string;
}

interface DataConflict {
  id: string;
  tableName: string;
  recordId: string;
  userId: string;
  conflictType: 'update_conflict' | 'delete_conflict' | 'concurrent_modification';
  serverVersion: any;
  clientVersion: any;
  conflictFields: string[];
  createdAt: string;
  status: 'pending' | 'resolved' | 'ignored';
  resolutionStrategy?: string;
  resolvedData?: any;
  resolvedAt?: string;
}

interface ConflictRule {
  tableName: string;
  field: string;
  strategy: 'server_wins' | 'client_wins' | 'latest_timestamp' | 'merge' | 'manual';
  priority: number;
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { 
      action, 
      conflictId, 
      tableName, 
      recordId, 
      userId, 
      resolutionStrategy, 
      mergedData 
    }: ConflictResolverRequest = await req.json();

    let response: ConflictResponse;

    switch (action) {
      case 'detect':
        response = await detectConflicts(supabase, tableName, recordId, userId);
        break;
      case 'resolve':
        response = await resolveConflict(supabase, conflictId!, resolutionStrategy!, mergedData);
        break;
      case 'list':
        response = await listConflicts(supabase, userId, tableName);
        break;
      case 'auto_resolve':
        response = await autoResolveConflicts(supabase, userId, tableName);
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Conflict resolver error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Detectar conflitos
async function detectConflicts(supabase: any, tableName?: string, recordId?: string, userId?: string): Promise<ConflictResponse> {
  try {
    let query = supabase
      .from('data_conflicts')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (tableName) {
      query = query.eq('table_name', tableName);
    }
    if (recordId) {
      query = query.eq('record_id', recordId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: conflicts, error } = await query;

    if (error) {
      throw error;
    }

    // Converter para formato da interface
    const formattedConflicts: DataConflict[] = conflicts.map((conflict: any) => ({
      id: conflict.id,
      tableName: conflict.table_name,
      recordId: conflict.record_id,
      userId: conflict.user_id,
      conflictType: conflict.conflict_type,
      serverVersion: conflict.server_version,
      clientVersion: conflict.client_version,
      conflictFields: conflict.conflict_fields || [],
      createdAt: conflict.created_at,
      status: conflict.status,
      resolutionStrategy: conflict.resolution_strategy,
      resolvedData: conflict.resolved_data,
      resolvedAt: conflict.resolved_at
    }));

    return {
      success: true,
      conflicts: formattedConflicts,
      message: `Found ${formattedConflicts.length} pending conflicts`
    };

  } catch (error) {
    console.error('Error detecting conflicts:', error);
    return {
      success: false,
      message: 'Failed to detect conflicts'
    };
  }
}

// Resolver conflito específico
async function resolveConflict(supabase: any, conflictId: string, strategy: string, mergedData?: any): Promise<ConflictResponse> {
  try {
    // Buscar conflito
    const { data: conflict, error: fetchError } = await supabase
      .from('data_conflicts')
      .select('*')
      .eq('id', conflictId)
      .single();

    if (fetchError || !conflict) {
      return {
        success: false,
        message: 'Conflict not found'
      };
    }

    let resolvedData: any;
    const timestamp = new Date().toISOString();

    // Aplicar estratégia de resolução
    switch (strategy) {
      case 'server_wins':
        resolvedData = conflict.server_version;
        break;
      case 'client_wins':
        resolvedData = conflict.client_version;
        break;
      case 'merge':
        resolvedData = mergeConflictData(conflict.server_version, conflict.client_version, conflict.conflict_fields);
        break;
      case 'manual':
        if (!mergedData) {
          return {
            success: false,
            message: 'Manual resolution requires merged data'
          };
        }
        resolvedData = mergedData;
        break;
      default:
        return {
          success: false,
          message: 'Invalid resolution strategy'
        };
    }

    // Atualizar registro original na tabela
    const { error: updateError } = await supabase
      .from(conflict.table_name)
      .update({
        ...resolvedData,
        updated_at: timestamp
      })
      .eq('id', conflict.record_id);

    if (updateError) {
      throw updateError;
    }

    // Marcar conflito como resolvido
    const { error: resolveError } = await supabase
      .from('data_conflicts')
      .update({
        status: 'resolved',
        resolution_strategy: strategy,
        resolved_data: resolvedData,
        resolved_at: timestamp
      })
      .eq('id', conflictId);

    if (resolveError) {
      throw resolveError;
    }

    // Registrar evento de resolução
    await supabase
      .from('conflict_resolution_events')
      .insert({
        conflict_id: conflictId,
        table_name: conflict.table_name,
        record_id: conflict.record_id,
        user_id: conflict.user_id,
        resolution_strategy: strategy,
        resolved_data: resolvedData,
        created_at: timestamp
      });

    const resolvedConflict: DataConflict = {
      id: conflict.id,
      tableName: conflict.table_name,
      recordId: conflict.record_id,
      userId: conflict.user_id,
      conflictType: conflict.conflict_type,
      serverVersion: conflict.server_version,
      clientVersion: conflict.client_version,
      conflictFields: conflict.conflict_fields || [],
      createdAt: conflict.created_at,
      status: 'resolved',
      resolutionStrategy: strategy,
      resolvedData,
      resolvedAt: timestamp
    };

    return {
      success: true,
      resolvedConflict,
      message: `Conflict resolved using ${strategy} strategy`
    };

  } catch (error) {
    console.error('Error resolving conflict:', error);
    return {
      success: false,
      message: 'Failed to resolve conflict'
    };
  }
}

// Listar conflitos
async function listConflicts(supabase: any, userId?: string, tableName?: string): Promise<ConflictResponse> {
  try {
    let query = supabase
      .from('data_conflicts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (tableName) {
      query = query.eq('table_name', tableName);
    }

    const { data: conflicts, error } = await query;

    if (error) {
      throw error;
    }

    const formattedConflicts: DataConflict[] = conflicts.map((conflict: any) => ({
      id: conflict.id,
      tableName: conflict.table_name,
      recordId: conflict.record_id,
      userId: conflict.user_id,
      conflictType: conflict.conflict_type,
      serverVersion: conflict.server_version,
      clientVersion: conflict.client_version,
      conflictFields: conflict.conflict_fields || [],
      createdAt: conflict.created_at,
      status: conflict.status,
      resolutionStrategy: conflict.resolution_strategy,
      resolvedData: conflict.resolved_data,
      resolvedAt: conflict.resolved_at
    }));

    return {
      success: true,
      conflicts: formattedConflicts,
      message: `Found ${formattedConflicts.length} conflicts`
    };

  } catch (error) {
    console.error('Error listing conflicts:', error);
    return {
      success: false,
      message: 'Failed to list conflicts'
    };
  }
}

// Resolver conflitos automaticamente
async function autoResolveConflicts(supabase: any, userId?: string, tableName?: string): Promise<ConflictResponse> {
  try {
    // Buscar regras de resolução automática
    const { data: rules, error: rulesError } = await supabase
      .from('conflict_resolution_rules')
      .select('*')
      .eq('auto_resolve', true)
      .order('priority', { ascending: true });

    if (rulesError) {
      throw rulesError;
    }

    // Buscar conflitos pendentes
    let query = supabase
      .from('data_conflicts')
      .select('*')
      .eq('status', 'pending');

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (tableName) {
      query = query.eq('table_name', tableName);
    }

    const { data: conflicts, error: conflictsError } = await query;

    if (conflictsError) {
      throw conflictsError;
    }

    const resolvedConflicts: DataConflict[] = [];

    // Resolver cada conflito usando as regras
    for (const conflict of conflicts) {
      const applicableRule = findApplicableRule(rules, conflict);
      
      if (applicableRule) {
        const resolution = await resolveConflict(
          supabase, 
          conflict.id, 
          applicableRule.default_strategy, 
          null
        );
        
        if (resolution.success && resolution.resolvedConflict) {
          resolvedConflicts.push(resolution.resolvedConflict);
        }
      }
    }

    return {
      success: true,
      conflicts: resolvedConflicts,
      message: `Auto-resolved ${resolvedConflicts.length} conflicts`
    };

  } catch (error) {
    console.error('Error auto-resolving conflicts:', error);
    return {
      success: false,
      message: 'Failed to auto-resolve conflicts'
    };
  }
}

// Encontrar regra aplicável para um conflito
function findApplicableRule(rules: any[], conflict: any): any {
  return rules.find(rule => 
    rule.table_name === conflict.table_name &&
    (!rule.conflict_type || rule.conflict_type === conflict.conflict_type)
  );
}

// Mesclar dados conflitantes
function mergeConflictData(serverVersion: any, clientVersion: any, conflictFields: string[]): any {
  const merged = { ...serverVersion };
  
  // Estratégias de merge por tipo de campo
  for (const field of conflictFields) {
    const serverValue = serverVersion[field];
    const clientValue = clientVersion[field];
    
    // Se um dos valores é null/undefined, usar o outro
    if (serverValue == null && clientValue != null) {
      merged[field] = clientValue;
    } else if (clientValue == null && serverValue != null) {
      merged[field] = serverValue;
    } else if (serverValue != null && clientValue != null) {
      // Para timestamps, usar o mais recente
      if (field.includes('_at') || field.includes('date')) {
        const serverDate = new Date(serverValue);
        const clientDate = new Date(clientValue);
        merged[field] = serverDate > clientDate ? serverValue : clientValue;
      }
      // Para números, usar o maior
      else if (typeof serverValue === 'number' && typeof clientValue === 'number') {
        merged[field] = Math.max(serverValue, clientValue);
      }
      // Para strings, concatenar se diferentes
      else if (typeof serverValue === 'string' && typeof clientValue === 'string') {
        if (serverValue !== clientValue) {
          merged[field] = `${serverValue} | ${clientValue}`;
        } else {
          merged[field] = serverValue;
        }
      }
      // Para arrays, mesclar únicos
      else if (Array.isArray(serverValue) && Array.isArray(clientValue)) {
        merged[field] = [...new Set([...serverValue, ...clientValue])];
      }
      // Para objetos, mesclar propriedades
      else if (typeof serverValue === 'object' && typeof clientValue === 'object') {
        merged[field] = { ...serverValue, ...clientValue };
      }
      // Default: usar valor do servidor
      else {
        merged[field] = serverValue;
      }
    }
  }
  
  return merged;
}