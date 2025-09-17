
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Iniciando processamento do callback de autenticação');
        
        // Verificar se há parâmetros de erro na URL
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.error('Erro nos parâmetros da URL:', { error, errorDescription });
          toast({
            title: "Erro na autenticação",
            description: errorDescription || error || "Falha ao processar login com Google",
            variant: "destructive"
          });
          navigate('/auth', { replace: true });
          return;
        }
        
        // Processar o callback do OAuth
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Erro no callback de autenticação:', authError);
          toast({
            title: "Erro na autenticação",
            description: authError.message || "Falha ao processar login com Google",
            variant: "destructive"
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session && data.session.user) {
          console.log('Usuário autenticado com sucesso:', data.session.user.email);
          
          // Verificar se há um role nos parâmetros da URL
          const role = urlParams.get('role');
          if (role) {
            console.log('Role detectado nos parâmetros:', role);
            // Aqui você pode processar o role se necessário
          }
          
          toast({
            title: "Login realizado com sucesso",
            description: `Bem-vindo, ${data.session.user.email}!`
          });
          
          // Limpar a URL dos parâmetros antes de redirecionar
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Redirecionar para a página inicial
          navigate('/', { replace: true });
        } else {
          console.log('Nenhuma sessão encontrada, redirecionando para login');
          toast({
            title: "Sessão não encontrada",
            description: "Por favor, tente fazer login novamente",
            variant: "destructive"
          });
          navigate('/auth', { replace: true });
        }
      } catch (error: unknown) {
        console.error('Erro inesperado no callback:', error);
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro durante a autenticação",
          variant: "destructive"
        });
        navigate('/auth', { replace: true });
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [navigate, toast]);

  if (!isProcessing) {
    return null; // Componente será desmontado após redirecionamento
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900">Autenticando...</h2>
        <p className="text-gray-600">Por favor, aguarde enquanto completamos o processo de login.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
