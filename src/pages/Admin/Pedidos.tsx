
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import AdminSidebar from '@/components/AdminSidebar';
import OptimizedImage from '@/components/OptimizedImage';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  image?: string;
  isTicket?: boolean;
}

interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  total: number;
  status: 'Pendente' | 'Pago' | 'Enviado' | 'Entregue' | 'Cancelado';
  date: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  hasTickets: boolean;
  hasProducts: boolean;
}

const AdminPedidos = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const orders: Order[] = [
    {
      id: 'ORD-001',
      customer: {
        name: 'Maria Silva',
        email: 'maria.silva@example.com',
        phone: '(11) 98765-4321'
      },
      items: [
        {
          id: 'TICKET-1',
          name: 'Ingresso Conferência',
          price: 83,
          quantity: 2,
          isTicket: true
        },
        {
          id: 'P001',
          name: 'Camiseta Logo Conferência',
          price: 60,
          quantity: 1,
          size: 'M',
          image: 'https://picsum.photos/400/400?random=1'
        }
      ],
      total: 226,
      status: 'Pago',
      date: '15/01/2025',
      shippingAddress: {
        street: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567'
      },
      hasTickets: true,
      hasProducts: true
    },
    {
      id: 'ORD-002',
      customer: {
        name: 'João Oliveira',
        email: 'joao.oliveira@example.com',
        phone: '(11) 97654-3210'
      },
      items: [
        {
          id: 'TICKET-1',
          name: 'Ingresso Conferência',
          price: 83,
          quantity: 1,
          isTicket: true
        }
      ],
      total: 83,
      status: 'Pago',
      date: '16/01/2025',
      hasTickets: true,
      hasProducts: false
    },
    {
      id: 'ORD-003',
      customer: {
        name: 'Ana Santos',
        email: 'ana.santos@example.com',
        phone: '(11) 96543-2109'
      },
      items: [
        {
          id: 'P004',
          name: 'Vestido Elegance',
          price: 140,
          quantity: 1,
          size: '6',
          image: 'https://picsum.photos/400/400?random=2'
        },
        {
          id: 'P002',
          name: 'Camiseta Borboleta',
          price: 60,
          quantity: 1,
          size: 'P',
          image: 'https://picsum.photos/400/400?random=3'
        }
      ],
      total: 200,
      status: 'Enviado',
      date: '17/01/2025',
      shippingAddress: {
        street: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      },
      hasTickets: false,
      hasProducts: true
    },
    {
      id: 'ORD-004',
      customer: {
        name: 'Lucas Ferreira',
        email: 'lucas.ferreira@example.com',
        phone: '(11) 95432-1098'
      },
      items: [
        {
          id: 'TICKET-1',
          name: 'Ingresso Conferência',
          price: 83,
          quantity: 1,
          isTicket: true
        }
      ],
      total: 83,
      status: 'Pendente',
      date: '17/01/2025',
      hasTickets: true,
      hasProducts: false
    },
    {
      id: 'ORD-005',
      customer: {
        name: 'Juliana Costa',
        email: 'juliana.costa@example.com',
        phone: '(11) 94321-0987'
      },
      items: [
        {
          id: 'P006',
          name: 'Vestido Butterfly',
          price: 140,
          quantity: 1,
          size: '8',
          image: 'https://picsum.photos/400/400?random=4'
        }
      ],
      total: 140,
      status: 'Cancelado',
      date: '18/01/2025',
      shippingAddress: {
        street: 'Rua dos Pinheiros, 500',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '05422-010'
      },
      hasTickets: false,
      hasProducts: true
    }
  ];

  const filteredOrders = orders
    .filter(order => 
      order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(order => statusFilter === 'all' || order.status === statusFilter);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Pago':
        return 'bg-green-100 text-green-800';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Enviado':
        return 'bg-blue-100 text-blue-800';
      case 'Entregue':
        return 'bg-purple-100 text-purple-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Pedidos</h1>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">
                <span>Desde o início das vendas</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                <span>Nas últimas 24 horas</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 156,45</div>
              <p className="text-xs text-muted-foreground">
                <span>Por pedido</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aguardando Envio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-yellow-500">Precisam de atenção</span>
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Buscar por ID, nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
              <SelectItem value="Enviado">Enviado</SelectItem>
              <SelectItem value="Entregue">Entregue</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
            <CardDescription>Gerencie todos os pedidos em um só lugar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">ID</th>
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Cliente</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Data</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Tipo</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-500">Total</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Status</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3 px-4 text-sm font-medium">{order.id}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{order.customer.name}</div>
                          <div className="text-sm text-gray-500">{order.customer.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{order.date}</td>
                      <td className="py-3 px-4 text-sm text-center">
                        {order.hasTickets && order.hasProducts
                          ? 'Ingr. + Prod.'
                          : order.hasTickets
                          ? 'Ingressos'
                          : 'Produtos'
                        }
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs py-1 px-2 rounded ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <button 
                              onClick={() => openOrderDetails(order)} 
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                            >
                              Detalhes
                            </button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Pedido {order.id}</DialogTitle>
                              <DialogDescription>
                                Pedido realizado em {order.date}
                              </DialogDescription>
                            </DialogHeader>
                            
                            {selectedOrder && (
                              <div className="mt-4">
                                <Tabs defaultValue="info">
                                  <TabsList className="mb-4">
                                    <TabsTrigger value="info">Informações</TabsTrigger>
                                    <TabsTrigger value="items">Itens</TabsTrigger>
                                    {selectedOrder.shippingAddress && (
                                      <TabsTrigger value="shipping">Envio</TabsTrigger>
                                    )}
                                  </TabsList>
                                  
                                  <TabsContent value="info">
                                    <div className="space-y-4">
                                      <h3 className="font-medium text-lg">Informações do Cliente</h3>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm text-gray-500">Nome:</p>
                                          <p className="font-medium">{selectedOrder.customer.name}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-500">Email:</p>
                                          <p className="font-medium">{selectedOrder.customer.email}</p>
                                        </div>
                                        {selectedOrder.customer.phone && (
                                          <div>
                                            <p className="text-sm text-gray-500">Telefone:</p>
                                            <p className="font-medium">{selectedOrder.customer.phone}</p>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="pt-4 border-t">
                                        <h3 className="font-medium text-lg mb-2">Resumo do Pedido</h3>
                                        <div className="space-y-1">
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Tipo:</span>
                                            <span>
                                              {selectedOrder.hasTickets && selectedOrder.hasProducts
                                                ? 'Ingressos e Produtos'
                                                : selectedOrder.hasTickets
                                                ? 'Ingressos'
                                                : 'Produtos'
                                              }
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Data do pedido:</span>
                                            <span>{selectedOrder.date}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Status:</span>
                                            <span className={`text-xs py-1 px-2 rounded ${getStatusBadgeClass(selectedOrder.status)}`}>
                                              {selectedOrder.status}
                                            </span>
                                          </div>
                                          <div className="flex justify-between font-bold">
                                            <span>Total:</span>
                                            <span>{formatCurrency(selectedOrder.total)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="pt-4 flex justify-between border-t">
                                        <Select>
                                          <SelectTrigger className="w-[200px]">
                                            <SelectValue placeholder="Atualizar status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Pendente">Pendente</SelectItem>
                                            <SelectItem value="Pago">Pago</SelectItem>
                                            <SelectItem value="Enviado">Enviado</SelectItem>
                                            <SelectItem value="Entregue">Entregue</SelectItem>
                                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <Button className="bg-butterfly-orange hover:bg-butterfly-orange/90">
                                          Salvar Alterações
                                        </Button>
                                      </div>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="items">
                                    <div className="space-y-4">
                                      <h3 className="font-medium text-lg mb-2">Itens do Pedido</h3>
                                      
                                      {selectedOrder.items.map((item, index) => (
                                        <div key={`${item.name}-${index}`} className="flex justify-between border-b py-3">
                                          <div className="flex items-center">
                                            {item.image && !item.isTicket ? (
                                              <div className="h-16 w-16 flex-shrink-0 rounded overflow-hidden mr-3">
                                                <img 
                                                  src={item.image} 
                                                  alt={item.name} 
                                                  className="h-full w-full object-cover"
                                                />
                                              </div>
                                            ) : (
                                              <div className="h-16 w-16 flex-shrink-0 rounded bg-gray-200 mr-3 flex items-center justify-center">
                                                <span className="text-2xl">🎟️</span>
                                              </div>
                                            )}
                                            
                                            <div>
                                              <div className="font-medium">{item.name}</div>
                                              {item.size && (
                                                <div className="text-sm text-gray-500">
                                                  Tamanho: {item.size}
                                                </div>
                                              )}
                                              <div className="text-sm text-gray-500">
                                                Quantidade: {item.quantity}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="text-right">
                                            <div className="font-medium">
                                              {formatCurrency(item.price * item.quantity)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {formatCurrency(item.price)} cada
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      
                                      <div className="pt-4 font-bold text-right">
                                        Total: {formatCurrency(selectedOrder.total)}
                                      </div>
                                    </div>
                                  </TabsContent>
                                  
                                  {selectedOrder.shippingAddress && (
                                    <TabsContent value="shipping">
                                      <div className="space-y-4">
                                        <h3 className="font-medium text-lg">Endereço de Entrega</h3>
                                        <div className="p-4 border rounded-lg">
                                          <p>{selectedOrder.shippingAddress.street}</p>
                                          <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}</p>
                                          <p>CEP: {selectedOrder.shippingAddress.zipCode}</p>
                                        </div>
                                        
                                        <div className="pt-4">
                                          <h3 className="font-medium text-lg mb-2">Status de Envio</h3>
                                          <div className="space-y-2">
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Status atual:</span>
                                              <span className={`text-xs py-1 px-2 rounded ${getStatusBadgeClass(selectedOrder.status)}`}>
                                                {selectedOrder.status}
                                              </span>
                                            </div>
                                            
                                            {selectedOrder.status === 'Enviado' && (
                                              <div className="flex justify-between">
                                                <span className="text-gray-600">Código de Rastreamento:</span>
                                                <span>BR123456789</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </TabsContent>
                                  )}
                                </Tabs>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-500">
                        Nenhum pedido encontrado com esses filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPedidos;
