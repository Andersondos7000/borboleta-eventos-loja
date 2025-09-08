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

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  in_stock: boolean;
  total_stock: number; // DEPRECATED: was calculated from product_sizes, now based on in_stock boolean
  image: string;
  status: 'Ativo' | 'Esgotado';
  sizes?: ('PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG')[]; // tamanhos do produto
  images?: ProductImage[];
}

const AdminProdutos = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [editSelectedImages, setEditSelectedImages] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [currentProductImages, setCurrentProductImages] = useState<ProductImage[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    description: string;
    category: string;
    price: number;
    sizes?: ('PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG')[];
  }>({ name: '', description: '', category: '', price: 0, sizes: [] });
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
    price: 0,
    total_stock: 0,
    image_url: '',
    sizes: [] as ('PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG')[]
  });
  const [isSaving, setIsSaving] = useState(false);

  // Função para buscar produtos (reutilizável)
  const fetchProducts = async () => {
    console.log('[DEBUG] fetchProducts chamada');
    setIsLoading(true);
    
    // Mapeamento das categorias do enum
    const categoryMap = new Map([
      ['camiseta', 'Camisetas'],
      ['vestido', 'Vestidos'],
      ['acessorio', 'Acessórios']
    ]);
    
    // Buscar produtos
    console.log('[DEBUG] Iniciando query do Supabase...');
    
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
        sizes
       `);
       
    console.log('[DEBUG] Query executada. Error:', error, 'Data:', data);
       
    if (error) {
      console.error('[DEBUG] Erro detalhado:', error);
      toast({
        title: 'Erro ao carregar produtos',
        description: error.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    console.log('[DEBUG] Dados retornados do Supabase:', data);
    console.log('[DEBUG] Quantidade de produtos:', data?.length || 0);
    
    const formattedProducts: Product[] = (data || []).map((product: any) => {
      const categoryName = categoryMap.get(product.category) || '';
      // Para produtos com tamanhos, consideramos que há estoque se in_stock for true
      const totalStock = product.in_stock ? 1 : 0;
      
      console.log(`[DEBUG] Produto ${product.id}: nome="${product.name}", in_stock=${product.in_stock}, total_stock=${totalStock}`);
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        category: categoryName.toLowerCase() === 'camisetas' ? 'camiseta' : 'vestido',
        price: Number(product.price),
        in_stock: product.in_stock,
        total_stock: totalStock,
        image: product.image_url || '',
        status: totalStock <= 0 ? 'Esgotado' : 'Ativo',
        sizes: product.sizes || [],
      };
    });
    
    setProducts(formattedProducts);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[DEBUG] handleImageChange chamada para CRIAÇÃO');
    const files = Array.from(e.target.files || []);
    console.log('[DEBUG] Arquivos selecionados:', files.length);
    
    if (files.length === 0) return;

    // Validar tipos de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Apenas arquivos JPEG, PNG e WebP são permitidos.",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }

    // Validar tamanho dos arquivos (máximo 5MB cada)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: "Cada imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    setSelectedImages(files);
    setCurrentImageIndex(0);
    
    // Processar todas as imagens
    const previews: string[] = [];
    let processedCount = 0;
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        previews[index] = reader.result as string;
        processedCount++;
        
        if (processedCount === files.length) {
          setImagePreviews(previews);
          setMainImageIndex(0);
          // Usar a primeira imagem como principal
          setNewProduct(prev => ({ ...prev, image_url: previews[0] }));
          console.log('[DEBUG] Todas as imagens processadas:', previews.length);
        }
      };
      reader.onerror = () => {
        console.error('[DEBUG] Erro ao ler arquivo:', file.name);
        toast({
          title: "Erro ao processar imagem",
          description: `Não foi possível processar a imagem ${file.name}`,
          variant: "destructive"
        });
      };
      reader.readAsDataURL(file);
    });
    
    // Limpar o valor do input para permitir seleção do mesmo arquivo novamente
    e.target.value = '';
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[DEBUG] handleEditImageChange chamada para EDIÇÃO - múltiplas imagens');
    const files = Array.from(e.target.files || []);
    console.log('[DEBUG] Arquivos selecionados para edição:', files.length);
    
    if (files.length === 0) return;

    // Validar tipos de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Apenas arquivos JPEG, PNG e WebP são permitidos.",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }

    // Validar tamanho dos arquivos (máximo 5MB cada)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "Arquivo muito grande",
        description: "Cada imagem deve ter no máximo 5MB.",
        variant: "destructive"
      });
      e.target.value = '';
      return;
    }
    
    setEditSelectedImages(files);
    console.log('[DEBUG] editSelectedImages definido:', files.map(f => f.name));
    
    const previews: string[] = [];
    let processedCount = 0;
    
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        previews[index] = result;
        processedCount++;
        
        if (processedCount === files.length) {
          setEditImagePreviews(previews);
          console.log('[DEBUG] Todas as imagens de edição processadas:', previews.length);
        }
      };
      reader.onerror = () => {
        console.error('[DEBUG] Erro ao ler arquivo de edição:', file.name);
        toast({
          title: "Erro ao processar imagem",
          description: `Não foi possível processar a imagem ${file.name}`,
          variant: "destructive"
        });
      };
      reader.readAsDataURL(file);
    });
    
    // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const handleEditClick = async (product: Product) => {
    setEditingProduct(product);
    setEditFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      sizes: product.sizes || [],
    });
    
    // Carregar imagens existentes do produto
    try {
      const { data: images, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', product.id)
        .order('display_order');
      
      if (error) {
        console.error('Erro ao carregar imagens:', error);
        // Fallback para imagem única
        setCurrentProductImages([]);
        setEditImagePreviews(product.image ? [product.image] : []);
      } else {
        setCurrentProductImages(images || []);
        setEditImagePreviews(images?.map(img => img.image_url) || []);
      }
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      setCurrentProductImages([]);
      setEditImagePreviews(product.image ? [product.image] : []);
    }
  };

  const handleEditDialogClose = () => {
    setEditingProduct(null);
    setEditFormData({ name: '', description: '', category: '', price: 0, sizes: [] });
    setEditSelectedImages([]);
    setEditImagePreviews([]);
    setCurrentProductImages([]);
  };

  // Função para fazer upload de múltiplas imagens
  const uploadMultipleImages = async (files: File[], productId: string): Promise<string[]> => {
    const uploadPromises = files.map(async (file, index) => {
      const fileExtension = file.name.split('.').pop();
      const fileName = `product-${productId}-${Date.now()}-${index}.${fileExtension}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Erro no upload da imagem ${file.name}: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  // Função para salvar imagens na tabela product_images
  const saveProductImages = async (productId: string, imageUrls: string[]) => {
    // Primeiro, remover imagens existentes
    await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);

    // Inserir novas imagens
    const imageRecords = imageUrls.map((url, index) => ({
      product_id: productId,
      image_url: url,
      display_order: index,
      is_primary: index === 0, // Primeira imagem é a principal
      alt_text: `Imagem ${index + 1}`
    }));

    const { error } = await supabase
      .from('product_images')
      .insert(imageRecords);

    if (error) {
      throw new Error(`Erro ao salvar imagens: ${error.message}`);
    }
  };

  // Função para atualizar produto
  const handleUpdateProduct = async (productId: string, updatedData: Partial<Product>) => {
    try {
      console.log('[DEBUG] handleUpdateProduct chamada com:', {
        productId,
        updatedData
      });

      let primaryImageUrl = updatedData.image;

      // Se há novas imagens selecionadas, fazer upload
      if (editSelectedImages.length > 0) {
        try {
          console.log('[DEBUG] Fazendo upload de', editSelectedImages.length, 'imagens');
          
          // Upload das múltiplas imagens
          const imageUrls = await uploadMultipleImages(editSelectedImages, productId);
          
          // Salvar imagens na tabela product_images
          await saveProductImages(productId, imageUrls);
          
          // A primeira imagem se torna a imagem principal
          primaryImageUrl = imageUrls[0];
          
          console.log('[DEBUG] Imagens carregadas:', imageUrls);
        } catch (error) {
          console.error('Erro no processo de upload:', error);
          toast({
            title: "Erro no upload das imagens",
            description: error instanceof Error ? error.message : "Falha ao processar as imagens",
            variant: "destructive"
          });
          return;
        }
      }

      // O campo category no banco é TEXT, não UUID - usar string diretamente
      const updatePayload = {
        name: updatedData.name,
        description: updatedData.description,
        price: updatedData.price,
        category: updatedData.category?.toLowerCase(), // Garantir minúsculas
        image_url: primaryImageUrl,
        sizes: updatedData.sizes || []
      };

      console.log('[DEBUG] Payload para Supabase:', updatePayload);

      // Atualizar no banco de dados (incluindo campos de medidas)
      const { data, error } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', productId)
        .select();

      console.log('[DEBUG] Resposta do Supabase:', { data, error });
      console.log('[DEBUG] Linhas afetadas:', data?.length || 0);

      if (error) {
        toast({
          title: "Erro ao atualizar produto",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (!data || data.length === 0) {
        console.error('[DEBUG] Nenhuma linha foi atualizada - possível problema de permissão RLS');
        toast({
          title: "Erro ao atualizar produto",
          description: "Nenhuma linha foi atualizada. Verifique as permissões.",
          variant: "destructive"
        });
        return;
      }

      // Os tamanhos são armazenados diretamente na coluna 'sizes' da tabela products
      // Não há necessidade de operações adicionais na tabela product_sizes

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
      
      // Limpar estados de imagem após atualização bem-sucedida
      setEditSelectedImages([]);
      setEditImagePreviews([]);
      
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

      // DEPRECATED: product_sizes table removed - updating in_stock status directly in products table
      const { error: stockError } = await supabase
          .from('products')
          .update({
            in_stock: newStock > 0
          })
          .eq('id', productId);

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

      // DEPRECATED: product_sizes table removed - sizes are now stored in products.sizes array
      // No need to delete from product_sizes table anymore

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

    if (!newProduct.sizes || newProduct.sizes.length === 0) {
      toast({
        title: "Tamanhos obrigatórios",
        description: "Selecione pelo menos um tamanho para o produto.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Verificar se já existe um produto com o mesmo nome
      const { data: existingProduct, error: checkError } = await supabase
        .from('products')
        .select('id, name')
        .eq('name', newProduct.name.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Erro ao verificar produto existente:', checkError);
        throw checkError;
      }

      if (existingProduct) {
        toast({
          title: "Produto já existe",
          description: `Já existe um produto com o nome "${newProduct.name}". Escolha um nome diferente.`,
          variant: "destructive"
        });
        setIsSaving(false);
        return;
      }
      let imageUrl = null;
      let uploadedImageUrls: string[] = [];
      
      // Upload das imagens para o Supabase Storage se imagens foram selecionadas
      if (selectedImages.length > 0) {
        console.log('[DEBUG] Fazendo upload de', selectedImages.length, 'imagens');
        
        // Upload de todas as imagens
        uploadedImageUrls = await uploadMultipleImages(selectedImages);
        
        if (uploadedImageUrls.length > 0) {
          imageUrl = uploadedImageUrls[0]; // Primeira imagem como principal
          console.log('[DEBUG] URLs das imagens:', uploadedImageUrls);
        }
      }

      // Garantir que a categoria esteja em minúsculas conforme constraint do banco
      const categoryValue = newProduct.category.toLowerCase();
      const productName = newProduct.name.trim(); // Remover espaços extras

      const { data, error } = await supabase
        .from('products')
        .insert({
          name: newProduct.name,
          description: newProduct.description,
          category: categoryValue,
          price: newProduct.price,
          image_url: imageUrl,
          in_stock: newProduct.stock > 0,
          sizes: newProduct.sizes || [],
          stock: newProduct.stock
        })
        .select()
        .single();

      if (error) {
        console.error('[DEBUG] Erro ao criar produto:', error);
        toast({
          title: "Erro ao criar produto",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      console.log('[DEBUG] Produto criado:', data);

      // Salvar todas as imagens na tabela product_images
      if (uploadedImageUrls.length > 0) {
        await saveProductImages(data.id, uploadedImageUrls);
      }

      // Os tamanhos são armazenados diretamente na coluna 'sizes' da tabela products
      // Não há necessidade de criar entradas separadas na tabela product_sizes

      toast({
        title: "Produto criado",
        description: "O produto foi criado com sucesso.",
      });
      
      // Limpar estados
      setNewProduct({ name: '', description: '', category: '', price: 0, stock: 0, image_url: '', sizes: [] });
      setSelectedImages([]);
      setImagePreviews([]);
      setCurrentImageIndex(0);
      setIsDialogOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('[DEBUG] Erro inesperado:', error);
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
            <DialogContent className="w-[95vw] max-w-[550px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Produto</DialogTitle>
                <DialogDescription>
                  Preencha os detalhes do produto abaixo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <label htmlFor="name" className="text-left sm:text-right text-sm font-medium">
                    Nome
                  </label>
                  <Input 
                    id="name" 
                    className="sm:col-span-3" 
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <label htmlFor="description" className="text-left sm:text-right text-sm font-medium">
                    Descrição
                  </label>
                  <Input 
                    id="description" 
                    className="sm:col-span-3" 
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <label htmlFor="category" className="text-left sm:text-right text-sm font-medium">
                    Categoria
                  </label>
                  <Select value={newProduct.category} onValueChange={(value) => setNewProduct({...newProduct, category: value})}>
                    <SelectTrigger className="sm:col-span-3">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="camiseta">Camiseta</SelectItem>
                      <SelectItem value="vestido">Vestido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <label htmlFor="price" className="text-left sm:text-right text-sm font-medium">
                    Preço (R$)
                  </label>
                  <Input 
                    id="price" 
                    className="sm:col-span-3" 
                    type="number" 
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value) || 0})}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <label htmlFor="stock" className="text-left sm:text-right text-sm font-medium">
                    Estoque
                  </label>
                  <Input 
                    id="stock" 
                    className="sm:col-span-3" 
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: Number(e.target.value) || 0})}
                  />
                </div>




                {/* Campo de Tamanhos Múltiplos */}
                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                  <label className="text-left sm:text-right text-sm font-medium">
                    Tamanhos
                  </label>
                  <div className="sm:col-span-3 space-y-2">
                    <div className="flex flex-wrap gap-3">
                      {['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].map((size) => (
                        <label key={size} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newProduct.sizes?.includes(size as 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG') || false}
                            onChange={(e) => {
                              const currentSizes = newProduct.sizes || [];
                              if (e.target.checked) {
                                setNewProduct(prev => ({
                                  ...prev,
                                  sizes: [...currentSizes, size as 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG']
                                }));
                              } else {
                                setNewProduct(prev => ({
                                  ...prev,
                                  sizes: currentSizes.filter(s => s !== size)
                                }));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium">{size}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Selecione os tamanhos disponíveis para este produto
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                  <label htmlFor="image" className="text-left sm:text-right text-sm font-medium">
                    Imagens
                  </label>
                  <div className="sm:col-span-3 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('create-image-upload')?.click()}
                      className="w-full"
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Selecionar Imagens
                    </Button>
                    {imagePreviews.length > 0 && (
                      <div className="space-y-2">
                        <div className="relative w-full h-40 rounded-md overflow-hidden border">
                          <img 
                            src={imagePreviews[currentImageIndex]} 
                            alt={`Preview ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                              disabled={currentImageIndex === 0}
                            >
                              ← Anterior
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentImageIndex(prev => Math.min(imagePreviews.length - 1, prev + 1))}
                              disabled={currentImageIndex === imagePreviews.length - 1}
                            >
                              Próxima →
                            </Button>
                          </div>
                          <span className="text-sm text-gray-500">
                            {currentImageIndex + 1} de {imagePreviews.length}
                          </span>
                        </div>
                        <div className="flex gap-1 overflow-x-auto">
                          {imagePreviews.map((preview, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setCurrentImageIndex(index)}
                              className={`flex-shrink-0 w-12 h-12 rounded border-2 overflow-hidden ${
                                index === currentImageIndex ? 'border-blue-500' : 'border-gray-200'
                              }`}
                            >
                              <img
                                src={preview}
                                alt={`Miniatura ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
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
                            <DialogContent className="w-[95vw] max-w-[550px] max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Editar Produto</DialogTitle>
                                <DialogDescription>
                                  Altere os detalhes do produto.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                  <label htmlFor="edit-name" className="text-left sm:text-right text-sm font-medium">
                                    Nome
                                  </label>
                                  <Input 
                                    id="edit-name" 
                                    className="sm:col-span-3" 
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                  <label htmlFor="edit-description" className="text-left sm:text-right text-sm font-medium">
                                    Descrição
                                  </label>
                                  <Input 
                                    id="edit-description" 
                                    className="sm:col-span-3" 
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                                  />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                  <label htmlFor="edit-category" className="text-left sm:text-right text-sm font-medium">
                                    Categoria
                                  </label>
                                  <Select 
                                    value={editFormData.category}
                                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, category: value }))}
                                  >
                                    <SelectTrigger className="sm:col-span-3">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="camiseta">Camiseta</SelectItem>
                                      <SelectItem value="vestido">Vestido</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                  <label htmlFor="edit-price" className="text-left sm:text-right text-sm font-medium">
                                    Preço (R$)
                                  </label>
                                  <Input 
                                    id="edit-price" 
                                    className="sm:col-span-3" 
                                    type="number" 
                                    value={editFormData.price}
                                    onChange={(e) => setEditFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                                  />
                                </div>




                                {/* Campo de Tamanhos Múltiplos */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                                  <label className="text-left sm:text-right text-sm font-medium">
                                    Tamanhos
                                  </label>
                                  <div className="sm:col-span-3 space-y-2">
                                    <div className="flex flex-wrap gap-3">
                                      {['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'].map((size) => (
                                        <label key={size} className="flex items-center space-x-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={editFormData.sizes?.includes(size as 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG') || false}
                                            onChange={(e) => {
                                              const currentSizes = editFormData.sizes || [];
                                              if (e.target.checked) {
                                                setEditFormData(prev => ({
                                                  ...prev,
                                                  sizes: [...currentSizes, size as 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG']
                                                }));
                                              } else {
                                                setEditFormData(prev => ({
                                                  ...prev,
                                                  sizes: currentSizes.filter(s => s !== size)
                                                }));
                                              }
                                            }}
                                            className="rounded border-gray-300 text-butterfly-orange focus:ring-butterfly-orange"
                                          />
                                          <span className="text-sm font-medium">{size}</span>
                                        </label>
                                      ))}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                      Selecione um ou mais tamanhos disponíveis para este produto
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                  <label className="text-left sm:text-right text-sm font-medium">
                                    Imagens
                                  </label>
                                  <div className="col-span-3 space-y-4">
                                    <div className="flex items-center gap-4">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById('edit-image-upload')?.click()}
                                        className="w-full"
                                      >
                                        <ImagePlus className="mr-2 h-4 w-4" />
                                        Alterar Imagens
                                      </Button>
                                    </div>
                                    
                                    {/* Grid de pré-visualização das imagens */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                      {editImagePreviews.length > 0 ? (
                                        editImagePreviews.map((preview, index) => (
                                          <div key={index} className="relative w-full h-32 rounded-md overflow-hidden border">
                                            <img
                                              src={preview}
                                              alt={`Imagem ${index + 1}`}
                                              className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                              {index + 1}
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="col-span-full text-center text-gray-500 py-8">
                                          Nenhuma imagem selecionada
                                        </div>
                                      )}
                                    </div>
                                    
                                    {editImagePreviews.length > 0 && (
                                      <p className="text-xs text-gray-500">
                                        {editImagePreviews.length} imagem(ns) selecionada(s). A primeira será a imagem principal.
                                      </p>
                                    )}
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
                                    category: editFormData.category as 'camiseta' | 'vestido',
                                    image: editImagePreviews[0] || product.image,
                                    sizes: editFormData.sizes
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
      
      {/* Inputs de arquivo separados para upload de imagens */}
      <input
        type="file"
        id="create-image-upload"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        type="file"
        id="edit-image-upload"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleEditImageChange}
      />
    </div>
  );
};

export default AdminProdutos;
