import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shirt, Search, PlusCircle, ImagePlus, Trash2 } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [editingStockProduct, setEditingStockProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  // Estado para gerenciar produtos
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estado para o formulário de cadastro
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    stock: '',
    image_url: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // Função para buscar produtos (reutilizável)
  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*');
    if (error) {
      toast({
        title: 'Erro ao carregar produtos',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    const formattedProducts: Product[] = (data || []).map((product: any) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      category: product.category,
      price: Number(product.price),
      stock: product.stock ?? 0,
      image: product.image_url || '',
      status: product.in_stock === false || product.stock === 0 ? 'Esgotado' : 'Ativo',
    }));
    setProducts(formattedProducts);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setImagePreview(product.image);
  };

  const handleEditDialogClose = () => {
    setEditingProduct(null);
    setSelectedImage(null);
    setImagePreview('');
  };

  // Função para atualizar produto
  const handleUpdateProduct = (productId: string, updatedData: Partial<Product>) => {
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === productId 
          ? { ...product, ...updatedData }
          : product
      )
    );
    
    toast({
      title: "Produto atualizado",
      description: "As alterações foram salvas com sucesso.",
    });
    
    handleEditDialogClose();
  };

  // Função para atualizar estoque
  const handleUpdateStock = async (productId: string, newStock: number) => {
    // Atualiza no banco
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock, in_stock: newStock > 0 })
      .eq('id', productId);
    if (error) {
      toast({
        title: 'Erro ao atualizar estoque',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Estoque atualizado',
      description: `Estoque atualizado para ${newStock} unidades.`,
    });
    setEditingStockProduct(null);
    setNewStockValue(0);
    fetchProducts();
  };

  // Função para remover produto
  const handleRemoveProduct = (productId: string) => {
    setProducts(prevProducts => 
      prevProducts.filter(product => product.id !== productId)
    );
    
    toast({
      title: "Produto removido",
      description: "O produto foi removido com sucesso.",
    });
  };

  // Função para abrir diálogo de estoque
  const handleStockClick = (product: Product) => {
    setEditingStockProduct(product);
    setNewStockValue(product.stock);
  };

  // Função para cadastrar produto no Supabase
  const handleCreateProduct = async () => {
    setIsSaving(true);
    const { name, description, category, price, stock, image_url } = newProduct;
    const { error } = await supabase.from('products').insert({
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock),
      image_url,
      in_stock: Number(stock) > 0
    });
    setIsSaving(false);
    if (error) {
      toast({
        title: 'Erro ao cadastrar produto',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Produto cadastrado',
      description: 'Produto adicionado com sucesso!',
    });
    setNewProduct({ name: '', description: '', category: '', price: '', stock: '', image_url: '' });
    fetchProducts();
  };

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
                  <label className="text-right text-sm font-medium">
                    Imagem
                  </label>
                  <div className="col-span-3 space-y-4">
                    <div className="flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        className="w-full"
                      >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        Selecionar Imagem
                      </Button>
                      <input
                        type="file"
                        id="image-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                    {imagePreview && (
                      <div className="relative w-full h-40 rounded-md overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8"
                                onClick={() => handleEditClick(product)}
                              >
                                Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[550px]">
                              <DialogHeader>
                                <DialogTitle>Editar Produto</DialogTitle>
                                <DialogDescription>
                                  Altere os detalhes do produto.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="edit-name" className="text-right text-sm font-medium">
                                    Nome
                                  </label>
                                  <Input 
                                    id="edit-name" 
                                    className="col-span-3" 
                                    defaultValue={product.name} 
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="edit-description" className="text-right text-sm font-medium">
                                    Descrição
                                  </label>
                                  <Input 
                                    id="edit-description" 
                                    className="col-span-3" 
                                    defaultValue={product.description} 
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="edit-category" className="text-right text-sm font-medium">
                                    Categoria
                                  </label>
                                  <Select defaultValue={product.category}>
                                    <SelectTrigger className="col-span-3">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="camiseta">Camiseta</SelectItem>
                                      <SelectItem value="vestido">Vestido</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="edit-price" className="text-right text-sm font-medium">
                                    Preço (R$)
                                  </label>
                                  <Input 
                                    id="edit-price" 
                                    className="col-span-3" 
                                    type="number" 
                                    defaultValue={product.price}
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="edit-stock" className="text-right text-sm font-medium">
                                    Estoque
                                  </label>
                                  <Input 
                                    id="edit-stock" 
                                    className="col-span-3" 
                                    type="number" 
                                    defaultValue={product.stock}
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="edit-status" className="text-right text-sm font-medium">
                                    Status
                                  </label>
                                  <Select defaultValue={product.status}>
                                    <SelectTrigger className="col-span-3">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Ativo">Ativo</SelectItem>
                                      <SelectItem value="Inativo">Inativo</SelectItem>
                                      <SelectItem value="Esgotado">Esgotado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label className="text-right text-sm font-medium">
                                    Imagem
                                  </label>
                                  <div className="col-span-3 space-y-4">
                                    <div className="flex items-center gap-4">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById(`edit-image-upload-${product.id}`)?.click()}
                                        className="w-full"
                                      >
                                        <ImagePlus className="mr-2 h-4 w-4" />
                                        Alterar Imagem
                                      </Button>
                                      <input
                                        type="file"
                                        id={`edit-image-upload-${product.id}`}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                      />
                                    </div>
                                    <div className="relative w-full h-40 rounded-md overflow-hidden border">
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" className="mr-2" onClick={handleEditDialogClose}>
                                  Cancelar
                                </Button>
                                <Button 
                                  className="bg-butterfly-orange hover:bg-butterfly-orange/90"
                                  onClick={() => handleUpdateProduct(product.id, {
                                    name: (document.getElementById('edit-name') as HTMLInputElement)?.value || product.name,
                                    description: (document.getElementById('edit-description') as HTMLInputElement)?.value || product.description,
                                    price: Number((document.getElementById('edit-price') as HTMLInputElement)?.value) || product.price,
                                    stock: Number((document.getElementById('edit-stock') as HTMLInputElement)?.value) || product.stock,
                                  })}
                                >
                                  Salvar Alterações
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8"
                                onClick={() => handleStockClick(product)}
                              >
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
                                  <Input 
                                    type="number" 
                                    value={newStockValue}
                                    onChange={(e) => setNewStockValue(Number(e.target.value))}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  variant="outline" 
                                  className="mr-2"
                                  onClick={() => {
                                    setEditingStockProduct(null);
                                    setNewStockValue(0);
                                  }}
                                >
                                  Cancelar
                                </Button>
                                <Button 
                                  className="bg-butterfly-orange hover:bg-butterfly-orange/90"
                                  onClick={() => handleUpdateStock(product.id, newStockValue)}
                                >
                                  Salvar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle>Remover Produto</DialogTitle>
                                <DialogDescription>
                                  Tem certeza que deseja remover "{product.name}"? Esta ação não pode ser desfeita.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" className="mr-2">
                                  Cancelar
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => handleRemoveProduct(product.id)}
                                >
                                  Remover
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
