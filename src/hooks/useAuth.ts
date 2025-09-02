import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * Hook para acessar o contexto de autenticação
 * Separado em arquivo próprio para compatibilidade com Fast Refresh
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};