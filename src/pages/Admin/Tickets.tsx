
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminSidebar from '@/components/AdminSidebar';
import { supabase } from '@/lib/supabase';

interface Ticket {
  id: string;
  customerName: string;
  email: string;
  quantity: number;
  totalValue: number;
  paymentStatus: 'Pago' | 'Pendente' | 'Cancelado';
  purchaseDate: string;
}

interface DatabaseTicket {
  id: string;
  price: number;
  status: string;
  created_at: string;
  user_id: string;
  events?: {
    name: string;
  }[];
  profiles?: {
    email: string;
    first_name: string;
    last_name: string;
  }[];
}

const AdminTickets = () => {
  const [tickets, setTickets] = useState<DatabaseTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      // Busca tickets + dados do usuário
      const { data, error } = await supabase
        .from('tickets')
        .select('id, price, status, created_at, user_id, events(*), profiles:profiles!tickets_user_id_fkey(email, first_name, last_name)')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setTickets(data);
      }
      setIsLoading(false);
    };
    fetchTickets();
    // --- SUPABASE REALTIME ---
    const ticketsChannel = supabase.channel('realtime-admin-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ticketsChannel);
    };
  }, []);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pago':
      case 'Pago':
        return 'bg-green-100 text-green-800';
      case 'pendente':
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Vendas de Ingressos</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Ingressos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">246</div>
              <p className="text-xs text-muted-foreground">
                <span>de 1300 disponíveis (19%)</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Receita de Ingressos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 20.418,00</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">+5% comparado à semana anterior</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 147,95</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">Média de 1,78 ingressos por pedido</span>
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
            <CardDescription>Visualize e gerencie as vendas de ingressos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">ID</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Cliente</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Email</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Qtd.</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-500">Valor</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Status</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Data</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-6">Carregando...</td></tr>
                  ) : tickets.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-6">Nenhum ingresso encontrado.</td></tr>
                  ) : tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b">
                      <td className="py-3 px-4 text-sm">{ticket.id}</td>
                      <td className="py-3 px-4 text-sm">{Array.isArray(ticket.profiles) ? ticket.profiles[0]?.first_name || '' : ''} {Array.isArray(ticket.profiles) ? ticket.profiles[0]?.last_name || '' : ''}</td>
                      <td className="py-3 px-4 text-sm">{Array.isArray(ticket.profiles) ? ticket.profiles[0]?.email || '' : ''}</td>
                      <td className="py-3 px-4 text-sm text-center">1</td>
                      <td className="py-3 px-4 text-sm text-right">R$ {Number(ticket.price).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs py-1 px-2 rounded ${getStatusBadgeClass(ticket.status)}`}>
                          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8">
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Mostrando 5 de 246 registros
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" className="bg-butterfly-orange text-white border-butterfly-orange hover:bg-butterfly-orange/90 hover:text-white">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  Próximo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminTickets;
