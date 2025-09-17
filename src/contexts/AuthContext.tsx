
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session, Provider } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

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
      } catch (error: unknown) {
        console.error('Failed to initialize auth:', error);
        
        // Handle any authentication-related errors
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorName = error instanceof Error ? error.name : '';
        if (errorMessage?.includes('refresh_token') || 
            errorMessage?.includes('Invalid Refresh Token') ||
            errorName === 'AuthApiError') {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDescription = (error as any)?.error_description || errorMessage || "Verifique suas credenciais e tente novamente";
      toast({
        title: "Erro ao fazer login",
        description: errorDescription,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDescription = (error as any)?.error_description || errorMessage || "Tente novamente mais tarde";
      toast({
        title: "Erro ao criar conta",
        description: errorDescription,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDescription = (error as any)?.error_description || errorMessage || "Tente novamente mais tarde";
      toast({
        title: "Erro ao fazer login com Google",
        description: errorDescription,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Erro ao atualizar perfil",
        description: errorMessage || "Tente novamente mais tarde",
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDescription = (error as any)?.error_description || errorMessage || "Tente novamente mais tarde";
      toast({
        title: "Erro ao enviar email de recuperação",
        description: errorDescription,
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDescription = (error as any)?.error_description || errorMessage || "Tente novamente mais tarde";
      toast({
        title: "Erro ao atualizar senha",
        description: errorDescription,
        variant: "destructive"
      });
      throw error;
    }
  };

  // Função para criar perfil automaticamente se não existir
  const ensureUserProfile = async (userId: string): Promise<void> => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!existingProfile) {
        console.log('Criando perfil para usuário:', userId);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
            avatar_url: user?.user_metadata?.avatar_url || null,
            role: 'user'
          });
        
        if (insertError) {
          console.error('Erro ao criar perfil:', insertError);
        } else {
          console.log('Perfil criado com sucesso para:', userId);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar/criar perfil:', error);
    }
  };

  const isAdmin = async (): Promise<boolean> => {
    try {
      // Verificar se há usuário logado e sessão ativa
      if (!user || !session) {
        console.log('Usuário não logado ou sessão inválida');
        return false;
      }
      
      // Verificar se o Supabase está disponível
      if (!supabase) {
        console.error('Cliente Supabase não disponível');
        return false;
      }
      
      // Garantir que o perfil existe antes de verificar o role
      await ensureUserProfile(user.id);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (error) {
        // Se ainda houver erro após tentar criar o perfil, log detalhado
        console.error('Erro ao verificar role do usuário:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: user.id
        });
        return false;
      }
      
      if (!profile) {
        console.warn('Perfil ainda não encontrado após tentativa de criação:', user.id);
        return false;
      }
      
      const isAdminUser = profile?.role === 'admin' || profile?.role === 'organizer';
      console.log('Status admin verificado:', { userId: user.id, role: profile.role, isAdmin: isAdminUser });
      
      return isAdminUser;
    } catch (error) {
      console.error('Erro ao verificar se usuário é admin:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        userId: user?.id
      });
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
