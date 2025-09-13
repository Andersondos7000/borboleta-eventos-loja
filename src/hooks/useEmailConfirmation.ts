import { useState } from 'react';
import { useAuth } from './useAuth';

interface UseEmailConfirmationReturn {
  isResending: boolean;
  resendConfirmationEmail: (email: string) => Promise<void>;
  error: string | null;
}

export const useEmailConfirmation = (): UseEmailConfirmationReturn => {
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useAuth();

  const resendConfirmationEmail = async (email: string): Promise<void> => {
    if (!email) {
      setError('Email é obrigatório');
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (resendError) {
        throw resendError;
      }

      console.log('Email de confirmação reenviado com sucesso para:', email);
    } catch (err: any) {
      console.error('Erro ao reenviar email de confirmação:', err);
      setError(err.message || 'Erro ao reenviar email de confirmação');
      throw err;
    } finally {
      setIsResending(false);
    }
  };

  return {
    isResending,
    resendConfirmationEmail,
    error
  };
};