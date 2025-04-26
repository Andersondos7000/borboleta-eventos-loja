
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface StockItem {
  id: string;
  name: string;
  category: 'camiseta' | 'vestido';
  stock: number;
  reserved: number;
  available: number;
  minStock: number;
  image: string;
  sizes: { size: string; stock: number }[];
}

const AdminEstoque = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const stockItems: StockItem[] = [
    {
      id: 'P001',
      name: 'Camiseta Logo Conferência',
      category: 'camiseta',
      stock: 45,
      reserved: 3,
      available: 42,
      minStock: 10,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80',
      sizes: [
        { size: 'PP', stock: 5 },
        { size: 'P', stock: 8 },
        { size: 'M', stock: 12 },
        { size: 'G', stock: 10 },
        { size: 'GG', stock: 6 },
        { size: 'XGG', stock: 3 },
        { size: 'EXGG', stock: 1 }
      ]
    },
    {
      id: 'P002',
      name: 'Camiseta Borboleta',
      category: 'camiseta',
      stock: 37,
      reserved: 2,
      available: 35,
      minStock: 10,
      image: 'https://images.unsplash.com/photo-1583744946564-b52d01a7f084?q=80',
      sizes: [
        { size: 'PP', stock: 4 },
        { size: 'P', stock: 6 },
        { size: 'M', stock: 10 },
        { size: 'G', stock: 8 },
        { size: 'GG', stock: 5 },
        { size: 'XGG', stock: 3 },
        { size: 'EXGG', stock: 1 }
      ]
    },
    {
      id: 'P003',
      name: 'Camiseta Queren',
      category: 'camiseta',
      stock: 0,
      reserved: 0,
      available: 0,
      minStock: 10,
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80',
      sizes: [
        { size: 'PP', stock: 0 },
        { size: 'P', stock: 0 },
        { size: 'M', stock: 0 },
        { size: 'G', stock: 0 },
        { size: 'GG', stock: 0 },
        { size: 'XGG', stock: 0 }
      ]
    },
    {
      id: 'P004',
      name: 'Vestido Elegance',
      category: 'vestido',
      stock: 28,
      reserved: 4,
      available: 24,
      minStock: 5,
      image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80',
      sizes: [
        { size: '0', stock: 2 },
        { size: '2', stock: 3 },
        { size: '4', stock: 4 },
        { size: '6', stock: 6 },
        { size: '8', stock: 5 },
        { size: '10', stock: 3 },
        { size: '12', stock: 3 },
        { size: '14', stock: 1 },
        { size: '16', stock: 1 }
      ]
    },
    {
      id: 'P005',
      name: 'Vestido Celebration',
      category: 'vestido',
      stock: 15,
      reserved: 1,
      available: 14,
      minStock: 5,
      image: 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80',
      sizes: [
        { size: '0', stock: 1 },
        { size: '2', stock: 2 },
        { size: '4', stock: 3 },
        { size: '6', stock: 3 },
        { size: '8', stock: 2 },
        { size: '10', stock: 2 },
        { size: '12', stock: 1 },
        { size: '14', stock: 1 }
      ]
    },
    {
      id: 'P006',
      name: 'Vestido Butterfly',
      category: 'vestido',
      stock: 3,
      reserved: 0,
      available: 3,
      minStock: 5,
      image: 'https://images.unsplash.com/photo-1542295669297-4d352b042bca?q=80',
      sizes: [
        { size: '0', stock: 0 },
        { size: '2', stock: 0 },
        { size: '4', stock: 1 },
        { size: '6', stock: 1 },
        { size: '8', stock: 1 },
        { size: '10', stock: 0 },
        { size: '12', stock: 0 },
        { size: '14', stock: 0 },
        { size: '16', stock: 0 }
      ]
    }
  ];

  const filteredItems = stockItems
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(item => categoryFilter === 'all' || item.category === (categoryFilter === 'camisetas' ? 'camiseta' : 'vestido'));

  const lowStockItems = stockItems.filter(item => item.available <= item.minStock);
  const outOfStockItems = stockItems.filter(item => item.available === 0);

  const getStockStatusClass = (available: number, minStock: number) => {
    if (available === 0) return 'text-red-500 font-bold';
    if (available <= minStock) return 'text-yellow-500 font-bold';
    return 'text-green-500 font-bold';
  };

  const getStockStatusText = (available: number, minStock: number) => {
    if (available === 0) return 'Esgotado';
    if (available <= minStock) return 'Baixo';
    return 'OK';
  };

  const openItemDetails = (item: StockItem) => {
    setSelectedItem(item);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">Controle de Estoque</h1>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Estoque Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">128</div>
              <p className="text-xs text-muted-foreground">
                <span>Em todos os produtos</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Produtos com Estoque Baixo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{lowStockItems.length}</div>
              <p className="text-xs text-muted-foreground">
                <span>Abaixo do estoque mínimo</span>
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Produtos Esgotados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{outOfStockItems.length}</div>
              <p className="text-xs text-muted-foreground">
                <span>Sem estoque disponível</span>
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
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas Categorias</SelectItem>
              <SelectItem value="camisetas">Camisetas</SelectItem>
              <SelectItem value="vestidos">Vestidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventário</CardTitle>
            <CardDescription>Status detalhado do estoque de produtos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Produto</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Categoria</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Estoque</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Reservado</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Disponível</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Status</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden mr-3">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="font-medium">{item.name}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="capitalize">{item.category === 'camiseta' ? 'Camiseta' : 'Vestido'}</span>
                      </td>
                      <td className="py-3 px-4 text-center">{item.stock}</td>
                      <td className="py-3 px-4 text-center">{item.reserved}</td>
                      <td className="py-3 px-4 text-center font-medium">
                        <span className={getStockStatusClass(item.available, item.minStock)}>
                          {item.available}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span 
                          className={`text-xs py-1 px-2 rounded ${
                            item.available === 0 
                              ? 'bg-red-100 text-red-800' 
                              : item.available <= item.minStock 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {getStockStatusText(item.available, item.minStock)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8"
                                onClick={() => openItemDetails(item)}
                              >
                                Detalhes
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Estoque</DialogTitle>
                                <DialogDescription>
                                  {selectedItem?.name}
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedItem && (
                                <div className="mt-4">
                                  <div className="flex flex-col md:flex-row gap-6">
                                    <div className="md:w-1/3">
                                      <div className="rounded-lg overflow-hidden mb-4">
                                        <img 
                                          src={selectedItem.image} 
                                          alt={selectedItem.name}
                                          className="w-full h-auto"
                                        />
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Categoria:</span>
                                          <span className="capitalize">
                                            {selectedItem.category === 'camiseta' ? 'Camiseta' : 'Vestido'}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Estoque Total:</span>
                                          <span>{selectedItem.stock}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Reservado:</span>
                                          <span>{selectedItem.reserved}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Disponível:</span>
                                          <span className={getStockStatusClass(selectedItem.available, selectedItem.minStock)}>
                                            {selectedItem.available}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Estoque Mínimo:</span>
                                          <span>{selectedItem.minStock}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Status:</span>
                                          <span 
                                            className={`text-xs py-1 px-2 rounded ${
                                              selectedItem.available === 0 
                                                ? 'bg-red-100 text-red-800' 
                                                : selectedItem.available <= selectedItem.minStock 
                                                ? 'bg-yellow-100 text-yellow-800' 
                                                : 'bg-green-100 text-green-800'
                                            }`}
                                          >
                                            {getStockStatusText(selectedItem.available, selectedItem.minStock)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="md:w-2/3">
                                      <h3 className="font-medium text-lg mb-4">Detalhamento por Tamanho</h3>
                                      
                                      <div className="rounded-lg border">
                                        <table className="w-full">
                                          <thead>
                                            <tr className="border-b bg-gray-50">
                                              <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Tamanho</th>
                                              <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Em Estoque</th>
                                              <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Status</th>
                                              <th className="py-3 px-4 text-right text-sm font-medium text-gray-500">Ações</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {selectedItem.sizes.map((sizeItem) => (
                                              <tr key={sizeItem.size} className="border-b">
                                                <td className="py-3 px-4 font-medium">{sizeItem.size}</td>
                                                <td className="py-3 px-4 text-center">
                                                  <span className={sizeItem.stock === 0 ? 'text-red-500' : sizeItem.stock <= 2 ? 'text-yellow-500' : ''}>
                                                    {sizeItem.stock}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                  <span 
                                                    className={`text-xs py-1 px-2 rounded ${
                                                      sizeItem.stock === 0 
                                                        ? 'bg-red-100 text-red-800' 
                                                        : sizeItem.stock <= 2 
                                                        ? 'bg-yellow-100 text-yellow-800' 
                                                        : 'bg-green-100 text-green-800'
                                                    }`}
                                                  >
                                                    {sizeItem.stock === 0 ? 'Esgotado' : sizeItem.stock <= 2 ? 'Baixo' : 'OK'}
                                                  </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                  <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                                                      <ArrowUpCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0">
                                                      <ArrowDownCircle className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                      
                                      <div className="mt-6">
                                        <h3 className="font-medium text-lg mb-4">Atualizar Estoque</h3>
                                        <div className="flex flex-wrap gap-4">
                                          <div>
                                            <label className="text-sm font-medium mb-2 block">
                                              Tamanho
                                            </label>
                                            <Select>
                                              <SelectTrigger className="w-[120px]">
                                                <SelectValue placeholder="Selecione" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {selectedItem.sizes.map((sizeItem) => (
                                                  <SelectItem key={sizeItem.size} value={sizeItem.size}>
                                                    {sizeItem.size}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium mb-2 block">
                                              Operação
                                            </label>
                                            <Select>
                                              <SelectTrigger className="w-[120px]">
                                                <SelectValue placeholder="Selecione" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="add">Adicionar</SelectItem>
                                                <SelectItem value="remove">Remover</SelectItem>
                                                <SelectItem value="set">Definir</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium mb-2 block">
                                              Quantidade
                                            </label>
                                            <Input 
                                              type="number" 
                                              className="w-[120px]"
                                              min="1"
                                            />
                                          </div>
                                          <div className="flex items-end">
                                            <Button className="bg-butterfly-orange hover:bg-butterfly-orange/90">
                                              Atualizar
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <DialogFooter className="mt-4">
                                <Button 
                                  className="bg-butterfly-orange hover:bg-butterfly-orange/90"
                                  disabled={selectedItem?.available === 0}
                                >
                                  Gerar Relatório
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8">
                                Ajustar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Ajustar Estoque</DialogTitle>
                                <DialogDescription>
                                  Atualize o estoque para {item.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium">
                                    Estoque Atual:
                                  </label>
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                      <span className="block text-gray-500 text-sm">Total</span>
                                      <span className="font-bold">{item.stock}</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="block text-gray-500 text-sm">Reservado</span>
                                      <span className="font-bold">{item.reserved}</span>
                                    </div>
                                    <div className="text-center">
                                      <span className="block text-gray-500 text-sm">Disponível</span>
                                      <span className={`font-bold ${getStockStatusClass(item.available, item.minStock)}`}>
                                        {item.available}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium">
                                    Operação:
                                  </label>
                                  <Select>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="add">Adicionar ao estoque</SelectItem>
                                      <SelectItem value="remove">Remover do estoque</SelectItem>
                                      <SelectItem value="set">Definir valor direto</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium">
                                    Quantidade:
                                  </label>
                                  <Input type="number" min="1" />
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                  <label className="text-sm font-medium">
                                    Observação:
                                  </label>
                                  <Input placeholder="Ex: Recebimento de fornecedor" />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" className="mr-2">Cancelar</Button>
                                <Button className="bg-butterfly-orange hover:bg-butterfly-orange/90">
                                  Salvar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-gray-500">
                        Nenhum produto encontrado com esses filtros.
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

export default AdminEstoque;
