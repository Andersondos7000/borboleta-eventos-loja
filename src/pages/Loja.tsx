
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Search, Filter, Grid, List, ChevronDown, Star, Heart } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard, { ProductProps } from '@/components/ProductCard';
import ProductModal from '@/components/ProductModal';
import OptimizedImage from '@/components/OptimizedImage';
import SizeChart from '@/components/SizeChart';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const Loja = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'camisetas' | 'vestidos'>('all');
  const [products, setProducts] = useState<ProductProps[]>([
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Camiseta Borboleta',
      price: 45,
      image: '/placeholder.svg',
      category: 'camiseta',
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
      inStock: true
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Vestido Elegante',
      price: 89,
      image: '/placeholder.svg',
      category: 'vestido',
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
      inStock: true
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceRange, setPriceRange] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const { toast } = useToast();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        
        // Buscar produtos com seus tamanhos
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('in_stock', true);

        if (productsError) {
          console.error('Error fetching products:', productsError);
          toast({
            title: "Erro ao carregar produtos",
            description: "Não foi possível carregar os produtos.",
            variant: "destructive"
          });
          return;
        }

        const formattedProducts: ProductProps[] = (productsData || []).map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image_url || '/placeholder.svg',
          category: product.category as 'camiseta' | 'vestido' | 'acessorio',
          sizes: product.sizes || [], // Usar diretamente a coluna sizes da tabela products
          inStock: product.in_stock,
          stock: product.in_stock ? 10 : 0 // Valor padrão de estoque quando disponível
        }));

        setProducts(formattedProducts);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  // Filtrar produtos por categoria, busca e preço
  const filteredProducts = products
    .filter(product => {
      // Filtro por categoria
      if (activeCategory !== 'all') {
        const categoryMatch = product.category === (activeCategory === 'camisetas' ? 'camiseta' : 'vestido');
        if (!categoryMatch) return false;
      }
      
      // Filtro por busca
      if (searchQuery) {
        const searchMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
        if (!searchMatch) return false;
      }
      
      // Filtro por preço
      if (priceRange !== 'all') {
        const price = product.price;
        switch (priceRange) {
          case 'low':
            if (price > 50) {
              return false;
            }
            break;
          case 'medium':
            if (price <= 50 || price > 100) {
              return false;
            }
            break;
          case 'high':
            if (price <= 100) {
              return false;
            }
            break;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Breadcrumbs */}
      <div className="bg-gray-50 py-4">
        <div className="container mx-auto px-4">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Início</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Loja</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>
      
      {/* Hero Banner */}
      <section className="bg-butterfly-black text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Loja Oficial
          </h1>
          <p className="text-lg max-w-2xl mx-auto">
            Produtos exclusivos da VII Conferência de Mulheres Queren Hapuque. 
            Encontre camisetas e vestidos em diversos tamanhos.
          </p>
        </div>
      </section>
      
      {/* Products Section */}
      <section className="bg-white py-8">
        <div className="container mx-auto px-4">
          {/* Filters and Search */}
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filters */}
              <div className="flex flex-wrap gap-4 items-center">
                {/* Category Filter */}
                <Select value={activeCategory} onValueChange={(value: 'all' | 'camisetas' | 'vestidos') => setActiveCategory(value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="camisetas">Camisetas</SelectItem>
                    <SelectItem value="vestidos">Vestidos</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Price Filter */}
                <Select value={priceRange} onValueChange={(value: 'all' | 'low' | 'medium' | 'high') => setPriceRange(value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Preço" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os preços</SelectItem>
                    <SelectItem value="low">Até R$ 50</SelectItem>
                    <SelectItem value="medium">R$ 50 - R$ 100</SelectItem>
                    <SelectItem value="high">Acima de R$ 100</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Sort Filter */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                    <SelectItem value="price-low">Menor preço</SelectItem>
                    <SelectItem value="price-high">Maior preço</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* View Mode */}
                <div className="flex border rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Results Count */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
              </p>
              
              {/* Active Filters */}
              <div className="flex gap-2">
                {activeCategory !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setActiveCategory('all')}>
                    {activeCategory === 'camisetas' ? 'Camisetas' : 'Vestidos'} ×
                  </Badge>
                )}
                {priceRange !== 'all' && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setPriceRange('all')}>
                    {priceRange === 'low' ? 'Até R$ 50' : priceRange === 'medium' ? 'R$ 50-100' : 'Acima R$ 100'} ×
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearchQuery('')}>
                    "{searchQuery}" ×
                  </Badge>
                )}
              </div>
            </div>
          </div>
            
            {isLoading ? (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
              }>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={viewMode === 'grid'
                    ? "bg-white rounded-lg shadow-md p-4 animate-pulse"
                    : "bg-white rounded-lg shadow-md p-4 animate-pulse flex gap-4"
                  }>
                    <div className={viewMode === 'grid'
                      ? "bg-gray-300 h-48 rounded mb-4"
                      : "bg-gray-300 w-32 h-32 rounded flex-shrink-0"
                    }></div>
                    <div className="flex-1">
                      <div className="bg-gray-300 h-4 rounded mb-2"></div>
                      <div className="bg-gray-300 h-4 rounded w-2/3 mb-2"></div>
                      <div className="bg-gray-300 h-4 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="text-gray-400 mb-4">
                    <Search className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum produto encontrado</h3>
                  <p className="text-gray-500 mb-4">
                    Não encontramos produtos que correspondam aos seus critérios de busca.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('all');
                      setPriceRange('all');
                    }}
                  >
                    Limpar filtros
                  </Button>
                </div>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
              }>
                {filteredProducts.map((product) => (
                  viewMode === 'grid' ? (
                    <ProductCard key={product.id} product={product} />
                  ) : (
                    <div key={product.id} className="bg-white rounded-lg shadow-md p-4 flex gap-4 hover:shadow-lg transition-shadow">
                       <ProductModal product={product} onSelectSize={() => {}}>
                         <div className="w-32 h-32 flex-shrink-0 cursor-pointer">
                           <OptimizedImage 
                             src={product.image} 
                             alt={product.name}
                             className="w-full h-full object-cover rounded-lg"
                             fallbackSrc="/placeholder.svg"
                           />
                         </div>
                       </ProductModal>
                       <div className="flex-1 flex flex-col justify-between">
                         <div>
                           <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                           <div className="flex items-center gap-2 mb-2">
                             <div className="flex items-center">
                               {[...Array(5)].map((_, i) => (
                                 <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                               ))}
                             </div>
                             <span className="text-sm text-gray-500">(4.8)</span>
                           </div>
                         </div>
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <span className="text-2xl font-bold text-butterfly-orange">
                                 R$ {product.price.toFixed(2)}
                               </span>
                               <Badge variant="secondary" className="text-xs">
                                 {product.category}
                               </Badge>
                             </div>
                             <div className="flex gap-2">
                               <Button 
                                 size="sm" 
                                 variant="outline"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   // Implementar lógica de favoritar
                                   toast({
                                     title: "Produto favoritado",
                                     description: `${product.name} foi adicionado aos favoritos.`
                                   });
                                 }}
                               >
                                 <Heart className="h-4 w-4" />
                               </Button>
                               <ProductModal product={product} onSelectSize={() => {}}>
                                 <Button size="sm">
                                   Ver Detalhes
                                 </Button>
                               </ProductModal>
                             </div>
                         </div>
                       </div>
                     </div>
                  )
                ))}
              </div>
            )}
        </div>
      </section>
      
      {/* Size Charts */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold mb-10 text-center">
            Tabelas de Medidas
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <Dialog>
              <DialogTrigger asChild>
                <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-display text-xl font-bold mb-4 text-butterfly-orange">
                    Tabela de Medidas - Camisetas
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Consulte as medidas de busto, cintura e quadril para cada tamanho de camiseta, 
                    desde o PP até o EXGG.
                  </p>
                  <Button variant="outline" className="mt-2">Ver Tabela</Button>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Tabela de Medidas - Camisetas</DialogTitle>
                  <DialogDescription>
                    Consulte as medidas de busto, cintura e quadril para cada tamanho de camiseta
                  </DialogDescription>
                </DialogHeader>
                <SizeChart type="camiseta" />
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-display text-xl font-bold mb-4 text-butterfly-orange">
                    Tabela de Medidas - Vestidos
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Consulte as medidas de busto, cintura e quadril para cada tamanho de vestido, 
                    desde o tamanho 0 até o EXGG.
                  </p>
                  <Button variant="outline" className="mt-2">Ver Tabela</Button>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Tabela de Medidas - Vestidos</DialogTitle>
                  <DialogDescription>
                    Consulte as medidas de busto, cintura e quadril para cada tamanho de vestido
                  </DialogDescription>
                </DialogHeader>
                <SizeChart type="vestido" />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>
      
      {/* Shipping & Returns */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold mb-10 text-center">
            Informações de Envio e Trocas
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-medium text-xl mb-4 text-butterfly-orange">Envio</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-butterfly-orange mr-2">•</span>
                  <span>Enviamos para todo o Brasil pelos Correios</span>
                </li>
                <li className="flex items-start">
                  <span className="text-butterfly-orange mr-2">•</span>
                  <span>Prazo de entrega estimado: 5-10 dias úteis</span>
                </li>
                <li className="flex items-start">
                  <span className="text-butterfly-orange mr-2">•</span>
                  <span>Frete grátis em todos os pedidos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-butterfly-orange mr-2">•</span>
                  <span>Produtos disponíveis para retirada no dia do evento</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-medium text-xl mb-4 text-butterfly-orange">Trocas e Devoluções</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="text-butterfly-orange mr-2">•</span>
                  <span>Aceitamos trocas em até 30 dias após o recebimento</span>
                </li>
                <li className="flex items-start">
                  <span className="text-butterfly-orange mr-2">•</span>
                  <span>O produto deve estar nas condições originais</span>
                </li>
                <li className="flex items-start">
                  <span className="text-butterfly-orange mr-2">•</span>
                  <span>Entre em contato com nosso suporte para solicitar a troca</span>
                </li>
                <li className="flex items-start">
                  <span className="text-butterfly-orange mr-2">•</span>
                  <span>Devoluções gratuitas em até 30 dias</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      
      {/* Payment Methods */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-8">
            Formas de Pagamento
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap justify-center gap-6">
              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-2xl">💳</span>
              </div>
              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-2xl">💵</span>
              </div>
              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-2xl">🏦</span>
              </div>
              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-2xl">📱</span>
              </div>
            </div>
            <p className="mt-8 text-gray-600">
              Aceitamos cartões de crédito, débito, boleto bancário e pix.
              <br />Parcelamos em até 12x no cartão de crédito.
            </p>
          </div>
        </div>
      </section>
      
      {/* Newsletter Section */}
      <section className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Fique por dentro das novidades
            </h2>
            <p className="text-purple-100 mb-8">
              Receba em primeira mão informações sobre novos produtos, promoções exclusivas e eventos da Queren Hapuque.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input 
                placeholder="Seu melhor e-mail"
                className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-purple-200"
              />
              <Button className="bg-white text-purple-600 hover:bg-purple-50">
                Inscrever-se
              </Button>
            </div>
            <p className="text-xs text-purple-200 mt-4">
              Ao se inscrever, você concorda com nossa política de privacidade.
            </p>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-butterfly-orange text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Não perca os produtos oficiais do evento!
          </h2>
          <p className="text-lg mb-8">
            Garante já suas peças exclusivas e esteja preparada para a conferência.
          </p>
          <Button 
            variant="outline" 
            size="lg" 
            className="border-white text-white hover:bg-white hover:text-butterfly-orange"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Ver Produtos
          </Button>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Loja;
