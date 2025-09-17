
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias');
}

const customStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Error reading from localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Error writing to localStorage:', error);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
    debug: import.meta.env.DEV,
  },
  global: {
    headers: {
      'X-Client-Info': 'borboleta-eventos-loja@1.0.0',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Função para limpar todos os dados de autenticação
export const clearAuthData = () => {
  try {
    // Limpar localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase') || key === 'supabase.auth.token') {
        localStorage.removeItem(key);
      }
    });
    
    // Limpar sessionStorage também
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('✅ Dados de autenticação limpos com sucesso');
  } catch (error) {
    console.warn('⚠️ Erro ao limpar dados de autenticação:', error);
  }
};

// Função para tratar erros de refresh token
export const handleAuthError = async (error: unknown) => {
  if (error?.message?.includes('Invalid Refresh Token') || 
      error?.message?.includes('Refresh Token Not Found')) {
    console.warn('🔄 Token de refresh inválido detectado, limpando sessão...');
    
    // Limpar dados de autenticação
    clearAuthData();
    
    // Fazer logout silencioso
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (signOutError) {
      console.warn('⚠️ Erro durante logout:', signOutError);
    }
    
    // Recarregar a página para resetar o estado
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
};

// Enhanced error handling for auth state changes
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('🔐 Auth state change:', event, session ? 'com sessão' : 'sem sessão');
  
  if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
    clearAuthData();
  }
  
  // Tratar erros de token refresh
  if (event === 'TOKEN_REFRESHED' && !session) {
    console.warn('⚠️ Falha no refresh do token, limpando sessão...');
    clearAuthData();
  }
});

// Interceptar erros globais do Supabase
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('Invalid Refresh Token') ||
        event.reason?.message?.includes('Refresh Token Not Found')) {
      event.preventDefault();
      handleAuthError(event.reason);
    }
  });
}

// ⚠️ IMPORTANTE: Cliente administrativo removido do frontend
// Use apenas o MCP do Supabase para operações administrativas
// O frontend deve usar apenas a chave anônima (anon key)
