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
  const [editFormData, setEditFormData] = useState<{
    name: string;
    description: string;
    category: string;
    price: number;
    stock: number;
  }>({ name: '', description: '', category: '', price: 0, stock: 0 });
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
    
    // Buscar categorias primeiro
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name');
    
    if (categoriesError) {
      toast({
        title: 'Erro ao carregar categorias',
        description: categoriesError.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    // Criar mapa de categorias
    const categoryMap = new Map();
    categoriesData?.forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });
    
    // Buscar produtos com estoque da tabela product_sizes
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        category,
        price,
        image_url,
        in_stock,
        created_at,
        updated_at,
        product_sizes(
          stock_quantity
        )
      `);
       
    if (error) {
      toast({
        title: 'Erro ao carregar produtos',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    const formattedProducts: Product[] = (data || []).map((product: any) => {
      const categoryName = categoryMap.get(product.category) || '';
      // Calcular estoque total somando todas as quantidades dos tamanhos
      const totalStock = product.product_sizes?.reduce((total: number, size: any) => {
        return total + (size.stock_quantity || 0);
      }, 0) || 0;
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        category: categoryName.toLowerCase() === 'camisetas' ? 'camiseta' : 'vestido',
        price: Number(product.price),
        stock: totalStock,
        image: product.image_url || '',
        status: totalStock <= 0 ? 'Esgotado' : 'Ativo',
      };
    });
    
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
    setEditFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stock: product.stock
    });
    setImagePreview(product.image);
  };

  const handleEditDialogClose = () => {
    setEditingProduct(null);
    setEditFormData({ name: '', description: '', category: '', price: 0, stock: 0 });
    setSelectedImage(null);
    setImagePreview('');
  };

  // Função para atualizar produto
  const handleUpdateProduct = async (productId: string, updatedData: Partial<Product>) => {
    try {
      // Mapear categoria para UUID correto do banco
      const categoryUUID = updatedData.category === 'camiseta' 
        ? '6bf31188-1102-4b36-82ae-1084e385558a' // ID real da categoria Camisetas
        : 'd60ec377-97e0-484d-ab90-fa291c1aba66'; // ID real da categoria Vestidos

      // Atualizar no banco de dados (sem o campo stock)
      const { error } = await supabase
        .from('products')
        .update({
          name: updatedData.name,
          description: updatedData.description,
          price: updatedData.price,
          category: categoryUUID,
          image_url: updatedData.image
        })
        .eq('id', productId);

      if (error) {
        toast({
          title: "Erro ao atualizar produto",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Se houver alteração no estoque, atualizar na tabela product_sizes
        if (updatedData.stock !== undefined) {
          const { error: stockError } = await supabase
            .from('product_sizes')
            .upsert({
              product_id: productId,
              size: 'M',
              stock_quantity: updatedData.stock
            }, {
              onConflict: 'product_id,size'
            });

          if (stockError) {
            console.error('Erro ao atualizar estoque:', stockError);
          }
        }

      // Atualizar estado local
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
      fetchProducts(); // Recarregar produtos para garantir sincronização
    } catch (error) {
      toast({
        title: "Erro ao atualizar produto",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    }
  };

  // Função para atualizar estoque
  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      // 1. Atualizar o status in_stock na tabela products
      const { error: productError } = await supabase
        .from('products')
        .update({ in_stock: newStock > 0 })
        .eq('id', productId);
      
      if (productError) {
        throw productError;
      }

      // 2. Atualizar ou inserir na tabela product_sizes (assumindo tamanho padrão 'M')
      const { error: stockError } = await supabase
          .from('product_sizes')
          .upsert({
            product_id: productId,
            size: 'M',
            stock_quantity: newStockValue
          }, {
            onConflict: 'product_id,size'
          });

      if (stockError) {
        throw stockError;
      }
      
      // 3. Atualizar estado local
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, stock: newStock, status: newStock > 0 ? 'Ativo' : 'Esgotado' }
            : product
        )
      );
      
      toast({
        title: 'Estoque atualizado',
        description: `Estoque atualizado para ${newStock} unidades.`,
      });
      
      setEditingStockProduct(null);
      setNewStockValue(0);
      
      // 4. Recarregar produtos para garantir sincronização
      await fetchProducts();
      
    } catch (error: any) {
      console.error('Erro ao atualizar estoque:', error);
      toast({
        title: 'Erro ao atualizar estoque',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    }
  };

  // Função para remover produto
  const handleRemoveProduct = async (productId: string) => {
    try {
      // Primeiro, verificar se o produto ainda existe
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', productId)
        .single();

      if (checkError || !existingProduct) {
        // Produto já foi removido, apenas atualizar o estado local
        setProducts(prevProducts => 
          prevProducts.filter(product => product.id !== productId)
        );
        
        toast({
          title: "Produto já removido",
          description: "O produto já foi removido anteriormente.",
          variant: "default"
        });
        
        // Recarregar produtos para garantir sincronização
        await fetchProducts();
        return;
      }

      // Verificar se há itens no carrinho que referenciam este produto
      const { data: cartItems, error: cartError } = await supabase
        .from('cart_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (cartError) {
        console.error('Erro ao verificar itens do carrinho:', cartError);
      }

      // Se há itens no carrinho, removê-los primeiro
      if (cartItems && cartItems.length > 0) {
        const { error: deleteCartError } = await supabase
          .from('cart_items')
          .delete()
          .eq('product_id', productId);

        if (deleteCartError) {
          console.error('Erro ao remover itens do carrinho:', deleteCartError);
          toast({
            title: "Erro ao remover produto",
            description: "Não foi possível remover os itens do carrinho associados ao produto.",
            variant: "destructive"
          });
          return;
        }
      }

      // Verificar e remover itens de pedidos se necessário
      const { data: orderItems, error: orderError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (orderItems && orderItems.length > 0) {
        toast({
          title: "Não é possível remover produto",
          description: "Este produto possui pedidos associados e não pode ser removido. Considere desativá-lo.",
          variant: "destructive"
        });
        return;
      }

      // Remover tamanhos do produto
      const { error: sizesError } = await supabase
        .from('product_sizes')
        .delete()
        .eq('product_id', productId);

      if (sizesError) {
        console.error('Erro ao remover tamanhos do produto:', sizesError);
      }

      // Agora remover o produto
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .select();

      if (error) {
        console.error('Erro ao remover produto:', error);
        toast({
          title: "Erro ao remover produto",
          description: error.message || "Falha na autenticação. Faça login como administrador.",
          variant: "destructive"
        });
        return;
      }

      // Verificar se algum produto foi realmente removido
      if (!data || data.length === 0) {
        toast({
          title: "Erro ao remover produto",
          description: "Produto não encontrado ou não foi possível remover.",
          variant: "destructive"
        });
        return;
      }

      // Atualizar estado local apenas se a remoção foi bem-sucedida
      setProducts(prevProducts => 
        prevProducts.filter(product => product.id !== productId)
      );
      
      toast({
        title: "Produto removido",
        description: "O produto foi removido com sucesso.",
      });
      
      // Recarregar produtos para garantir sincronização
      await fetchProducts();
    } catch (error: any) {
      console.error('Erro inesperado ao remover produto:', error);
      toast({
        title: "Erro ao remover produto",
        description: error?.message || "Ocorreu um erro inesperado. Verifique sua autenticação.",
        variant: "destructive"
      });
    }
  };

  // Função para abrir diálogo de estoque
  const handleStockClick = (product: Product) => {
    setEditingStockProduct(product);
    setNewStockValue(product.stock);
  };

  // Função para cadastrar produto no Supabase
  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.category || !newProduct.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, categoria e preço são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Mapear categoria para UUID correto do banco
      const categoryUUID = newProduct.category === 'camiseta' 
        ? '6bf31188-1102-4b36-82ae-1084e385558a' // ID real da categoria Camisetas
        : 'd60ec377-97e0-484d-ab90-fa291c1aba66'; // ID real da categoria Vestidos

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: newProduct.name,
          description: newProduct.description,
          category: categoryUUID,
          price: Number(newProduct.price),
          image_url: newProduct.image_url || null,
          in_stock: Number(newProduct.stock) > 0
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Erro ao criar produto",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Se há estoque inicial, criar entrada na tabela product_sizes
        if (Number(newProduct.stock) > 0) {
          const { error: stockError } = await supabase
            .from('product_sizes')
            .upsert({
              product_id: data.id,
              size: 'M',
              stock_quantity: Number(newProduct.stock)
            }, {
              onConflict: 'product_id,size'
            });

          if (stockError) {
            console.error('Erro ao criar estoque inicial:', stockError);
          }
        }

      toast({
        title: "Produto criado",
        description: "O produto foi criado com sucesso.",
      });
      
      setNewProduct({ name: '', description: '', category: '', price: '', stock: '', image_url: '' });
      fetchProducts();
    } catch (error) {
      toast({
        title: "Erro ao criar produto",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
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
                  <Input 
                    id="name" 
                    className="col-span-3" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="description" className="text-right text-sm font-medium">
                    Descrição
                  </label>
                  <Input 
                    id="description" 
                    className="col-span-3" 
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="category" className="text-right text-sm font-medium">
                    Categoria
                  </label>
                  <Select value={newProduct.category} onValueChange={(value) => setNewProduct({...newProduct, category: value})}>
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
                  <Input 
                    id="price" 
                    className="col-span-3" 
                    type="number" 
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="stock" className="text-right text-sm font-medium">
                    Estoque
                  </label>
                  <Input 
                    id="stock" 
                    className="col-span-3" 
                    type="number" 
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">
                    Imagem
                  </label>
                  <div className="col-span-3">
                    <Input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setNewProduct({ ...newProduct, image_url: event.target?.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>
                {newProduct.image_url && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label className="text-right text-sm font-medium">
                      Preview
                    </label>
                    <div className="col-span-3">
                      <div className="relative w-full h-40 rounded-md overflow-hidden">
                        <img
                          src={newProduct.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" className="mr-2">Cancelar</Button>
                <Button 
                  className="bg-butterfly-orange hover:bg-butterfly-orange/90"
                  onClick={handleCreateProduct}
                  disabled={isSaving || !newProduct.name || !newProduct.category || !newProduct.price}
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
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
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="edit-description" className="text-right text-sm font-medium">
                                    Descrição
                                  </label>
                                  <Input 
                                    id="edit-description" 
                                    className="col-span-3" 
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <label htmlFor="edit-category" className="text-right text-sm font-medium">
                                    Categoria
                                  </label>
                                  <Select 
                                    value={editFormData.category}
                                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                                  >
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
                                    value={editFormData.price}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
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
                                    value={editFormData.stock}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                                  />
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
                                    name: editFormData.name,
                                    description: editFormData.description,
                                    price: editFormData.price,
                                    stock: editFormData.stock,
                                    category: editFormData.category as 'camiseta' | 'vestido',
                                    status: editFormData.stock > 0 ? 'Ativo' : 'Esgotado',
                                    image: imagePreview || product.image
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
