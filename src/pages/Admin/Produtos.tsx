
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shirt, Search, PlusCircle } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface Product {
  id: string;
  name: string;
  description: string;
  category: 'camiseta' | 'vestido';
  price: number;
  stock: number;
  image: string;
  status: 'Ativo' | 'Inativo' | 'Esgotado';
}

const AdminProdutos = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const products: Product[] = [
    {
      id: 'P001',
      name: 'Camiseta Logo Conferência',
      description: 'Camiseta oficial com logo da conferência',
      category: 'camiseta',
      price: 60,
      stock: 45,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80',
      status: 'Ativo'
    },
    {
      id: 'P002',
      name: 'Camiseta Borboleta',
      description: 'Camiseta com estampa de borboleta',
      category: 'camiseta',
      price: 60,
      stock: 37,
      image: 'https://images.unsplash.com/photo-1583744946564-b52d01a7f084?q=80',
      status: 'Ativo'
    },
    {
      id: 'P003',
      name: 'Camiseta Queren',
      description: 'Camiseta com tema Queren Hapuque',
      category: 'camiseta',
      price: 60,
      stock: 0,
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80',
      status: 'Esgotado'
    },
    {
      id: 'P004',
      name: 'Vestido Elegance',
      description: 'Vestido elegante para ocasiões especiais',
      category: 'vestido',
      price: 140,
      stock: 28,
      image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80',
      status: 'Ativo'
    },
    {
      id: 'P005',
      name: 'Vestido Celebration',
      description: 'Vestido para celebrações e eventos',
      category: 'vestido',
      price: 140,
      stock: 15,
      image: 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80',
      status: 'Ativo'
    },
    {
      id: 'P006',
      name: 'Vestido Butterfly',
      description: 'Vestido com estampa de borboletas',
      category: 'vestido',
      price: 140,
      stock: 3,
      image: 'https://images.unsplash.com/photo-1542295669297-4d352b042bca?q=80',
      status: 'Ativo'
    }
  ];

  const filteredProducts = products
    .filter(product => product.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(product => categoryFilter === 'all' || product.category === (categoryFilter === 'camisetas' ? 'camiseta' : 'vestido'));

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-100 text-green-800';
      case 'Inativo':
        return 'bg-gray-100 text-gray-800';
      case 'Esgotado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Produtos</h1>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-butterfly-orange hover:bg-butterfly-orange/90">
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Produto</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do produto abaixo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="name" className="text-right text-sm font-medium">
                    Nome
                  </label>
                  <Input id="name" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right text-sm font-medium">
                    Descrição
                  </label>
                  <Input id="description" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="category" className="text-right text-sm font-medium">
                    Categoria
                  </label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="camiseta">Camiseta</SelectItem>
                      <SelectItem value="vestido">Vestido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="price" className="text-right text-sm font-medium">
                    Preço (R$)
                  </label>
                  <Input id="price" className="col-span-3" type="number" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="stock" className="text-right text-sm font-medium">
                    Estoque
                  </label>
                  <Input id="stock" className="col-span-3" type="number" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="image" className="text-right text-sm font-medium">
                    Imagem URL
                  </label>
                  <Input id="image" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="mr-2">Cancelar</Button>
                <Button className="bg-butterfly-orange hover:bg-butterfly-orange/90">Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
        
        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
            <CardDescription>Gerencie seu catálogo de produtos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Produto</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Categoria</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-500">Preço</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Estoque</th>
                    <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Status</th>
                    <th className="py-3 px-4 text-right text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden mr-3">
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <Shirt className="mr-1 h-4 w-4 text-gray-500" />
                          <span className="text-sm capitalize">
                            {product.category === 'camiseta' ? 'Camiseta' : 'Vestido'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium">R$ {product.price.toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={product.stock <= 5 ? "text-red-500 font-medium" : ""}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs py-1 px-2 rounded ${getStatusBadgeClass(product.status)}`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="h-8">
                            Editar
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8">
                                Estoque
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Atualizar Estoque</DialogTitle>
                                <DialogDescription>
                                  Ajuste o estoque para "{product.name}"
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <div className="flex items-center justify-between">
                                  <label className="text-sm font-medium">
                                    Estoque Atual:
                                  </label>
                                  <span 
                                    className={`font-medium ${product.stock <= 5 ? "text-red-500" : ""}`}
                                  >
                                    {product.stock} unidades
                                  </span>
                                </div>
                                <div className="mt-4">
                                  <label className="text-sm font-medium block mb-2">
                                    Novo Estoque:
                                  </label>
                                  <Input type="number" defaultValue={product.stock} />
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
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
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

export default AdminProdutos;
