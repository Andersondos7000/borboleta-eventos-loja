import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    customer: {
      name: string;
      email: string;
      phone: string;
      document: string;
    };
    amount: number;
    description: string;
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
    }>;
  };
  onPaymentSuccess?: (paymentData: any) => void;
  onPaymentError?: (error: { message: string }) => void;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  orderData,
  onPaymentSuccess,
  onPaymentError
}) => {
  const { toast } = useToast();
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  const generatePixPayment = async () => {
    setIsLoading(true);
    try {
      // Simular geração de PIX para demonstração
      const mockPixPayment = {
        id: `pix_${Date.now()}`,
        status: 'pending',
        payment_method_id: 'pix',
        transaction_amount: orderData.amount,
        description: orderData.description,
        point_of_interaction: {
          type: 'PIX',
          transaction_data: {
            qr_code: '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540510.005802BR5925NOME DO RECEBEDOR6009SAO PAULO62070503***6304ABCD',
            qr_code_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            ticket_url: `https://example.com/payments/${Date.now()}/ticket?caller_id=123456&hash=abc123`
          }
        },
        payer: {
          email: orderData.customer.email,
          first_name: orderData.customer.name && typeof orderData.customer.name === 'string' ? orderData.customer.name.split(' ')[0] : 'Cliente',
          phone: { number: orderData.customer.phone }
        }
      };

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPixPayment(mockPixPayment);
      setPaymentStatus('pending');
      
      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código para pagar.",
      });
      
    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      onPaymentError?.({ message: 'Erro ao gerar código PIX' });
      toast({
        title: "Erro ao gerar PIX",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixPayment?.point_of_interaction?.transaction_data?.qr_code) {
      await navigator.clipboard.writeText(pixPayment.point_of_interaction.transaction_data.qr_code);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no seu app bancário para pagar.",
      });
    }
  };

  // Gerar PIX automaticamente quando o modal abrir
  useEffect(() => {
    if (isOpen && !pixPayment) {
      generatePixPayment();
    }
  }, [isOpen]);

  // Simular verificação de status do pagamento
  useEffect(() => {
    if (pixPayment && paymentStatus === 'pending') {
      const interval = setInterval(() => {
        // Simular aprovação após 30 segundos para demonstração
        const shouldApprove = Math.random() > 0.95; // 5% de chance a cada verificação
        if (shouldApprove) {
          setPaymentStatus('approved');
          onPaymentSuccess?.(pixPayment);
          toast({
            title: "Pagamento aprovado!",
            description: "Seu pedido foi confirmado com sucesso.",
          });
          clearInterval(interval);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [pixPayment, paymentStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs py-1 px-2 rounded">Aguardando Pagamento</span>;
      case 'approved':
        return <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded">Pago</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 text-xs py-1 px-2 rounded">Rejeitado</span>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Pagamento PIX</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Pedido */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Resumo do Pedido</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span>{orderData.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-semibold text-lg">{formatCurrency(orderData.amount)}</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                {orderData.items.map((item, index) => (
                  <div key={`${item.title}-${index}`}>
                    {item.quantity}x {item.title} - {formatCurrency(item.unit_price)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status do Pagamento */}
          {paymentStatus && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge(paymentStatus)}
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterfly-orange"></div>
              <span className="ml-2">Gerando código PIX...</span>
            </div>
          )}

          {/* PIX Payment */}
          {pixPayment && !isLoading && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg border">
                  <QRCodeSVG 
                    value={pixPayment.point_of_interaction?.transaction_data?.qr_code || ''} 
                    size={200}
                    level="M"
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Escaneie o QR Code com o app do seu banco
                </p>
              </div>
              
              {/* PIX Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Código PIX (Copia e Cola):</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={pixPayment.point_of_interaction?.transaction_data?.qr_code || ''} 
                    readOnly 
                    className="flex-1 p-2 border rounded text-xs font-mono bg-gray-50"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={copyPixCode}
                  >
                    {copiedPix ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  O código PIX expira em 30 minutos. Após o pagamento, 
                  a confirmação pode levar até 2 minutos.
                </AlertDescription>
              </Alert>

              {/* Payment Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Como pagar:</h4>
                <ol className="text-sm text-blue-800 space-y-1">
                  <li>1. Abra o app do seu banco</li>
                  <li>2. Escolha a opção PIX</li>
                  <li>3. Escaneie o QR Code ou cole o código</li>
                  <li>4. Confirme o pagamento</li>
                </ol>
              </div>
            </div>
          )}

          {/* Error State */}
          {!pixPayment && !isLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Erro ao gerar código PIX. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-normal underline ml-1"
                  onClick={generatePixPayment}
                >
                  Tente novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;