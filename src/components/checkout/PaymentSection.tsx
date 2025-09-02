
import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Loader2, CreditCard, QrCode } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import PaymentPopup from './PaymentPopup';
import { usePayment } from '@/hooks/usePayment';
import type { PaymentResponse } from '@/lib/abacatepay';

interface PaymentSectionProps {
  paymentData?: PaymentResponse['data'] | null;
  isLoading?: boolean;
  onPaymentSuccess?: (payment: PaymentResponse['data']) => void;
  onPaymentError?: (error: Error) => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  paymentData, 
  isLoading = false,
  onPaymentSuccess,
  onPaymentError
}) => {
  const { toast } = useToast();
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  
  const {
    paymentStatus,
    isPolling,
    error: paymentError,
    copyPixCode,
    downloadQRCode
  } = usePayment({
    onSuccess: useCallback((payment) => {
      toast({
        title: "🎉 Pagamento confirmado!",
        description: "Seu pagamento foi processado com sucesso.",
      });
      setShowPaymentPopup(false);
      onPaymentSuccess?.(payment);
    }, [toast, onPaymentSuccess]),
    
    onError: useCallback((error: string) => {
      toast({
        title: "Erro no pagamento",
        description: error || "Ocorreu um erro durante o processamento do pagamento.",
        variant: "destructive"
      });
      onPaymentError?.(new Error(error || "Erro desconhecido"));
    }, [toast, onPaymentError]),
    
    pollingInterval: 5000,
    maxPollingAttempts: 60 // 5 minutos de polling
  });

  const openPaymentPopup = useCallback(() => {
    if (paymentData) {
      setShowPaymentPopup(true);
    }
  }, [paymentData]);

  const handleCopyPixCode = useCallback(async () => {
    if (paymentData?.payload) {
      const success = await copyPixCode();
      if (success) {
        toast({
          title: "Código PIX copiado!",
          description: "O código PIX foi copiado para a área de transferência.",
        });
      }
    }
  }, [paymentData?.payload, copyPixCode, toast]);

  const handleDownloadQRCode = useCallback(() => {
    if (paymentData?.qrCode) {
      downloadQRCode();
      toast({
        title: "QR Code baixado!",
        description: "O QR Code foi salvo em seus downloads.",
      });
    }
  }, [paymentData?.qrCode, downloadQRCode, toast]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-butterfly-orange animate-spin" />
            Gerando Pagamento...
          </h2>
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-butterfly-orange" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-butterfly-orange" />
          {paymentData ? "Pagamento via PIX" : "Método de Pagamento"}
        </h2>
        
        {!paymentData ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md p-5 mb-4">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                Finalize seu pedido para gerar o código de pagamento PIX.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status do Pagamento */}
            {paymentStatus === 'paid' && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">Pagamento Confirmado!</h3>
                    <p className="text-sm text-green-700">Seu pagamento foi processado com sucesso.</p>
                  </div>
                </div>
              </div>
            )}
            
            {paymentStatus === 'expired' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">Pagamento Expirado</h3>
                    <p className="text-sm text-red-700">O tempo para pagamento expirou. Gere um novo código PIX.</p>
                  </div>
                </div>
              </div>
            )}
            
            {(paymentStatus === 'pending' || !paymentStatus) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-5">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <QrCode className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                      Pagamento PIX Gerado!
                    </h3>
                    <p className="text-blue-700 mb-4">
                      Seu código PIX foi gerado com sucesso. Use uma das opções abaixo para efetuar o pagamento.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      onClick={openPaymentPopup}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Abrir QR Code
                    </Button>
                    
                    <Button 
                      onClick={handleCopyPixCode}
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      Copiar Código PIX
                    </Button>
                    
                    {paymentData.qrCode && (
                      <Button 
                        onClick={handleDownloadQRCode}
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Baixar QR Code
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-xs text-blue-600 mt-4 space-y-1">
                    <p>• Escaneie o QR Code com seu app bancário</p>
                    <p>• Ou copie e cole o código PIX</p>
                    <p>• O pagamento será confirmado automaticamente</p>
                    {isPolling && (
                      <p className="flex items-center justify-center gap-1 text-blue-700 font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Aguardando confirmação...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Erro de Pagamento */}
            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-red-800">Erro no Pagamento</h3>
                    <p className="text-sm text-red-700">{paymentError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <PaymentPopup 
          isOpen={showPaymentPopup}
          onClose={() => setShowPaymentPopup(false)}
          paymentData={paymentData}
          onPaymentConfirmed={() => {
            setShowPaymentPopup(false);
            onPaymentSuccess?.(paymentData!);
          }}
        />
      </CardContent>
    </Card>
  );
};

export default PaymentSection;
