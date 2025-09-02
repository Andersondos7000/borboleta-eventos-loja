
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Aguardar um pouco para garantir que o callback foi processado
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro no callback de autenticação:', error);
          toast({
            title: "Erro na autenticação",
            description: error.message || "Falha ao processar login com Google",
            variant: "destructive"
          });
          navigate('/auth', { replace: true });
          return;
        }

        if (data.session && data.session.user) {
          console.log('Usuário autenticado com sucesso:', data.session.user.email);
          toast({
            title: "Login realizado com sucesso",
            description: `Bem-vindo, ${data.session.user.email}!`
          });
          
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
      } catch (error: any) {
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
