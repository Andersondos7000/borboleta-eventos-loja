
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session, Provider } from '@supabase/supabase-js';
import { useToast } from '@/components/ui/use-toast';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, role?: string) => Promise<void>;
  signInWithGoogle: (role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateUserRole: (role: string) => Promise<void>;
  isAdmin: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session);
        
        // Handle refresh token errors
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing session');
          await clearAuthSession();
          return;
        }
        
        // Handle signed out event
        if (event === 'SIGNED_OUT') {
          await clearAuthSession();
          return;
        }
        
        // Handle authentication errors
        if ((event === 'TOKEN_REFRESHED' && !session)) {
          await clearAuthSession();
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session with enhanced error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          
          // Handle specific refresh token errors
          if (error.message.includes('refresh_token_not_found') || 
              error.message.includes('Invalid Refresh Token') ||
              error.message.includes('Refresh Token Not Found') ||
              error.name === 'AuthApiError') {
            console.warn('Refresh token invalid, clearing session and redirecting to login');
            await clearAuthSession();
            return;
          }
        }
        
        // Validate session before setting
        if (session && session.access_token) {
          setSession(session);
          setUser(session.user);
        } else {
          await clearAuthSession();
        }
      } catch (error: any) {
        console.error('Failed to initialize auth:', error);
        
        // Handle any authentication-related errors
        if (error.message?.includes('refresh_token') || 
            error.message?.includes('Invalid Refresh Token') ||
            error.name === 'AuthApiError') {
          await clearAuthSession();
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  // Enhanced function to clear auth session and localStorage
  const clearAuthSession = async () => {
    try {
      // Preserve cart data before clearing
      const cartData = localStorage.getItem('cart-items');
      
      // Clear Supabase auth data from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') || 
            key.includes('supabase') || 
            key === 'supabase.auth.token') {
          localStorage.removeItem(key);
        }
      });
      
      // Restore cart data after clearing auth data
      if (cartData) {
        localStorage.setItem('cart-items', cartData);
      }
      
      // Clear sessionStorage as well
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.startsWith('sb-') || 
            key.includes('supabase') || 
            key === 'supabase.auth.token') {
          sessionStorage.removeItem(key);
        }
      });
      
      // Reset state
      setSession(null);
      setUser(null);
      
      console.log('Auth session and storage cleared completely');
      
      // Show user-friendly message
      toast({
        title: "Sessão expirada",
        description: "Sua sessão expirou. Faça login novamente.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error clearing auth session:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!"
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.error_description || error.message || "Verifique suas credenciais e tente novamente",
        variant: "destructive"
      });
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string, role: string = 'user') => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role,
          },
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Cadastro realizado com sucesso",
        description: "Verifique seu email para confirmar seu cadastro."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar conta",
        description: error.error_description || error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
      throw error;
    }
  };

  const signInWithGoogle = async (role?: string) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: role ? { role } : undefined,
        },
      });
      
      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login com Google",
        description: error.error_description || error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Função para atualizar o role de um usuário existente
  const updateUserRole = async (role: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: "Perfil atualizado",
        description: "Seu tipo de usuário foi definido com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // First try to sign out properly
      await supabase.auth.signOut();
      
      // Then clear all auth data
      await clearAuthSession();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error: any) {
      console.error('Error during signOut:', error);
      
      // Even if signOut fails, clear local session
      await clearAuthSession();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast({
        title: "Email de recuperação enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email de recuperação",
        description: error.error_description || error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) throw error;
      
      toast({
        title: "Senha atualizada com sucesso",
        description: "Sua senha foi alterada com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.error_description || error.message || "Tente novamente mais tarde",
        variant: "destructive"
      });
      throw error;
    }
  };

  const isAdmin = async (): Promise<boolean> => {
    try {
      if (!user) return false;
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('Erro ao verificar role do usuário:', error);
        return false;
      }
      
      return profile?.role === 'admin' || profile?.role === 'organizer';
    } catch (error) {
      console.error('Erro ao verificar se usuário é admin:', error);
      return false;
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateUserRole,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook useAuth movido para src/hooks/useAuth.ts para compatibilidade com Fast Refresh
