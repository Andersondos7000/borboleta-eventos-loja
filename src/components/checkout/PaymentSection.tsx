
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Copy, Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface PaymentSectionProps {
  pixData: any;
  isLoading: boolean;
  error: string | null;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ pixData, isLoading, error }) => {
  const { toast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Código PIX copiado!" });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-butterfly-orange" />
          Método de Pagamento
        </h2>
        
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md p-5 mb-4">
          {/* Instruções de pagamento */}
          <div className="flex items-center mb-4">
            <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2"><span className="font-bold">1</span></div>
            <p className="font-medium">Abra o aplicativo do seu banco</p>
          </div>
          <div className="flex items-center mb-4">
            <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2"><span className="font-bold">2</span></div>
            <p className="font-medium">Escaneie o QR Code ou copie o código abaixo</p>
          </div>
          <div className="flex items-center mb-4">
            <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2"><span className="font-bold">3</span></div>
            <p className="font-medium">Confirme o pagamento no seu app</p>
          </div>

          <div className="mt-6 flex flex-col items-center">
            {isLoading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-butterfly-orange" />
              </div>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : pixData ? (
              <>
                <img src={pixData.qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 mb-4" />
                <div className="flex items-center w-full max-w-md">
                  <Input 
                    value={pixData.pixCode}
                    className="text-xs"
                    readOnly
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="ml-2" 
                    onClick={() => handleCopy(pixData.pixCode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSection;
