import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useParticipants, Participant, ParticipantFormData } from '@/hooks/useParticipants';
import { toast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, Download, Upload, CheckSquare, Square } from 'lucide-react';

interface ParticipantsManagerProps {
  onSelectParticipants?: (participants: Participant[]) => void;
  selectedParticipants?: Participant[];
  showSelection?: boolean;
}

const SHIRT_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];
const DRESS_SIZES = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'];

export const ParticipantsManager: React.FC<ParticipantsManagerProps> = ({
  onSelectParticipants,
  selectedParticipants = [],
  showSelection = true // Habilitar seleção por padrão
}) => {
  const {
    participants,
    loading,
    createParticipant,
    updateParticipant,
    deleteParticipant,
    createMultipleParticipants,
    updateMultipleParticipantsStatus,
    deleteMultipleParticipants
  } = useParticipants();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Formulário para criar/editar participante
  const [formData, setFormData] = useState<ParticipantFormData>({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    shirt_size: '',
    dress_size: '',
    notes: ''
  });

  // Filtrar participantes
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.cpf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         participant.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || participant.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      name: '',
      cpf: '',
      email: '',
      phone: '',
      shirt_size: '',
      dress_size: '',
      notes: ''
    });
  };

  // Abrir modal de criação
  const handleCreateClick = () => {
    resetForm();
    setEditingParticipant(null);
    setIsCreateModalOpen(true);
  };

  // Abrir modal de edição
  const handleEditClick = (participant: Participant) => {
    setFormData({
      name: participant.name,
      cpf: participant.cpf || '',
      email: participant.email || '',
      phone: participant.phone || '',
      shirt_size: participant.shirt_size || '',
      dress_size: participant.dress_size || '',
      notes: participant.notes || ''
    });
    setEditingParticipant(participant);
    setIsCreateModalOpen(true);
  };

  // Salvar participante (criar ou editar)
  const handleSaveParticipant = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe o nome do participante.",
        variant: "destructive",
      });
      return;
    }

    let success = false;

    if (editingParticipant) {
      success = await updateParticipant(editingParticipant.id!, formData);
    } else {
      const newParticipant = await createParticipant(formData);
      success = !!newParticipant;
    }

    if (success) {
      setIsCreateModalOpen(false);
      resetForm();
      setEditingParticipant(null);
    }
  };

  // Deletar participante
  const handleDeleteParticipant = async (participant: Participant) => {
    await deleteParticipant(participant.id!);
  };

  // Selecionar/deselecionar participante
  const handleSelectParticipant = (participantId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, participantId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== participantId));
    }
  };

  // Selecionar todos
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredParticipants.map(p => p.id!));
    } else {
      setSelectedIds([]);
    }
  };

  // Executar ação em massa
  const handleBulkAction = async () => {
    if (selectedIds.length === 0) {
      toast({
        title: "Nenhum participante selecionado",
        description: "Selecione pelo menos um participante para executar a ação.",
        variant: "destructive",
      });
      return;
    }

    if (bulkAction === 'active' || bulkAction === 'inactive' || bulkAction === 'cancelled') {
      await updateMultipleParticipantsStatus(selectedIds, bulkAction);
      setSelectedIds([]);
      setBulkAction('');
    } else if (bulkAction === 'delete') {
      // Confirmar exclusão
      const confirmDelete = window.confirm(
        `Tem certeza que deseja excluir ${selectedIds.length} participante(s)? Esta ação não pode ser desfeita.`
      );
      
      if (confirmDelete) {
        await deleteMultipleParticipants(selectedIds);
        setSelectedIds([]);
        setBulkAction('');
      }
    }
  };

  // Aplicar participantes selecionados ao checkout
  const handleExportSelected = () => {
    const selectedParticipants = participants.filter(p => selectedIds.includes(p.id!));
    
    if (selectedParticipants.length === 0) {
      toast({
        title: "Nenhum participante selecionado",
        description: "Selecione pelo menos um participante para exportar.",
        variant: "destructive",
      });
      return;
    }

    if (onSelectParticipants) {
      onSelectParticipants(selectedParticipants);
      toast({
        title: "Participantes selecionados!",
        description: `${selectedParticipants.length} participantes foram enviados para o checkout.`,
      });
    }
  };

  // Importar CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Arquivo inválido",
          description: "Arquivo CSV deve conter pelo menos um cabeçalho e uma linha de dados.",
          variant: "destructive",
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const participantsData: ParticipantFormData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const participant: ParticipantFormData = {
          name: '',
          cpf: '',
          email: '',
          phone: '',
          shirt_size: '',
          dress_size: '',
          notes: ''
        };
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          switch (header) {
            case 'nome':
            case 'name':
              participant.name = value;
              break;
            case 'cpf':
              participant.cpf = value;
              break;
            case 'email':
              participant.email = value;
              break;
            case 'telefone':
            case 'phone':
              participant.phone = value;
              break;
            case 'camiseta':
            case 'shirt_size':
              participant.shirt_size = value;
              break;
            case 'vestido':
            case 'dress_size':
              participant.dress_size = value;
              break;
            case 'observacoes':
            case 'notes':
              participant.notes = value;
              break;
          }
        });
        
        if (participant.name) {
          participantsData.push(participant);
        }
      }
      
      if (participantsData.length > 0) {
        await createMultipleParticipants(participantsData);
      }
    } catch (error) {
      toast({
        title: "Erro ao importar CSV",
        description: "Verifique se o arquivo está no formato correto.",
        variant: "destructive",
      });
    }

    // Reset input
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-butterfly-orange" />
          <h2 className="text-2xl font-bold">Gerenciar Participantes</h2>
          <Badge variant="secondary">{participants.length}</Badge>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCreateClick} className="bg-butterfly-orange hover:bg-butterfly-orange/90">
            <Plus className="h-4 w-4 mr-2" />
            Novo Participante
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              id="csv-import"
              style={{ pointerEvents: 'auto' }}
            />
            <Button 
              variant="outline" 
              className="border-butterfly-orange text-butterfly-orange hover:bg-butterfly-orange/10 relative z-10"
              onClick={() => document.getElementById('csv-import')?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV
            </Button>
          </div>
          
          {showSelection && selectedIds.length > 0 && (
            <Button onClick={handleExportSelected} className="bg-green-600 hover:bg-green-700">
              <Download className="h-4 w-4 mr-2" />
              Usar Selecionados ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filtros e busca */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome, CPF ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ações em massa */}
      {selectedIds.length > 0 && (
        <Card className="border-butterfly-orange/20">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <span className="text-sm font-medium">
                {selectedIds.length} participante(s) selecionado(s)
              </span>
              
              <div className="flex gap-2 flex-1">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Ação em massa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Marcar como Ativo</SelectItem>
                    <SelectItem value="inactive">Marcar como Inativo</SelectItem>
                    <SelectItem value="cancelled">Marcar como Cancelado</SelectItem>
                    <SelectItem value="delete" className="text-red-600 focus:text-red-600">Excluir</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  variant="outline"
                >
                  Executar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de participantes */}
      <div className="space-y-4">
        {/* Header da tabela */}
        {filteredParticipants.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            {showSelection && (
              <Checkbox
                checked={selectedIds.length === filteredParticipants.length}
                onCheckedChange={handleSelectAll}
              />
            )}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm font-medium text-gray-600">
              <span>Nome</span>
              <span className="hidden sm:block">CPF/Email</span>
              <span className="hidden sm:block">Tamanhos</span>
              <span className="hidden sm:block">Status</span>
            </div>
            <div className="w-24 text-sm font-medium text-gray-600">Ações</div>
          </div>
        )}

        {/* Participantes */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-butterfly-orange mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando participantes...</p>
          </div>
        ) : filteredParticipants.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Nenhum participante encontrado com os filtros aplicados.'
                  : 'Nenhum participante cadastrado ainda.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button 
                  onClick={handleCreateClick} 
                  className="mt-4 bg-butterfly-orange hover:bg-butterfly-orange/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Participante
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredParticipants.map((participant) => (
            <Card key={participant.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {showSelection && (
                    <Checkbox
                      checked={selectedIds.includes(participant.id!)}
                      onCheckedChange={(checked) => 
                        handleSelectParticipant(participant.id!, checked as boolean)
                      }
                    />
                  )}
                  
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="font-medium">{participant.name}</p>
                      <p className="text-sm text-gray-600 sm:hidden">
                        {participant.cpf || participant.email || 'Sem contato'}
                      </p>
                    </div>
                    
                    <div className="hidden sm:block">
                      <p className="text-sm">{participant.cpf || '-'}</p>
                      <p className="text-sm text-gray-600">{participant.email || '-'}</p>
                    </div>
                    
                    <div className="hidden sm:block">
                      <p className="text-sm">
                        Camiseta: {participant.shirt_size || '-'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Vestido: {participant.dress_size || '-'}
                      </p>
                    </div>
                    
                    <div className="hidden sm:block">
                      <Badge 
                        variant={participant.status === 'active' ? 'default' : 'secondary'}
                        className={participant.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {participant.status === 'active' ? 'Ativo' : 
                         participant.status === 'inactive' ? 'Inativo' : 'Cancelado'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditClick(participant)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o participante <strong>{participant.name}</strong>? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteParticipant(participant)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de criar/editar participante */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingParticipant ? 'Editar Participante' : 'Novo Participante'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="shirt_size">Tamanho Camiseta</Label>
                <Select 
                  value={formData.shirt_size} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, shirt_size: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIRT_SIZES.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dress_size">Tamanho Vestido</Label>
                <Select 
                  value={formData.dress_size} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dress_size: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRESS_SIZES.map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveParticipant}
              className="bg-butterfly-orange hover:bg-butterfly-orange/90"
            >
              {editingParticipant ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};