
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Copy, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface PaymentSectionProps {
  paymentData?: {
    qr_code_base64?: string;
    qr_code?: string;
    payment_url?: string;
  } | null;
  isLoading?: boolean;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ paymentData, isLoading = false }) => {
  const { toast } = useToast();
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Código PIX copiado!",
      description: "O código PIX foi copiado para a área de transferência.",
    });
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
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md p-5 mb-4">
            <div className="flex items-center mb-4">
              <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2">
                <span className="font-bold">1</span>
              </div>
              <p className="font-medium">Abra o aplicativo do seu banco</p>
            </div>
            
            <div className="flex items-center mb-4">
              <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2">
                <span className="font-bold">2</span>
              </div>
              <p className="font-medium">Escaneie o QR Code ou copie o código abaixo</p>
            </div>
            
            <div className="flex items-center mb-4">
              <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2">
                <span className="font-bold">3</span>
              </div>
              <p className="font-medium">Confirme o pagamento no seu app</p>
            </div>
            
            <div className="mt-6 flex flex-col items-center">
              {paymentData.qr_code_base64 ? (
                <img 
                  src={`data:image/png;base64,${paymentData.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 mb-4"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-gray-500">QR Code do PIX</span>
                </div>
              )}
              
              {paymentData.qr_code && (
                <div className="flex items-center w-full max-w-md">
                  <Input 
                    value={paymentData.qr_code}
                    className="text-xs"
                    readOnly
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="ml-2" 
                    onClick={() => copyToClipboard(paymentData.qr_code!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="text-xs text-gray-500 mt-4 text-center">
              <p>• Após o pagamento, seu pedido será processado automaticamente</p>
              <p>• Você receberá uma confirmação por e-mail</p>
              <p>• O pagamento pode levar alguns minutos para ser confirmado</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSection;
