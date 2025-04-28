
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Shirt, ShoppingCart, Users, ArrowDown, ArrowUp, Database } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

const AdminDashboard = () => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-butterfly-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 24.680,00</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" /> +12% comparado ao mês anterior
                </span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ingressos Vendidos</CardTitle>
              <Ticket className="h-4 w-4 text-butterfly-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">246</div>
              <p className="text-xs text-muted-foreground">
                <span className="flex items-center">
                  de 1300 disponíveis (19%)
                </span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Produtos Vendidos</CardTitle>
              <Shirt className="h-4 w-4 text-butterfly-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500 flex items-center">
                  <ArrowUp className="h-3 w-3 mr-1" /> +25% comparado à semana anterior
                </span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Itens em Estoque</CardTitle>
              <Database className="h-4 w-4 text-butterfly-orange" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">362</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-500 flex items-center">
                  <ArrowDown className="h-3 w-3 mr-1" /> 2 produtos com estoque baixo
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="sales" className="w-full">
          <TabsList>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="inventory">Estoque</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Visão Geral de Vendas</CardTitle>
                <CardDescription>Vendas dos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-gray-500">Gráfico de Vendas</p>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Produtos Mais Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded bg-gray-200 mr-3 flex items-center justify-center">
                          <Shirt className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">Camiseta Logo</h4>
                          <p className="text-sm text-gray-500">28 unid.</p>
                        </div>
                      </div>
                      <span className="font-semibold">R$ 1.680,00</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded bg-gray-200 mr-3 flex items-center justify-center">
                          <Shirt className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">Vestido Elegance</h4>
                          <p className="text-sm text-gray-500">19 unid.</p>
                        </div>
                      </div>
                      <span className="font-semibold">R$ 2.660,00</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded bg-gray-200 mr-3 flex items-center justify-center">
                          <Shirt className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                          <h4 className="font-medium">Camiseta Borboleta</h4>
                          <p className="text-sm text-gray-500">16 unid.</p>
                        </div>
                      </div>
                      <span className="font-semibold">R$ 960,00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Últimos Pedidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">#12345</h4>
                        <p className="text-sm text-gray-500">2 produtos</p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded">Pago</span>
                      <span className="font-semibold">R$ 200,00</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">#12344</h4>
                        <p className="text-sm text-gray-500">1 ingresso</p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded">Pago</span>
                      <span className="font-semibold">R$ 83,00</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">#12343</h4>
                        <p className="text-sm text-gray-500">3 produtos</p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-800 text-xs py-1 px-2 rounded">Pendente</span>
                      <span className="font-semibold">R$ 340,00</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">#12342</h4>
                        <p className="text-sm text-gray-500">1 produto</p>
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded">Pago</span>
                      <span className="font-semibold">R$ 60,00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="inventory" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventário</CardTitle>
                <CardDescription>Status do estoque de produtos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Produto</th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Categoria</th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Estoque</th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-sm">Camiseta Logo Conferência</td>
                        <td className="py-3 px-4 text-sm text-center">Camiseta</td>
                        <td className="py-3 px-4 text-sm text-center">45</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded">OK</span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-sm">Camiseta Borboleta</td>
                        <td className="py-3 px-4 text-sm text-center">Camiseta</td>
                        <td className="py-3 px-4 text-sm text-center">37</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded">OK</span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-sm">Camiseta Queren</td>
                        <td className="py-3 px-4 text-sm text-center">Camiseta</td>
                        <td className="py-3 px-4 text-sm text-center">0</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-red-100 text-red-800 text-xs py-1 px-2 rounded">Esgotado</span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-sm">Vestido Elegance</td>
                        <td className="py-3 px-4 text-sm text-center">Vestido</td>
                        <td className="py-3 px-4 text-sm text-center">28</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded">OK</span>
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-3 px-4 text-sm">Vestido Celebration</td>
                        <td className="py-3 px-4 text-sm text-center">Vestido</td>
                        <td className="py-3 px-4 text-sm text-center">15</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-green-100 text-green-800 text-xs py-1 px-2 rounded">OK</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 text-sm">Vestido Butterfly</td>
                        <td className="py-3 px-4 text-sm text-center">Vestido</td>
                        <td className="py-3 px-4 text-sm text-center">3</td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-yellow-100 text-yellow-800 text-xs py-1 px-2 rounded">Baixo</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function Ticket(props: { className: string }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}

export default AdminDashboard;
