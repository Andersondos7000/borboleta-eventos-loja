
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Copy } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const PaymentSection: React.FC = () => {
  const { toast } = useToast();
  
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Lock className="h-5 w-5 text-butterfly-orange" />
          Método de Pagamento
        </h2>
        
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
            <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
              <span className="text-gray-500">QR Code do PIX</span>
            </div>
            
            <div className="flex items-center w-full max-w-md">
              <Input 
                value="00020126330014BR.GOV.BCB.PIX01112345678901520400005303986540105XXXXX"
                className="text-xs"
                readOnly
              />
              <Button 
                type="button" 
                variant="outline" 
                className="ml-2" 
                onClick={() => {
                  navigator.clipboard.writeText("00020126330014BR.GOV.BCB.PIX01112345678901520400005303986540105XXXXX");
                  toast({ title: "Código PIX copiado!" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSection;
