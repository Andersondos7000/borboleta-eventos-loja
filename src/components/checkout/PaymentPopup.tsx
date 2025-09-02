import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, X, Loader2, CheckCircle, RefreshCw, QrCode, Clock, AlertCircle, Download } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { usePayment, usePaymentFormatters } from "@/hooks/usePayment";
import type { PaymentResponse } from "@/lib/abacatepay";

interface PaymentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData?: PaymentResponse['data'] | null;
  onPaymentConfirmed?: () => void;
}

const PaymentPopup: React.FC<PaymentPopupProps> = ({ 
  isOpen, 
  onClose, 
  paymentData, 
  onPaymentConfirmed 
}) => {
  const { toast } = useToast();
  const { formatCurrency } = usePaymentFormatters();
  
  // Hook de pagamento com configurações
  const {
    isPolling,
    paymentStatus,
    timeRemaining,
    copyPixCode,
    downloadQRCode,
    checkStatus,
    startPolling,
    stopPolling
  } = usePayment({
    onSuccess: (data) => {
      toast({
        title: "Pagamento Confirmado!",
        description: "Seu pagamento foi processado com sucesso.",
      });
      onPaymentConfirmed?.();
    },
    onError: (error) => {
      toast({
        title: "Erro no Pagamento",
        description: error,
        variant: "destructive"
      });
    },
    onStatusChange: (status) => {
      console.log('Status do pagamento alterado:', status);
    },
    pollingInterval: 3000, // 3 segundos
    maxPollingAttempts: 200 // 10 minutos
  });

  const [hasStartedPolling, setHasStartedPolling] = useState(false);

  // Iniciar polling quando o popup abrir e houver dados de pagamento
  useEffect(() => {
    if (isOpen && paymentData?.orderId && !hasStartedPolling && paymentStatus !== 'paid') {
      console.log('🚀 Iniciando polling para orderId:', paymentData.orderId);
      startPolling(paymentData.orderId);
      setHasStartedPolling(true);
    }
    
    if (!isOpen && hasStartedPolling) {
      console.log('⏹️ Parando polling - popup fechado');
      stopPolling();
      setHasStartedPolling(false);
    }
  }, [isOpen, paymentData?.orderId, hasStartedPolling, paymentStatus, startPolling, stopPolling]);

  // Cleanup ao fechar
  useEffect(() => {
    return () => {
      if (hasStartedPolling) {
        stopPolling();
      }
    };
  }, [stopPolling, hasStartedPolling]);

  // Função para copiar código PIX usando o hook
  const handleCopyPixCode = useCallback(async () => {
    const success = await copyPixCode();
    if (success) {
      toast({
        title: "Código PIX copiado!",
        description: "O código PIX foi copiado para a área de transferência.",
      });
    } else {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código PIX.",
        variant: "destructive"
      });
    }
  }, [copyPixCode, toast]);

  // Função para baixar QR Code
  const handleDownloadQRCode = useCallback(() => {
    downloadQRCode();
    toast({
      title: "QR Code baixado!",
      description: "O QR Code foi salvo em seus downloads.",
    });
  }, [downloadQRCode, toast]);

  // Função para verificar status manualmente
  const handleCheckStatus = useCallback(async () => {
    if (paymentData?.orderId) {
      await checkStatus(paymentData.orderId);
    }
  }, [checkStatus, paymentData?.orderId]);

  // Função para formatar tempo restante
  const formatTimeRemaining = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  // Determinar se o pagamento foi confirmado
  const isPaymentConfirmed = paymentStatus === 'paid';
  const isPaymentExpired = paymentStatus === 'expired' || timeRemaining === 'Expirado';
  const isPaymentPending = paymentStatus === 'pending' || paymentStatus === null;

  // Função para fechar o popup
  const handleClose = useCallback(() => {
    stopPolling();
    setHasStartedPolling(false);
    onClose();
  }, [stopPolling, onClose]);

  if (isPaymentConfirmed) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
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
            <Button onClick={handleClose} className="w-full">
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
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code ou copie o código PIX para efetuar o pagamento
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Pagamento via PIX</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Escaneie o QR Code ou copie o código PIX para efetuar o pagamento
            </p>
            
            {/* Timer de expiração */}
            {timeRemaining !== null && timeRemaining !== 'Expirado' && typeof timeRemaining === 'number' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-center gap-2 text-yellow-800">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Expira em: {formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
              </div>
            )}
            
            {isPaymentExpired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-center gap-2 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Código PIX expirado
                  </span>
                </div>
              </div>
            )}
            
            {paymentData?.amount && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="text-center">
                  <span className="text-sm text-blue-600">Valor:</span>
                  <div className="text-xl font-bold text-blue-800">
                    {formatCurrency(paymentData.amount)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            {isPaymentConfirmed ? (
              <div className="w-64 h-64 border-2 border-green-300 rounded-lg flex flex-col items-center justify-center bg-green-50">
                <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                <span className="text-green-700 font-semibold text-lg">Pagamento Confirmado!</span>
                <span className="text-green-600 text-sm mt-2">Obrigado pela sua compra</span>
              </div>
            ) : isPaymentExpired ? (
              <div className="w-64 h-64 border-2 border-red-300 rounded-lg flex flex-col items-center justify-center bg-red-50">
                <AlertCircle className="h-16 w-16 text-red-600 mb-4" />
                <span className="text-red-700 font-semibold text-lg">Código Expirado</span>
                <span className="text-red-600 text-sm mt-2">Gere um novo código PIX</span>
              </div>
            ) : paymentData?.qrCode ? (
              <div className="relative">
                <img 
                  src={paymentData.qrCode} 
                  alt="QR Code PIX" 
                  className="w-64 h-64 border-2 border-blue-300 rounded-lg shadow-lg"
                />
                <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-2">
                  <QrCode className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <div className="w-64 h-64 border-2 border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                  <span className="text-gray-500">Carregando QR Code...</span>
                </div>
              </div>
            )}
          </div>

          {/* Código PIX Copia e Cola */}
          {!isPaymentConfirmed && !isPaymentExpired && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Copy className="h-4 w-4 text-gray-600" />
                <label className="text-sm font-medium text-gray-700">
                  Código PIX (Copia e Cola)
                </label>
              </div>
              
              {paymentData?.payload ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white border border-gray-200 rounded p-2">
                      <code className="text-xs font-mono text-gray-800 break-all leading-relaxed">
                        {paymentData.payload}
                      </code>
                    </div>
                    <Button
                      onClick={handleCopyPixCode}
                      variant="outline"
                      size="sm"
                      className="px-3 shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Toque no botão para copiar o código e cole no seu app do banco
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-500">Gerando código PIX...</span>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!isPaymentConfirmed && !isPaymentExpired && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Como pagar:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escaneie o QR Code ou copie o código PIX</li>
                <li>3. Confirme o pagamento</li>
                <li>4. Aguarde a confirmação automática</li>
              </ol>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isPaymentConfirmed ? (
              <Button
                onClick={handleClose}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Continuar
              </Button>
            ) : isPaymentExpired ? (
              <>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1"
                >
                  Gerar Novo Código
                </Button>
                <Button
                  onClick={handleClose}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleClose}
                >
                  Cancelar Pagamento
                </Button>
                <Button 
                  className="flex-1"
                  onClick={handleCheckStatus}
                  disabled={isPolling}
                >
                  {isPolling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Já efetuei o pagamento"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentPopup;