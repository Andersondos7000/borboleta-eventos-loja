
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { UseFormReturn } from 'react-hook-form';

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

interface AdditionalNotesProps {
  form: UseFormReturn<CheckoutFormData>;
}

const AdditionalNotes: React.FC<AdditionalNotesProps> = ({ form }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold mb-4">Informação Adicional</h2>

        <FormField
          control={form.control}
          name="additionalNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas do Pedido (opcional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Informações adicionais sobre seu pedido, perguntas ou comentários especiais..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default AdditionalNotes;
