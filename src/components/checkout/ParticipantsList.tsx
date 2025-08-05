
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ParticipantsListProps {
  form: UseFormReturn<CheckoutFormData>;
  participantCount: number;
  onAddParticipant: () => void;
  onRemoveParticipant: (index: number) => void;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ 
  form, 
  participantCount, 
  onAddParticipant, 
  onRemoveParticipant 
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-butterfly-orange" />
            Participantes
          </h2>
          <Button type="button" variant="outline" onClick={onAddParticipant}>
            Adicionar Participante
          </Button>
        </div>

        {Array.from({ length: participantCount }).map((_, index) => (
          <div key={index} className="border p-4 rounded-md mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Participante {index + 1}</h3>
              {index > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onRemoveParticipant(index)}
                  className="h-8 text-red-500 hover:text-red-700"
                >
                  Remover
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`participants.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Participante (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do participante" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`participants.${index}.cpf`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF do Participante (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`participants.${index}.tshirt`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Camiseta (T-shirt)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        <SelectItem value="PP">PP</SelectItem>
                        <SelectItem value="P">P</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                        <SelectItem value="GG">GG</SelectItem>
                        <SelectItem value="EXGG">EXGG</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`participants.${index}.dress`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vestido</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="14">14</SelectItem>
                        <SelectItem value="16">16</SelectItem>
                        <SelectItem value="18">18</SelectItem>
                        <SelectItem value="GG">GG</SelectItem>
                        <SelectItem value="EXGG">EXGG</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ParticipantsList;
