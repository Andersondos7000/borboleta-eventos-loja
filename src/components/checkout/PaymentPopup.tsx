import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Copy, 
  X, 
  Loader2, 
  CheckCircle, 
  User, 
  DollarSign, 
  Hash, 
  Building, 
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onRegeneratePayment?: () => void; // Callback para regenerar pagamento quando expirar
  paymentData?: {
    data?: {
      id?: string;
      amount?: number;
      brCode?: string;
      brCodeBase64?: string;
      status?: string;
      expiresAt?: string;
    };
  } | null;
  customerData?: {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  };
  orderTotal?: number;
}

const PaymentPopup: React.FC<PaymentPopupProps> = ({ isOpen, onClose, onRegeneratePayment, paymentData, customerData, orderTotal }) => {
  const { toast } = useToast();
  const { clearCart } = useCart();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  // Formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format((value || 0) / 100);
  };

  // Calcular tempo restante para expiração
  useEffect(() => {
    if (!paymentData?.data?.expiresAt) return;
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const expiry = new Date(paymentData.data!.expiresAt!);
      const diff = expiry.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expirado');
        
        // Fechar popup automaticamente quando PIX expirar (sincronizar com duração do QR Code)
        setTimeout(() => {
          onClose();
          
          // Mostrar toast com opção de regenerar pagamento
          if (onRegeneratePayment) {
            toast({
              title: "⌛ PIX expirado",
              description: "O código PIX expirou automaticamente. Clique em 'Gerar Novo' para criar um novo pagamento.",
              variant: "destructive",
              className: "bg-orange-50 text-orange-700 border-orange-200",
              action: (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRegeneratePayment}
                  className="bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200"
                >
                  Gerar Novo
                </Button>
              )
            });
          } else {
            toast({
              title: "⌛ PIX expirado",
              description: "O código PIX expirou automaticamente. Gere um novo pagamento para continuar.",
              variant: "destructive",
              className: "bg-orange-50 text-orange-700 border-orange-200"
            });
          }
        }, 3000); // Aguarda 3 segundos para mostrar "Expirado" antes de fechar
        
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      
      // Mostrar formato HH:MM:SS se tiver horas, senão MM:SS
      if (hours > 0) {
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };
    
    // Atualizar a cada segundo
    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft(); // Chamada inicial
    
    return () => clearInterval(timer);
  }, [paymentData?.data?.expiresAt, onClose, onRegeneratePayment, toast]);
  
  console.log('PaymentPopup render - isOpen:', isOpen, 'paymentData:', paymentData);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    
    navigator.clipboard.writeText(text);
    toast({
      title: "Código PIX copiado!",
      description: "Cole o código no aplicativo do seu banco para efetuar o pagamento.",
      className: "bg-green-50 text-green-700 border-green-200",
    });
  };
  
  // Obter a cor do status do pagamento
  const getStatusColor = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'EXPIRED':
      case 'CANCELLED':
      case 'FAILED':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  // Obter o ícone do status
  const getStatusIcon = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
      case 'PENDING':
        return <AlertCircle className="w-4 h-4 mr-1.5" />;
      case 'EXPIRED':
      case 'CANCELLED':
      case 'FAILED':
        return <AlertTriangle className="w-4 h-4 mr-1.5" />;
      default:
        return <AlertCircle className="w-4 h-4 mr-1.5" />;
    }
  };
  
  // Obter o texto amigável do status
  const getStatusText = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'Pago';
      case 'PENDING':
        return 'Pendente';
      case 'EXPIRED':
        return 'Expirado';
      case 'CANCELLED':
        return 'Cancelado';
      case 'FAILED':
        return 'Falhou';
      default:
        return status || 'Pendente';
    }
  };

  const checkPaymentStatus = async () => {
    console.log('DEBUG: checkPaymentStatus chamado');
    console.log('DEBUG: paymentData', paymentData);
    if (!paymentData?.data?.id) {
      toast({
        title: "Erro na transação",
        description: "ID da transação não encontrado. Por favor, tente novamente.",
        variant: "destructive",
        className: "bg-red-50 text-red-700 border-red-200"
      });
      return;
    }

    setIsCheckingPayment(true);

    try {
      // Atualizar sessão Supabase antes de verificar pagamento
      await supabase.auth.refreshSession();
      // Obter sessão atual
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session.session) {
        console.error('Erro de sessão:', sessionError);
        toast({
          title: "Erro de autenticação",
          description: "Sua sessão expirou. Por favor, faça login novamente.",
          variant: "destructive",
          className: "bg-red-50 text-red-700 border-red-200"
        });
        return;
      }

      // Usar Supabase Edge Function para verificar pagamento
      console.log('DEBUG: Invocando função check-abacate-payment com transactionId:', paymentData.data.id);
      const { data: statusResponse, error } = await supabase.functions.invoke('check-abacate-payment', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        },
        body: {
          transactionId: paymentData.data.id
        }
      });
      console.log('DEBUG: statusResponse', statusResponse);

      if (error) {
        console.error('Erro na função de verificação:', error);
        throw error;
      }

      // Status conforme documentação do Abacate Pay: PENDING, PAID, EXPIRED, CANCELLED, REFUNDED
      const status = statusResponse?.data?.status?.toUpperCase() || 'PENDING';
      console.log('DEBUG: status recebido', status);
      
      switch (status) {
        case 'PAID':
          setPaymentConfirmed(true);
          await clearCart(); // Limpar carrinho apenas quando pagamento for confirmado
          toast({
            title: "✅ Pagamento confirmado!",
            description: "Seu pedido foi processado com sucesso e está sendo preparado.",
            className: "bg-green-50 text-green-700 border-green-200"
          });
          break;
          
        case 'PENDING':
          toast({
            title: "⏳ Aguardando confirmação",
            description: "O pagamento ainda não foi confirmado. Isso pode levar alguns minutos.",
            className: "bg-yellow-50 text-yellow-700 border-yellow-200"
          });
          break;
          
        case 'EXPIRED':
          toast({
            title: "⌛ PIX expirado",
            description: "O código PIX expirou. Por favor, gere um novo pagamento.",
            className: "bg-red-50 text-red-700 border-red-200"
          });
          break;
          
        case 'CANCELLED':
          toast({
            title: "❌ Pagamento cancelado",
            description: "Esta transação foi cancelada. Por favor, inicie um novo pagamento.",
            className: "bg-red-50 text-red-700 border-red-200"
          });
          break;
          
        case 'REFUNDED':
          toast({
            title: "↩️ Pagamento reembolsado",
            description: "Esta transação foi reembolsada. Entre em contato com o suporte para mais informações.",
            className: "bg-blue-50 text-blue-700 border-blue-200"
          });
          break;
          
        default:
          toast({
            title: "ℹ️ Status desconhecido",
            description: `Status: ${status}. Entre em contato com o suporte se o problema persistir.`,
            className: "bg-gray-50 text-gray-700 border-gray-200"
          });
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      toast({
        title: "⚠️ Erro ao verificar pagamento",
        description: "Não foi possível verificar o status do pagamento. Tente novamente em alguns instantes.",
        variant: "destructive",
        className: "bg-red-50 text-red-700 border-red-200"
      });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // Estado de confirmação de pagamento
  if (paymentConfirmed) {
    // Popup permanece aberto até o usuário fechar manualmente (botão ou Esc)
    return (
      <AnimatePresence>
        <Dialog open={isOpen} onOpenChange={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <DialogContent className="sm:max-w-md border-0 shadow-xl">
              <DialogHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <DialogTitle className="text-center text-2xl font-bold text-gray-900 mt-4">
                  Pagamento Aprovado!
                </DialogTitle>
              </DialogHeader>
              <div className="text-center py-4 px-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-gray-600 mb-6">
                    Seu pedido foi processado com sucesso. Enviamos os detalhes para <span className="font-medium text-gray-900">{customerData?.email || 'seu e-mail'}</span>.
                  </p>
                  <Button 
                    onClick={onClose} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-base font-medium"
                  >
                    Continuar Comprando
                  </Button>
                  <p className="mt-4 text-sm text-gray-500">
                    Em caso de dúvidas, entre em contato com nosso suporte.
                  </p>
                </motion.div>
              </div>
            </DialogContent>
          </motion.div>
        </Dialog>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <DialogContent className="sm:max-w-md border-0 shadow-xl p-0 overflow-hidden">
            {/* Cabeçalho */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-bold text-white">
                  Pagamento via PIX
                </DialogTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  className="text-white hover:bg-blue-700 h-8 w-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="mt-2 flex items-center">
                <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(paymentData?.data?.status)}`}>
                  {getStatusIcon(paymentData?.data?.status)}
                  {getStatusText(paymentData?.data?.status)}
                </div>
                
                {timeLeft && paymentData?.data?.status === 'PENDING' && (
                  <div className="ml-3 flex items-center text-white/90 text-sm">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    <span>Expira em {timeLeft}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Seção de Informações do Pagamento */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-blue-600" />
                  Informações do Pedido
                </h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente</span>
                    <span className="font-medium text-gray-900">{customerData?.name || 'Nome não informado'}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Valor</span>
                    <span className="font-bold text-blue-700">
                      {formatCurrency(orderTotal || paymentData?.data?.amount || 0)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">ID da Transação</span>
                    <div className="flex items-center">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {paymentData?.data?.id?.substring(0, 8) + '...' || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Dados do Recebedor */}
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <Building className="h-4 w-4 text-blue-600" />
                  Dados do Recebedor
                </h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Empresa</span>
                    <span className="font-medium text-gray-900">Borboleta Eventos</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">CNPJ</span>
                    <span className="font-mono text-gray-900">12.345.678/0001-90</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-500">Responsável</span>
                    <span className="text-gray-900">Administração</span>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <span className="text-blue-600">#</span>
                  Código PIX
                </h3>
                
                <div className="flex flex-col items-center space-y-4">
                  {paymentData?.data?.brCodeBase64 ? (
                    <div className="p-3 bg-white border-2 border-blue-100 rounded-lg">
                      <img 
                        src={paymentData.data.brCodeBase64}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400 text-sm">QR Code não disponível</span>
                    </div>
                  )}
                  
                  {paymentData?.data?.brCode && (
                    <div className="w-full space-y-2">
                      <label className="text-sm font-medium text-gray-700 block">
                        Código PIX (Copia e Cola):
                      </label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={paymentData.data.brCode}
                          className="text-xs font-mono h-10"
                          readOnly
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(paymentData.data!.brCode!)}
                          className="h-10 w-10 p-0 flex items-center justify-center"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instruções de Pagamento */}
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                  <span className="text-amber-600">ℹ️</span>
                  Como pagar com PIX
                </h3>
                
                <ol className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 font-medium text-xs">1</span>
                    <span>Abra o aplicativo do seu banco e selecione a opção PIX</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 font-medium text-xs">2</span>
                    <span>Escaneie o QR Code acima ou cole o código PIX copiado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 font-medium text-xs">3</span>
                    <span>Confirme o valor de <span className="font-bold">{formatCurrency(orderTotal || paymentData?.data?.amount || 0)}</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-700 font-medium text-xs">4</span>
                    <span>Após o pagamento, clique no botão abaixo para confirmar</span>
                  </li>
                </ol>
                
                {paymentData?.data?.expiresAt && (
                  <div className="mt-4 p-3 bg-white border border-amber-200 rounded-lg flex items-start">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="ml-2">
                      <p className="text-sm font-medium text-amber-800">Atenção: PIX com tempo limitado</p>
                      <p className="text-xs text-amber-700">
                        Este código expira em <span className="font-bold">{new Date(paymentData.data.expiresAt).toLocaleString('pt-BR')}</span>
                      </p>
                      {timeLeft && (
                        <p className="text-xs mt-1 bg-amber-100 text-amber-800 px-2 py-1 rounded inline-flex items-center">
                          <Clock className="h-3 w-3 mr-1.5" />
                          <span>Expira em {timeLeft}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col space-y-3 pt-2">
                <Button 
                  onClick={checkPaymentStatus}
                  disabled={isCheckingPayment}
                  className={`h-12 text-base font-medium ${isCheckingPayment ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isCheckingPayment ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Verificando pagamento...
                    </>
                  ) : (
                    'Já efetuei o pagamento'
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="h-12 text-base font-medium text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  Cancelar pedido
                </Button>
                
                <p className="text-xs text-center text-gray-500 mt-2">
                  Em caso de dúvidas, entre em contato com nosso suporte
                </p>
              </div>
            </div>
          </DialogContent>
        </motion.div>
      </Dialog>
    </AnimatePresence>
  );
};

export default PaymentPopup;