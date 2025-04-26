
import React from 'react';
import { FormField, FormItem, FormControl, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from 'react-router-dom';
import { UseFormReturn } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { ArrowRight } from 'lucide-react';

interface TermsSectionProps {
  form: UseFormReturn<any>;
  total: number;
}

const TermsSection: React.FC<TermsSectionProps> = ({ form, total }) => {
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
                  Eu li e concordo com os <Link to="#" className="text-butterfly-orange hover:underline">Termos de Serviço</Link> e <Link to="#" className="text-butterfly-orange hover:underline">Política de Privacidade</Link>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        
        <div className="mt-6">
          <Button
            type="submit"
            className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90 text-white py-3 text-lg"
          >
            Fazer Pedido R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TermsSection;
