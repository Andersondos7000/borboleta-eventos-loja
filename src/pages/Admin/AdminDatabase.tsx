import React from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Database, Settings, TestTube, Activity } from 'lucide-react';
import SupabaseTestPanel from '../../components/SupabaseTestPanel';

const AdminDatabase: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Banco de Dados</h1>
        <p className="text-muted-foreground">
          Monitore, teste e configure a integração com Supabase
        </p>
      </div>

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testes
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests">
          <SupabaseTestPanel />
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Supabase</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Conectado e operacional
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Database</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      PostgreSQL funcionando
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">Edge Functions</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Verificar deployment
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Supabase</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Project URL</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono">
                    https://pxcvoiffnandpdyotped.supabase.co
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Project ID</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono">
                    pxcvoiffnandpdyotped
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Anon Key</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono">
                    eyJhbG******* (Configurada)
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline">
                    Testar Configuração
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral dos Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">12</div>
                    <p className="text-sm text-muted-foreground">Produtos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">3</div>
                    <p className="text-sm text-muted-foreground">Eventos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-sm text-muted-foreground">Usuários</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-sm text-muted-foreground">Itens no Carrinho</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">0</div>
                    <p className="text-sm text-muted-foreground">Ingressos</p>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Button variant="outline">
                  Atualizar Dados
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDatabase;
