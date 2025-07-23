
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, ArrowUpCircle, ArrowDownCircle, AlertTriangle } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { supabase } from '@/lib/supabase';
import { updateProductStock } from '@/lib/updateProductStock';

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
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [operation, setOperation] = useState('set');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchStock = async () => {
      setIsLoading(true);
      // Buscar produtos
      const { data: products } = await supabase.from('products').select('id, name, category, image_url');
      // Buscar estoque por tamanho
      const { data: stock } = await supabase.from('product_stock').select('*');
      if (products && stock) {
        const items: StockItem[] = products.map((p: any) => {
          const sizes = stock.filter((s: any) => s.product_id === p.id).map((s: any) => ({ size: s.size, stock: s.quantity }));
          const total = sizes.reduce((sum, s) => sum + s.stock, 0);
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            stock: total,
            reserved: 0,
            available: total,
            minStock: 2,
            image: p.image_url || '',
            sizes,
          };
        });
        setStockItems(items);
      }
      setIsLoading(false);
    };
    fetchStock();
  }, []);

  // Função para atualizar estoque por tamanho
  const handleUpdateStockSize = async (productId: string, size: string, newQuantity: number) => {
    await updateProductStock(productId, size, newQuantity);
    // Recarregar estoque após atualização
    const { data: products } = await supabase.from('products').select('id, name, category, image_url');
    const { data: stock } = await supabase.from('product_stock').select('*');
    if (products && stock) {
      const items: StockItem[] = products.map((p: any) => {
        const sizes = stock.filter((s: any) => s.product_id === p.id).map((s: any) => ({ size: s.size, stock: s.quantity }));
        const total = sizes.reduce((sum, s) => sum + s.stock, 0);
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          stock: total,
          reserved: 0,
          available: total,
          minStock: 2,
          image: p.image_url || '',
          sizes,
        };
      });
      setStockItems(items);
    }
  };

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
                                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleUpdateStockSize(selectedItem.id, sizeItem.size, sizeItem.stock + 1)}>
                                                      <ArrowUpCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleUpdateStockSize(selectedItem.id, sizeItem.size, sizeItem.stock - 1)}>
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
