
import React, { useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Info, Minus, Plus, Users, Settings } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from 'react-hook-form';
import ParticipantsModal from '@/components/ParticipantsModal';
import { ParticipantsManager } from '@/components/ParticipantsManager';
import { Participant } from '@/hooks/useParticipants';
import { toast } from '@/hooks/use-toast';

interface ParticipantsListProps {
  form: UseFormReturn<any>;
  participantCount: number;
  onAddParticipant: () => void;
  onRemoveParticipant: (index: number) => void;
  onParticipantCountChange?: (count: number) => void;
  ticketQuantity?: number;
  onTicketQuantityChange?: (quantity: number) => void;
  maxTickets?: number;
  minTickets?: number;
  showCaravanButton?: boolean;
  onCaravanParticipantsSave?: (participants: any[]) => void;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ 
  form, 
  participantCount, 
  onAddParticipant, 
  onRemoveParticipant,
  onParticipantCountChange,
  ticketQuantity = 1,
  onTicketQuantityChange,
  maxTickets = 5,
  minTickets = 1,
  showCaravanButton = false,
  onCaravanParticipantsSave
}) => {
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showParticipantsManager, setShowParticipantsManager] = useState(false);

  const handleSaveParticipants = (participants: any[]) => {
    // Aplicar participantes diretamente ao formulário
    if (participants && participants.length > 0) {
      // Atualizar o formulário com os participantes importados
      form.setValue('participants', participants);
      
      // Salvar também no estado de caravana se necessário
      if (onCaravanParticipantsSave) {
        onCaravanParticipantsSave(participants);
      }
    }
    setShowParticipantsModal(false);
  };

  // Função para aplicar participantes selecionados do gerenciador
  const handleSelectParticipantsFromManager = (selectedParticipants: Participant[]) => {
    // Converter participantes do banco para o formato do formulário
    const formattedParticipants = selectedParticipants.map(participant => ({
      name: participant.name,
      cpf: participant.cpf || '',
      tshirt: participant.shirt_size || '',
      dress: participant.dress_size || ''
    }));

    // Aplicar ao formulário
    form.setValue('participants', formattedParticipants);
    
    // Atualizar o contador de participantes
    if (onParticipantCountChange) {
      onParticipantCountChange(formattedParticipants.length);
    }
    
    // Opcionalmente, salvar no estado da caravana
    if (onCaravanParticipantsSave) {
      onCaravanParticipantsSave(formattedParticipants);
    }
    
    // Fechar modal e mostrar confirmação
    setShowParticipantsManager(false);
    
    toast({
      title: "Participantes aplicados!",
      description: `${formattedParticipants.length} participantes foram adicionados ao checkout.`,
    });
  };
  const handleTicketIncrement = () => {
    if (onTicketQuantityChange && ticketQuantity < maxTickets) {
      onTicketQuantityChange(ticketQuantity + 1);
    }
  };

  const handleTicketDecrement = () => {
    if (onTicketQuantityChange && ticketQuantity > minTickets) {
      onTicketQuantityChange(ticketQuantity - 1);
    }
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-butterfly-orange" />
            Participantes
          </h2>
          <div className="flex items-center gap-4">

            <div className="flex gap-2">
              <Dialog open={showParticipantsManager} onOpenChange={setShowParticipantsManager}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Gerenciar Participantes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gerenciador de Participantes</DialogTitle>
                  </DialogHeader>
                  <ParticipantsManager onSelectParticipants={handleSelectParticipantsFromManager} />
                </DialogContent>
              </Dialog>
              {showCaravanButton && (
                <Button 
                  type="button" 
                  className="flex items-center gap-2 bg-butterfly-orange hover:bg-butterfly-orange/90 text-white border-butterfly-orange"
                  onClick={() => setShowParticipantsModal(true)}
                >
                  <Users className="h-4 w-4" />
                  Participantes Caravana
                </Button>
              )}
              <Button 
                type="button" 
                className="bg-butterfly-orange hover:bg-butterfly-orange/90 text-white border-butterfly-orange"
                onClick={onAddParticipant}
              >
                Adicionar Participante
              </Button>
            </div>
          </div>
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
        
        {showParticipantsModal && (
           <ParticipantsModal
             isOpen={showParticipantsModal}
             onClose={() => setShowParticipantsModal(false)}
             onSave={handleSaveParticipants}
             quantity={ticketQuantity}
           />
         )}
      </CardContent>
    </Card>
  );
};

export default ParticipantsList;
