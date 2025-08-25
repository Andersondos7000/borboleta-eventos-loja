import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se requer autenticação e usuário não está logado, redirecionar para login
  if (requireAuth && !user) {
    // Se é uma rota admin, redirecionar para login admin
    const loginPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/auth';
    return (
      <Navigate 
        to={loginPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Se não requer autenticação ou usuário está logado, renderizar children
  return <>{children}</>;
};

export default ProtectedRoute;