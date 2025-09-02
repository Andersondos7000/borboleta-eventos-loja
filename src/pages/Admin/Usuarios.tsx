import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Search, Users, UserCheck, UserX, Loader2, UserPlus, Edit } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { supabase } from '../../lib/supabase';
import AddUserModal from '@/components/AddUserModal';
import UserDetailsModal from '@/components/UserDetailsModal';
import EditUserModal from '@/components/EditUserModal';

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: 'user' | 'admin' | 'organizer';
  created_at: string;
  // Campos do checkout
  person_type: 'fisica' | 'juridica' | null;
  cpf: string | null;
  country: string | null;
  zip_code: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

const AdminUsuarios = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserProfile | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  // Buscar usuários
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários:', error);
        toast({
          title: "Erro ao carregar usuários",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error: any) {
      console.error('Erro inesperado ao buscar usuários:', error);
      toast({
        title: "Erro inesperado",
        description: "Falha ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuários
  useEffect(() => {
    let filtered = users;

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  // Excluir usuários selecionados
  const handleDeleteUsers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setDeleting(true);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Excluir usuários um por vez usando a função SQL
      for (const userId of selectedUsers) {
        try {
          const { error } = await supabase.rpc('delete_user_cascade', {
            user_uuid: userId
          });

          if (error) {
            console.error(`Erro ao excluir usuário ${userId}:`, error);
            errors.push(`Usuário ${userId}: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err: any) {
          console.error(`Erro inesperado ao excluir usuário ${userId}:`, err);
          errors.push(`Usuário ${userId}: ${err.message || 'Erro inesperado'}`);
          errorCount++;
        }
      }

      // Atualizar lista local removendo usuários excluídos com sucesso
      if (successCount > 0) {
        setUsers(prevUsers => 
          prevUsers.filter(user => !selectedUsers.includes(user.id))
        );
        setSelectedUsers([]);
      }

      // Mostrar resultado
      if (successCount > 0 && errorCount === 0) {
        toast({
          title: "Usuários excluídos",
          description: `${successCount} usuário(s) foram excluídos com sucesso.`,
        });
      } else if (successCount > 0 && errorCount > 0) {
        toast({
          title: "Exclusão parcial",
          description: `${successCount} usuário(s) excluídos, ${errorCount} falharam.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao excluir usuários",
          description: errors.length > 0 ? errors[0] : "Falha na operação de exclusão",
          variant: "destructive"
        });
      }

      // Recarregar lista para garantir sincronização
      await fetchUsers();
    } catch (error: any) {
      console.error('Erro geral ao excluir usuários:', error);
      toast({
        title: "Erro ao excluir usuários",
        description: error.message || "Falha na operação de exclusão",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  // Selecionar/deselecionar usuário
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Selecionar todos os usuários filtrados
  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
    }
  };

  // Obter badge do role
  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: 'Admin', variant: 'destructive' as const },
      organizer: { label: 'Organizador', variant: 'default' as const },
      user: { label: 'Usuário', variant: 'secondary' as const }
    };
    
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Carregar usuários na inicialização
  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Gerenciar Usuários</h1>
          <p className="text-gray-600">Visualize e gerencie todos os usuários da plataforma</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários Cadastrados
            </CardTitle>
            <CardDescription>
              Total de {users.length} usuários • {filteredUsers.length} exibidos
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Filtros e Ações */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="user">Usuários</SelectItem>
                  <SelectItem value="admin">Administradores</SelectItem>
                  <SelectItem value="organizer">Organizadores</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-butterfly-orange hover:bg-butterfly-orange/90 flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Adicionar Usuário
              </Button>
            </div>

            {/* Ações em lote */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg mb-4">
                <span className="text-sm text-blue-700">
                  {selectedUsers.length} usuário(s) selecionado(s)
                </span>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting}>
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Excluir Selecionados
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir {selectedUsers.length} usuário(s)? 
                        Esta ação não pode ser desfeita e removerá permanentemente:
                        <br />• Perfis dos usuários
                        <br />• Contas de autenticação
                        <br />• Todos os dados associados
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteUsers}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Excluir Usuários
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* Tabela de usuários */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-butterfly-orange" />
                <span className="ml-2">Carregando usuários...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded"
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data de Cadastro</TableHead>
                      <TableHead className="w-24">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="rounded"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}`
                              : 'Nome não informado'
                            }
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedUserForDetails(user);
                                setIsDetailsModalOpen(true);
                              }}
                              title="Ver detalhes"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedUserForEdit(user);
                                setIsEditModalOpen(true);
                              }}
                              title="Editar usuário"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o usuário <strong>{user.email}</strong>?
                                    Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => {
                                      setSelectedUsers([user.id]);
                                      handleDeleteUsers();
                                    }}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUserAdded={fetchUsers}
      />
      
      <UserDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        user={selectedUserForDetails}
      />
      
      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        onUserUpdated={fetchUsers}
        user={selectedUserForEdit}
      />
    </div>
  );
};

export default AdminUsuarios;