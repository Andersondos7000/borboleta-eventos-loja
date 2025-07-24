
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Copy, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import PaymentPopup from './PaymentPopup';

interface PaymentSectionProps {
  paymentData?: {
    data?: {
      brCodeBase64?: string;
      brCode?: string;
      id?: string;
    };
  } | null;
  isLoading?: boolean;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ paymentData, isLoading = false }) => {
  const { toast } = useToast();
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Código PIX copiado!",
      description: "O código PIX foi copiado para a área de transferência.",
    });
  };

  const openPaymentPopup = () => {
    if (paymentData) {
      setShowPaymentPopup(true);
    }
  };

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
            <p className="text-center text-gray-600">
              Finalize seu pedido para gerar o código de pagamento PIX.
            </p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-md p-5 mb-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Pagamento PIX Gerado!
                </h3>
                <p className="text-green-700 mb-4">
                  Seu código PIX foi gerado com sucesso. Clique no botão abaixo para abrir o QR Code e efetuar o pagamento.
                </p>
              </div>
              
              <Button 
                onClick={openPaymentPopup}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
              >
                Fazer Pagamento PIX
              </Button>
              
              <div className="text-xs text-green-600 mt-4">
                <p>• Escaneie o QR Code ou copie o código PIX</p>
                <p>• O pagamento será confirmado automaticamente</p>
              </div>
            </div>
          </div>
        )}
        
        <PaymentPopup 
          isOpen={showPaymentPopup}
          onClose={() => setShowPaymentPopup(false)}
          paymentData={paymentData}
        />
      </CardContent>
    </Card>
  );
};

export default PaymentSection;
