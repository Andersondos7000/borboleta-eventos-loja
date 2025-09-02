import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const [adminLoading, setAdminLoading] = useState(requireAdmin);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  // Verificar se usuário é admin quando necessário
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (requireAdmin && user && !loading) {
        try {
          const adminStatus = await isAdmin();
          setIsUserAdmin(adminStatus);
        } catch (error) {
          console.error('Erro ao verificar status admin:', error);
          setIsUserAdmin(false);
        } finally {
          setAdminLoading(false);
        }
      }
    };

    checkAdminStatus();
  }, [requireAdmin, user, loading, isAdmin]);

  // Mostrar loading enquanto verifica autenticação ou permissões admin
  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {loading ? 'Verificando autenticação...' : 'Verificando permissões...'}
          </p>
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

  // Se requer permissões admin e usuário não é admin, redirecionar para página inicial
  if (requireAdmin && user && !isUserAdmin) {
    return (
      <Navigate 
        to="/" 
        replace 
      />
    );
  }

  // Se não requer autenticação ou usuário está logado (e é admin se necessário), renderizar children
  return <>{children}</>;
};

export default ProtectedRoute;