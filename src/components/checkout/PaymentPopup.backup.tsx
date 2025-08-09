import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, X, Loader2, CheckCircle, User, DollarSign, Hash, Building } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/contexts/CartContext";

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
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

const PaymentPopup: React.FC<PaymentPopupProps> = ({ isOpen, onClose, paymentData, customerData, orderTotal }) => {
  const { toast } = useToast();
  const { clearCart } = useCart();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  
  console.log('PaymentPopup render - isOpen:', isOpen, 'paymentData:', paymentData);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Código PIX copiado!",
      description: "O código PIX foi copiado para a área de transferência.",
    });
  };

  const checkPaymentStatus = async () => {
    if (!paymentData?.data?.id) {
      toast({
        title: "Erro",
        description: "ID da transação não encontrado.",
        variant: "destructive"
      });
      return;
    }

    setIsCheckingPayment(true);

    try {
      // Get current session
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para verificar o pagamento.",
          variant: "destructive"
        });
        return;
      }

      // Usar Supabase Edge Function para verificar pagamento
      const { data: statusResponse, error } = await supabase.functions.invoke('check-abacate-payment', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        },
        body: {
          transactionId: paymentData.data.id
        }
      });

      if (error) {
        throw error;
      }

      // Status conforme documentação do Abacate Pay: PENDING, PAID, EXPIRED, CANCELLED, REFUNDED
      if (statusResponse.data?.status === "PAID") {
        setPaymentConfirmed(true);
        
        // Limpar carrinho apenas quando pagamento for confirmado
        await clearCart();
        
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pedido foi efetuado com sucesso!",
        });
      } else if (statusResponse.data?.status === "PENDING") {
        toast({
          title: "Pagamento pendente",
          description: "O pagamento ainda não foi confirmado. Tente novamente em alguns minutos.",
        });
      } else if (statusResponse.data?.status === "EXPIRED") {
        toast({
          title: "PIX expirado",
          description: "O código PIX expirou. Gere um novo pagamento.",
          variant: "destructive"
        });
      } else if (statusResponse.data?.status === "CANCELLED") {
        toast({
          title: "Pagamento cancelado",
          description: "O pagamento foi cancelado.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Status desconhecido",
          description: `Status: ${statusResponse.data?.status || 'N/A'}. Verifique se o pagamento foi efetuado corretamente.`,
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: "Erro ao verificar pagamento",
        description: "Tente novamente em alguns minutos.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  if (paymentConfirmed) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Pedido Confirmado!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <h3 className="text-lg font-semibold mb-2">Seu pedido foi efetuado com sucesso!</h3>
            <p className="text-gray-600 mb-6">
              Você receberá uma confirmação por e-mail em breve.
            </p>
            <Button onClick={onClose} className="w-full">
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Pagamento via PIX
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informações do Cliente e Pagamento */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações do Pagamento
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Cliente:</span>
                <p className="text-blue-900">{customerData?.name || 'Nome não informado'}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Valor:
                </span>
                <p className="text-blue-900 font-semibold">
                  R$ {((orderTotal || paymentData?.data?.amount || 0) / 100).toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div>
                <span className="text-blue-700 font-medium flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  ID da Transação:
                </span>
                <p className="text-blue-900 font-mono text-xs">{paymentData?.data?.id || 'N/A'}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Status:</span>
                <p className="text-blue-900">{paymentData?.data?.status || 'PENDING'}</p>
              </div>
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Building className="h-4 w-4" />
              Dados do Recebedor
            </h3>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Empresa:</span> Borboleta Eventos</p>
              <p><span className="font-medium">CNPJ:</span> 12.345.678/0001-90</p>
              <p><span className="font-medium">Responsável:</span> Administração</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            {paymentData?.data?.brCodeBase64 ? (
              <img 
                src={paymentData.data.brCodeBase64}
                alt="QR Code PIX"
                className="w-48 h-48 border border-gray-200 rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">QR Code do PIX</span>
              </div>
            )}
          </div>

          {/* PIX Code */}
          {paymentData?.data?.brCode && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Código PIX (Copia e Cola):
              </label>
              <div className="flex items-center gap-2">
                <Input 
                  value={paymentData.data.brCode}
                  className="text-xs font-mono"
                  readOnly
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(paymentData.data!.brCode!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm">
            <p className="mb-2 font-semibold text-yellow-800">
              Como pagar:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-yellow-700">
              <li>Abra o aplicativo do seu banco</li>
              <li>Escaneie o QR Code ou copie o código PIX acima</li>
              <li>Confirme o pagamento no valor de R$ {((orderTotal || paymentData?.data?.amount || 0) / 100).toFixed(2).replace('.', ',')}</li>
              <li>Clique em "Já efetuei o pagamento" para verificar</li>
            </ol>
            
            {paymentData?.data?.expiresAt && (
              <div className="mt-3 p-2 bg-yellow-100 rounded text-yellow-800">
                <p className="text-xs">
                  <strong>Atenção:</strong> Este PIX expira em {new Date(paymentData.data.expiresAt).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={checkPaymentStatus}
              disabled={isCheckingPayment}
            >
              {isCheckingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Já efetuei o pagamento"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentPopup;