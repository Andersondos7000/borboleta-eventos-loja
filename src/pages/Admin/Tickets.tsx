
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminSidebar from '@/components/AdminSidebar';

interface Ticket {
  id: string;
  customerName: string;
  email: string;
  quantity: number;
  totalValue: number;
  paymentStatus: 'Pago' | 'Pendente' | 'Cancelado';
  purchaseDate: string;
}

const AdminTickets = () => {
  const tickets: Ticket[] = [
    {
      id: 'TK-001',
      customerName: 'Maria Silva',
      email: 'maria.silva@example.com',
      quantity: 2,
      totalValue: 166,
      paymentStatus: 'Pago',
      purchaseDate: '15/01/2025'
    },
    {
      id: 'TK-002',
      customerName: 'João Oliveira',
      email: 'joao.oliveira@example.com',
      quantity: 1,
      totalValue: 83,
      paymentStatus: 'Pago',
      purchaseDate: '16/01/2025'
    },
    {
      id: 'TK-003',
      customerName: 'Ana Santos',
      email: 'ana.santos@example.com',
      quantity: 3,
      totalValue: 249,
      paymentStatus: 'Pendente',
      purchaseDate: '17/01/2025'
    },
    {
      id: 'TK-004',
      customerName: 'Lucas Ferreira',
      email: 'lucas.ferreira@example.com',
      quantity: 1,
      totalValue: 83,
      paymentStatus: 'Pago',
      purchaseDate: '17/01/2025'
    },
    {
      id: 'TK-005',
      customerName: 'Juliana Costa',
      email: 'juliana.costa@example.com',
      quantity: 2,
      totalValue: 166,
      paymentStatus: 'Cancelado',
      purchaseDate: '18/01/2025'
    }
  ];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pago':
        return 'bg-green-100 text-green-800';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800';
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
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b">
                      <td className="py-3 px-4 text-sm">{ticket.id}</td>
                      <td className="py-3 px-4 text-sm">{ticket.customerName}</td>
                      <td className="py-3 px-4 text-sm">{ticket.email}</td>
                      <td className="py-3 px-4 text-sm text-center">{ticket.quantity}</td>
                      <td className="py-3 px-4 text-sm text-right">R$ {ticket.totalValue.toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs py-1 px-2 rounded ${getStatusBadgeClass(ticket.paymentStatus)}`}>
                          {ticket.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{ticket.purchaseDate}</td>
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
