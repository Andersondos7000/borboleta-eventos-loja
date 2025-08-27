import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, X, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData?: {
    data?: {
      qrCode?: string;
      payload?: string;
      transactionId?: string;
      id?: string;
    };
  } | null;
}

const PaymentPopup: React.FC<PaymentPopupProps> = ({ isOpen, onClose, paymentData }) => {
  const { toast } = useToast();
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Código PIX copiado!",
      description: "O código PIX foi copiado para a área de transferência.",
    });
  };

  const checkPaymentStatus = async () => {
    if (!paymentData?.data?.transactionId && !paymentData?.data?.id) {
      toast({
        title: "Erro",
        description: "ID da transação não encontrado.",
        variant: "destructive"
      });
      return;
    }

    setIsCheckingPayment(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para verificar o pagamento.",
          variant: "destructive"
        });
        return;
      }

      const { data: statusResponse, error } = await supabase.functions.invoke('check-abacate-payment', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        },
        body: {
          transactionId: paymentData.data.transactionId || paymentData.data.id
        }
      });

      if (error) {
        throw error;
      }

      if (statusResponse.data?.status === "APPROVED") {
        setPaymentConfirmed(true);
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pedido foi efetuado com sucesso!",
        });
      } else if (statusResponse.data?.status === "PENDING") {
        toast({
          title: "Pagamento pendente",
          description: "O pagamento ainda não foi confirmado. Tente novamente em alguns minutos.",
        });
      } else {
        toast({
          title: "Pagamento não confirmado",
          description: "O pagamento ainda não foi processado. Verifique se foi efetuado corretamente.",
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
            <DialogDescription>
              Confirmação do pedido efetuado com sucesso
            </DialogDescription>
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
          <DialogDescription>
            Escaneie o QR Code ou copie o código PIX para efetuar o pagamento
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* QR Code */}
          <div className="flex flex-col items-center">
            {paymentData?.data?.qrCode ? (
              <img 
                src={paymentData.data.qrCode}
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
          {paymentData?.data?.payload && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Código PIX (Copia e Cola):
              </label>
              <div className="flex items-center gap-2">
                <Input 
                  value={paymentData.data.payload}
                  className="text-xs"
                  readOnly
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(paymentData.data!.payload!)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
            <p className="mb-2">
              <strong>Como pagar:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Abra o aplicativo do seu banco</li>
              <li>Escaneie o QR Code ou copie o código PIX</li>
              <li>Confirme o pagamento</li>
              <li>Clique em "Já efetuei o pagamento" para verificar</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
            >
              Cancelar Pagamento
            </Button>
            <Button 
              className="flex-1"
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