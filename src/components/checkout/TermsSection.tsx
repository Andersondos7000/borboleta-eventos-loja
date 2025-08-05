
import React from 'react';
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from 'react-router-dom';
import { UseFormReturn } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

interface CheckoutFormData {
  firstName: string;
  lastName: string;
  personType: "fisica" | "juridica";
  cpf: string;
  country: string;
  zipCode: string;
  address: string;
  number: string;
  neighborhood?: string;
  city: string;
  state: string;
  phone: string;
  additionalNotes?: string;
  participants: Array<{
    name?: string;
    cpf?: string;
    tshirt?: string;
    dress?: string;
  }>;
  terms: boolean;
}

interface TermsSectionProps {
  form: UseFormReturn<CheckoutFormData>;
  total: number;
  isProcessing?: boolean;
}

const TermsSection: React.FC<TermsSectionProps> = ({ form, total, isProcessing = false }) => {
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
            type="submit"
            disabled={isProcessing}
            className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90 text-white py-3 text-lg disabled:opacity-50"
          >
            {isProcessing ? "Processando..." : `Fazer Pedido R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TermsSection;
