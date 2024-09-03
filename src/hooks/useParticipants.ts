import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Participant {
  id?: string;
  user_id?: string;
  order_id?: string;
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  shirt_size?: string;
  dress_size?: string;
  status?: 'active' | 'inactive' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ParticipantFormData {
  name: string;
  cpf?: string;
  email?: string;
  phone?: string;
  shirt_size?: string;
  dress_size?: string;
  notes?: string;
}

export const useParticipants = () => {
  // Dados de exemplo temporários (substituir pela integração com Supabase)
  const defaultParticipants: Participant[] = [
    {
      id: '1',
      user_id: 'user1',
      name: 'João Silva',
      cpf: '123.456.789-00',
      email: 'joao@email.com',
      phone: '(11) 99999-9999',
      shirt_size: 'M',
      dress_size: 'G',
      status: 'active' as const,
      notes: 'Participante exemplo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '2',
      user_id: 'user1',
      name: 'Maria Santos',
      cpf: '987.654.321-00',
      email: 'maria@email.com',
      phone: '(11) 88888-8888',
      shirt_size: 'P',
      dress_size: 'M',
      status: 'active' as const,
      notes: 'Participante exemplo 2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '3',
      user_id: 'user1',
      name: 'Pedro Costa',
      cpf: '456.789.123-00',
      email: 'pedro@email.com',
      phone: '(11) 77777-7777',
      shirt_size: 'G',
      dress_size: 'GG',
      status: 'active' as const,
      notes: 'Participante exemplo 3',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Função para carregar participantes do localStorage
  const loadParticipantsFromStorage = (): Participant[] => {
    try {
      const stored = localStorage.getItem('participants');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Erro ao carregar participantes do localStorage:', error);
    }
    return defaultParticipants;
  };

  // Função para salvar participantes no localStorage
  const saveParticipantsToStorage = (participants: Participant[]) => {
    try {
      localStorage.setItem('participants', JSON.stringify(participants));
      console.log('[DEBUG] Participantes salvos no localStorage:', participants);
      
      // Disparar evento customizado para notificar outros componentes
      window.dispatchEvent(new CustomEvent('participantsUpdated', { 
        detail: { participants } 
      }));
    } catch (error) {
      console.error('Erro ao salvar participantes no localStorage:', error);
    }
  };

  const [participants, setParticipants] = useState<Participant[]>(loadParticipantsFromStorage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Salvar no localStorage sempre que participants mudar
  useEffect(() => {
    saveParticipantsToStorage(participants);
  }, [participants]);

  // Escutar mudanças no localStorage de outros componentes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'participants' && event.newValue) {
        try {
          const updatedParticipants = JSON.parse(event.newValue);
          setParticipants(updatedParticipants);
          console.log('[DEBUG] Hook atualizado via storage event:', updatedParticipants);
        } catch (error) {
          console.error('Erro ao processar mudança no localStorage:', error);
        }
      }
    };

    // Escutar evento customizado para mudanças na mesma aba
    const handleParticipantsUpdate = (event: CustomEvent) => {
      const updatedParticipants = event.detail.participants;
      setParticipants(updatedParticipants);
      console.log('[DEBUG] Hook atualizado via evento customizado:', updatedParticipants);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('participantsUpdated', handleParticipantsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('participantsUpdated', handleParticipantsUpdate as EventListener);
    };
  }, []);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar do localStorage
      const storedParticipants = loadParticipantsFromStorage();
      setParticipants(storedParticipants);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Em produção, usar: const { data, error } = await supabase.from('participants').select('*');
      // Por enquanto, apenas retornamos os dados locais
      
    } catch (err) {
      setError('Erro ao carregar participantes');
      console.error('Erro ao buscar participantes:', err);
    } finally {
      setLoading(false);
    }
  };

  const createParticipant = async (participantData: ParticipantFormData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newParticipant: Participant = {
        id: Date.now().toString(),
        user_id: user?.id || 'user1',
        ...participantData,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Atualizar estado local (que automaticamente salva no localStorage através do useEffect)
      setParticipants(prev => [...prev, newParticipant]);
      
      toast({
        title: 'Sucesso',
        description: 'Participante criado com sucesso!'
      });
      
      return { data: newParticipant, error: null };
    } catch (err) {
      const errorMessage = 'Erro ao criar participante';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateParticipant = async (id: string, participantData: Partial<ParticipantFormData>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Atualizar estado local (que automaticamente salva no localStorage através do useEffect)
      setParticipants(prev => 
        prev.map(participant => 
          participant.id === id 
            ? { ...participant, ...participantData, updated_at: new Date().toISOString() }
            : participant
        )
      );
      
      toast({
        title: 'Sucesso',
        description: 'Participante atualizado com sucesso!'
      });
      
      return { data: true, error: null };
    } catch (err) {
      const errorMessage = 'Erro ao atualizar participante';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteParticipant = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Atualizar estado local (que automaticamente salva no localStorage através do useEffect)
      setParticipants(prev => prev.filter(participant => participant.id !== id));
      
      toast({
        title: 'Sucesso',
        description: 'Participante removido com sucesso!'
      });
      
      return { data: true, error: null };
    } catch (err) {
      const errorMessage = 'Erro ao remover participante';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const createMultipleParticipants = async (participantsData: ParticipantFormData[]) => {
    try {
      setLoading(true);
      setError(null);
      
      const newParticipants: Participant[] = participantsData.map((data, index) => ({
        id: (Date.now() + index).toString(),
        user_id: user?.id || 'user1',
        ...data,
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      setParticipants(prev => [...prev, ...newParticipants]);
      
      toast({
        title: 'Sucesso',
        description: `${newParticipants.length} participantes criados com sucesso!`
      });
      
      return { data: newParticipants, error: null };
    } catch (err) {
      const errorMessage = 'Erro ao criar participantes';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const updateMultipleParticipantsStatus = async (ids: string[], status: 'active' | 'inactive' | 'cancelled') => {
    try {
      setLoading(true);
      setError(null);
      
      setParticipants(prev => 
        prev.map(participant => 
          ids.includes(participant.id || '') 
            ? { ...participant, status, updated_at: new Date().toISOString() }
            : participant
        )
      );
      
      return { data: true, error: null };
    } catch (err) {
      const errorMessage = 'Erro ao atualizar status dos participantes';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteMultipleParticipants = async (ids: string[]) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Atualizar estado local (que automaticamente salva no localStorage através do useEffect)
      setParticipants(prev => prev.filter(participant => !ids.includes(participant.id || '')));
      
      toast({
        title: 'Sucesso',
        description: `${ids.length} participante(s) removido(s) com sucesso!`
      });
      
      return { data: true, error: null };
    } catch (err) {
      const errorMessage = 'Erro ao remover participantes';
      setError(errorMessage);
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive'
      });
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const getParticipantsByOrder = async (orderId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const orderParticipants = participants.filter(p => p.order_id === orderId);
      
      return { data: orderParticipants, error: null };
    } catch (err) {
      const errorMessage = 'Erro ao buscar participantes do pedido';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  return {
    participants,
    loading,
    error,
    fetchParticipants,
    createParticipant,
    updateParticipant,
    deleteParticipant,
    createMultipleParticipants,
    updateMultipleParticipantsStatus,
    deleteMultipleParticipants,
    getParticipantsByOrder,
  };
};