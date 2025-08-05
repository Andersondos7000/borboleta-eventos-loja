
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import AdminSidebar from '@/components/AdminSidebar';
import { supabase } from '@/lib/supabase';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  image?: string;
  isTicket?: boolean;
}

interface Profile {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

interface DatabaseOrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  ticket_id?: string;
  quantity: number;
  price: number;
  size?: string;
  [key: string]: unknown;
}

interface DatabaseOrder {
  id: string;
  total: number;
  status: 'Pendente' | 'Pago' | 'Enviado' | 'Entregue' | 'Cancelado';
  created_at: string;
  user_id: string;
  customer_data: Record<string, unknown>;
  order_items: DatabaseOrderItem[];
  profiles?: Profile;
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
  const [orders, setOrders] = useState<DatabaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<DatabaseOrder | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      // Busca pedidos + dados do usuário
      const { data, error } = await supabase
        .from('orders')
        .select('id, total, status, created_at, user_id, customer_data, order_items(*), profiles:profiles!orders_user_id_fkey(email, first_name, last_name, phone)')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setOrders(data as any);
      }
      setIsLoading(false);
    };
    fetchOrders();
    // --- SUPABASE REALTIME ---
    const ordersChannel = supabase.channel('realtime-admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const filteredOrders = orders
    .filter(order => {
      const name = order.profiles?.first_name + ' ' + (order.profiles?.last_name || '');
      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.profiles?.email || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .filter(order => statusFilter === 'all' || order.status === statusFilter);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pago':
      case 'Pago':
        return 'bg-green-100 text-green-800';
      case 'pendente':
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'enviado':
      case 'Enviado':
        return 'bg-blue-100 text-blue-800';
      case 'entregue':
      case 'Entregue':
        return 'bg-purple-100 text-purple-800';
      case 'cancelado':
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const openOrderDetails = (order: DatabaseOrder) => {
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
                  {isLoading ? (
                    <tr><td colSpan={7} className="text-center py-6">Carregando...</td></tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-500">
                        Nenhum pedido encontrado com esses filtros.
                      </td>
                    </tr>
                  ) : filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-3 px-4 text-sm font-medium">{order.id}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{order.profiles?.first_name} {order.profiles?.last_name}</div>
                          <div className="text-sm text-gray-500">{order.profiles?.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-center">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 px-4 text-sm text-center">
                        {/* Tipo: Ingressos, Produtos ou ambos */}
                        {order.order_items?.some((item: DatabaseOrderItem) => item.ticket_id) && order.order_items?.some((item: DatabaseOrderItem) => item.product_id)
                          ? 'Ingr. + Prod.'
                          : order.order_items?.some((item: DatabaseOrderItem) => item.ticket_id)
                          ? 'Ingressos'
                          : 'Produtos'
                        }
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs py-1 px-2 rounded ${getStatusBadgeClass(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              onClick={() => openOrderDetails(order)} 
                              variant="outline" 
                              size="sm" 
                              className="h-8"
                            >
                              Detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Detalhes do Pedido {order.id}</DialogTitle>
                              <DialogDescription>
                                Pedido realizado em {new Date(order.created_at).toLocaleDateString('pt-BR')}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedOrder && (
                              <div className="mt-4">
                                <Tabs defaultValue="info">
                                  <TabsList className="mb-4">
                                    <TabsTrigger value="info">Informações</TabsTrigger>
                                    <TabsTrigger value="items">Itens</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="info">
                                    <div className="space-y-4">
                                      <h3 className="font-medium text-lg">Informações do Cliente</h3>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-sm text-gray-500">Nome:</p>
                                          <p className="font-medium">{selectedOrder.profiles?.first_name} {selectedOrder.profiles?.last_name}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-gray-500">Email:</p>
                                          <p className="font-medium">{selectedOrder.profiles?.email}</p>
                                        </div>
                                        {selectedOrder.profiles?.phone && (
                                          <div>
                                            <p className="text-sm text-gray-500">Telefone:</p>
                                            <p className="font-medium">{selectedOrder.profiles?.phone}</p>
                                          </div>
                                        )}
                                      </div>
                                      <div className="pt-4 border-t">
                                        <h3 className="font-medium text-lg mb-2">Resumo do Pedido</h3>
                                        <div className="space-y-1">
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Tipo:</span>
                                            <span>
                                              {selectedOrder.order_items?.some((item: DatabaseOrderItem) => item.ticket_id) && selectedOrder.order_items?.some((item: DatabaseOrderItem) => item.product_id)
                                                ? 'Ingressos e Produtos'
                                                : selectedOrder.order_items?.some((item: DatabaseOrderItem) => item.ticket_id)
                                                ? 'Ingressos'
                                                : 'Produtos'
                                              }
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Data do pedido:</span>
                                            <span>{new Date(selectedOrder.created_at).toLocaleDateString('pt-BR')}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Status:</span>
                                            <span className={`text-xs py-1 px-2 rounded ${getStatusBadgeClass(selectedOrder.status)}`}>
                                              {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between font-bold">
                                            <span>Total:</span>
                                            <span>{formatCurrency(selectedOrder.total)}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </TabsContent>
                                  <TabsContent value="items">
                                    <div className="space-y-4">
                                      <h3 className="font-medium text-lg mb-2">Itens do Pedido</h3>
                                      {selectedOrder.order_items?.map((item: DatabaseOrderItem, index: number) => (
                                        <div key={index} className="flex justify-between border-b py-3">
                                          <div className="flex items-center">
                                            {item.product_id && item.name ? (
                                              <div className="h-16 w-16 flex-shrink-0 rounded overflow-hidden mr-3">
                                                 <img 
                                                   src={String(item.image || '')} 
                                                   alt={String(item.name || 'Item')}
                                                  className="h-full w-full object-cover"
                                                />
                                              </div>
                                            ) : (
                                              <div className="h-16 w-16 flex-shrink-0 rounded bg-gray-200 mr-3 flex items-center justify-center">
                                                <span className="text-2xl">🎟️</span>
                                              </div>
                                            )}
                                            <div>
                                              <div className="font-medium">{String(item.name || 'Item')}</div>
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
                                              {formatCurrency(Number(item.price) * Number(item.quantity))}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {formatCurrency(Number(item.price))} cada
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      <div className="pt-4 font-bold text-right">
                                        Total: {formatCurrency(selectedOrder.total)}
                                      </div>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
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
