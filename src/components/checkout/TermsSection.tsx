
import React, { useState } from 'react';
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from 'react-router-dom';
import { UseFormReturn } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';
import PixPaymentModal from '@/components/PixPaymentModal';

interface TermsSectionProps {
  form: UseFormReturn<any>;
  total: number;
  isProcessing?: boolean;
  onSubmit?: (data: any) => void;
  orderData?: {
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
}

const TermsSection: React.FC<TermsSectionProps> = ({ form, total, isProcessing = false, onSubmit, orderData }) => {
  const [showPixModal, setShowPixModal] = useState(false);
  const [shouldOpenModal, setShouldOpenModal] = useState(false);

  // Monitor orderData changes and open modal when it becomes available
  React.useEffect(() => {
    if (shouldOpenModal && orderData && !showPixModal) {
      setShowPixModal(true);
      setShouldOpenModal(false);
    }
  }, [orderData, shouldOpenModal, showPixModal]);

  const handleMakeOrder = () => {
    if (orderData) {
      setShowPixModal(true);
    } else {
      // Mark that we should open modal after form submission
      setShouldOpenModal(true);
      // Trigger form submission with the actual onSubmit function
      if (onSubmit) {
        form.handleSubmit(onSubmit)();
      }
    }
  };

  const handlePixPaymentSuccess = (paymentData: any) => {
    console.log('Pagamento PIX aprovado:', paymentData);
    setShowPixModal(false);
    // Process order after payment
    const formElement = form.handleSubmit(() => {});
    formElement();
  };

  const handlePixPaymentError = (error: { message: string }) => {
    console.error('Erro no pagamento PIX:', error);
    setShowPixModal(false);
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Eu li e concordo com os <Link to="/termos" className="text-butterfly-orange hover:underline">Termos de Serviço</Link> e <Link to="/privacidade" className="text-butterfly-orange hover:underline">Política de Privacidade</Link>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        
        <div className="mt-6">
          <Button
            type="button"
            onClick={handleMakeOrder}
            disabled={isProcessing}
            className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90 text-white py-3 text-lg disabled:opacity-50"
          >
            {isProcessing ? "Processando..." : `Fazer Pedido R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Modal PIX */}
        {orderData && (
          <PixPaymentModal
            isOpen={showPixModal}
            onClose={() => setShowPixModal(false)}
            orderData={orderData}
            onPaymentSuccess={handlePixPaymentSuccess}
            onPaymentError={handlePixPaymentError}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default TermsSection;
