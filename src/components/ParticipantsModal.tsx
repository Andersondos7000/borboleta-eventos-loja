import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Users, Plus, Minus, Download, Upload, X, FileUp, FileDown, List, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  id: string;
  name: string;
  cpf: string;
  shirtSize: string;
  dressSize: string;
}

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quantity: number;
  onSave: (participants: Participant[]) => void;
}

const ParticipantsModal: React.FC<ParticipantsModalProps> = ({
  isOpen,
  onClose,
  quantity,
  onSave
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [importedParticipants, setImportedParticipants] = useState<Participant[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const { toast } = useToast();

  // Inicializar participantes quando a quantidade mudar
  useEffect(() => {
    const newParticipants: Participant[] = [];
    for (let i = 0; i < quantity; i++) {
      newParticipants.push({
        id: `participant-${Date.now()}-${i + 1}`,
        name: '',
        cpf: '',
        shirtSize: '',
        dressSize: ''
      });
    }
    setParticipants(newParticipants);
  }, [quantity]);

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = {
      ...updatedParticipants[index],
      [field]: value
    };
    setParticipants(updatedParticipants);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) {
      toast({
        title: "Atenção",
        description: "Deve haver pelo menos um participante.",
        variant: "destructive"
      });
      return;
    }

    const participantName = participants[index].name || `Participante ${index + 1}`;
    const updatedParticipants = participants.filter((_, i) => i !== index);
    setParticipants(updatedParticipants);
    
    toast({
      title: "Participante removido!",
      description: `${participantName} foi removido da lista.`,
      duration: 3000,
    });
  };

  const addParticipant = () => {
    const newParticipant: Participant = {
      id: `participant-${Date.now()}`,
      name: '',
      cpf: '',
      shirtSize: '',
      dressSize: ''
    };
    setParticipants([...participants, newParticipant]);
    
    toast({
      title: "Participante adicionado!",
      description: `Novo participante foi adicionado à lista.`,
      duration: 3000,
    });
  };

  const launchImportedParticipants = () => {
    if (importedParticipants.length === 0) {
      toast({
        title: "Nenhum participante importado",
        description: "Importe um arquivo CSV primeiro.",
        variant: "destructive"
      });
      return;
    }

    // Converter participantes importados para o formato esperado pelo checkout
    const formattedParticipants = importedParticipants.map((participant, index) => ({
      name: participant.name || '',
      cpf: participant.cpf || '',
      tshirt: participant.shirtSize || '',
      dress: participant.dressSize || ''
    }));

    // Enviar participantes diretamente para o checkout
    onSave(formattedParticipants);
    
    toast({
      title: "Participantes lançados no checkout!",
      description: `${importedParticipants.length} participantes foram enviados para os campos do checkout.`,
      duration: 3000,
    });
    
    // Fechar o modal após lançar
    onClose();
  };

  const clearImportedParticipants = () => {
    setImportedParticipants([]);
    toast({
      title: "Lista limpa",
      description: "Lista de participantes importados foi removida.",
      duration: 3000,
    });
  };

  const handleSave = () => {
    // Validar se pelo menos alguns campos estão preenchidos
    const filledParticipants = participants.filter(p => p.name.trim() !== '');
    
    if (filledParticipants.length === 0) {
      toast({
        title: "Atenção",
        description: "Preencha pelo menos um participante.",
        variant: "destructive"
      });
      return;
    }

    onSave(participants);
    toast({
      title: "Sucesso",
      description: `Dados de ${filledParticipants.length} participantes salvos.`,
    });
    onClose();
  };

  const importCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const csv = event.target?.result as string;
          const lines = csv.split('\n');
          const headers = lines[0].split(',');
          
          const importedParticipants: Participant[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            if (values.length >= 4 && values[0].trim()) {
              importedParticipants.push({
                id: `imported-${Date.now()}-${i}`,
                name: values[0].trim(),
                cpf: values[1].trim(),
                shirtSize: values[2].trim(),
                dressSize: values[3].trim()
              });
            }
          }
          
          if (importedParticipants.length > 0) {
            setImportedParticipants(importedParticipants);
            toast({
              title: "CSV importado",
              description: `${importedParticipants.length} participantes importados. Use 'Gerenciar' para visualizar e 'Lançar' para distribuir nos campos.`,
              duration: 5000,
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const exportData = () => {
    const csvContent = [
      'Nome,CPF,Camiseta,Vestido',
      ...participants.map(p => `${p.name || ''},${p.cpf || ''},${p.shirtSize || ''},${p.dressSize || ''}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes-caravana-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "CSV exportado!",
      description: `Arquivo com ${participants.length} participantes foi baixado.`,
      duration: 3000,
    });
  };

  const shirtSizes = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
  const dressSizes = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-butterfly-orange" />
            Caravanas ({quantity} ingressos)
          </DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            Preencha os dados dos participantes para facilitar a organização do evento.
          </p>
          
          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="flex gap-2">
              <Button
                onClick={importCSV}
                className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-2"
                size="sm"
              >
                <FileUp className="h-4 w-4" />
                Importar CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                className="flex items-center gap-2 border-gray-300 hover:bg-gray-50"
              >
                <FileDown className="h-4 w-4" />
                Exportar CSV
              </Button>
              {importedParticipants.length > 0 && (
                <>
                  <Button
                    onClick={() => setShowManageModal(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <List className="h-4 w-4" />
                    Gerenciar ({importedParticipants.length})
                  </Button>
                  <Button
                    onClick={launchImportedParticipants}
                    className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
                    size="sm"
                  >
                    <ArrowDown className="h-4 w-4" />
                    Lançar
                  </Button>
                </>
              )}
            </div>
            
            <Button
              onClick={addParticipant}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-butterfly-orange text-butterfly-orange hover:bg-butterfly-orange hover:text-white"
            >
              <Plus className="h-4 w-4" />
              Adicionar Participantes
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {participants.map((participant, index) => (
              <Card key={participant.id} className="border-l-4 border-l-butterfly-orange relative">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Participante {index + 1}</CardTitle>
                    {participants.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParticipant(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                        title="Remover participante"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${index}`} className="text-sm font-medium text-gray-700">
                        Nome do Participante (opcional)
                      </Label>
                      <Input
                        id={`name-${index}`}
                        placeholder="Nome completo"
                        value={participant.name}
                        onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                        className="border-gray-300 focus:border-butterfly-orange focus:ring-butterfly-orange"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`cpf-${index}`} className="text-sm font-medium text-gray-700">
                        CPF do Participante (opcional)
                      </Label>
                      <Input
                        id={`cpf-${index}`}
                        placeholder="000.000.000-00"
                        value={participant.cpf}
                        onChange={(e) => updateParticipant(index, 'cpf', e.target.value)}
                        className="border-gray-300 focus:border-butterfly-orange focus:ring-butterfly-orange"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Camiseta (T-shirt)</Label>
                      <Select
                        value={participant.shirtSize}
                        onValueChange={(value) => updateParticipant(index, 'shirtSize', value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-butterfly-orange focus:ring-butterfly-orange">
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                          {shirtSizes.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Vestido</Label>
                      <Select
                        value={participant.dressSize}
                        onValueChange={(value) => updateParticipant(index, 'dressSize', value)}
                      >
                        <SelectTrigger className="border-gray-300 focus:border-butterfly-orange focus:ring-butterfly-orange">
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                        <SelectContent>
                          {dressSizes.map(size => (
                            <SelectItem key={size} value={size}>{size}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6 py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            className="px-6 py-2 bg-butterfly-orange hover:bg-butterfly-orange/90 text-white font-medium"
          >
            Salvar Participantes
          </Button>
        </DialogFooter>
      </DialogContent>
      
      {/* Modal de Gerenciamento de Participantes Importados */}
      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-green-600" />
              Gerenciar Participantes Importados ({importedParticipants.length})
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-3">
              {importedParticipants.map((participant, index) => (
                <Card key={participant.id} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="font-medium text-gray-700">Nome:</Label>
                        <p className="text-gray-900">{participant.name || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="font-medium text-gray-700">CPF:</Label>
                        <p className="text-gray-900">{participant.cpf || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="font-medium text-gray-700">Camiseta:</Label>
                        <p className="text-gray-900">{participant.shirtSize || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="font-medium text-gray-700">Vestido:</Label>
                        <p className="text-gray-900">{participant.dressSize || 'Não informado'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <Button
              onClick={clearImportedParticipants}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Lista
            </Button>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowManageModal(false)}
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  launchImportedParticipants();
                  setShowManageModal(false);
                }}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Lançar nos Campos
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default ParticipantsModal;