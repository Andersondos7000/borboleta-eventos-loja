
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProductCard, { ProductProps } from '../components/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const Loja: React.FC = () => {
  const [products, setProducts] = useState<ProductProps[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductProps[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar produtos do Supabase
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('in_stock', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Erro ao carregar produtos:', error);
          setError('Erro ao carregar produtos');
          return;
        }

        // Mapear dados do Supabase para o formato esperado pelo ProductCard
        const mappedProducts: ProductProps[] = await Promise.all(
          (data || []).map(async (product) => {
            // Carregar imagens múltiplas do produto
            let primaryImage = product.image_url || '/placeholder.svg';
            
            try {
              const { data: images, error: imagesError } = await supabase
                .from('product_images')
                .select('image_url, is_primary')
                .eq('product_id', product.id)
                .order('display_order', { ascending: true });

              if (!imagesError && images && images.length > 0) {
                // Usar a primeira imagem ou a marcada como primária
                const primaryImg = images.find(img => img.is_primary) || images[0];
                primaryImage = primaryImg.image_url;
              }
            } catch (imgError) {
              console.error('Erro ao carregar imagens do produto:', product.id, imgError);
            }

            return {
              id: product.id,
              name: product.name,
              price: product.price,
              image: primaryImage,
              category: product.category as 'camiseta' | 'vestido' | 'acessorio',
              sizes: product.sizes || [],
              inStock: product.in_stock,
              stock: product.stock
            };
          })
        );

        setProducts(mappedProducts);
        setFilteredProducts(mappedProducts);
      } catch (err) {
        console.error('Erro ao carregar produtos:', err);
        setError('Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Filtrar produtos por categoria
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(product => product.category === selectedCategory));
    }
  }, [selectedCategory, products]);

  const categories = [
    { value: 'all', label: 'Todos os Produtos' },
    { value: 'camiseta', label: 'Camisetas' },
    { value: 'vestido', label: 'Vestidos' },
    { value: 'acessorio', label: 'Acessórios' },
    { value: 'calca', label: 'Calças' },
    { value: 'blusa', label: 'Blusas' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Loja
          </h1>
          <p className="text-xl text-gray-600">
            Descubra nossa coleção exclusiva
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filtrar por categoria:</span>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-gray-600">Carregando produtos...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Grid de Produtos */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {filteredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Mensagem quando não há produtos */}
        {!loading && !error && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {selectedCategory === 'all' 
                ? 'Nenhum produto disponível no momento.' 
                : 'Nenhum produto encontrado nesta categoria.'}
            </p>
          </div>
        )}

        {/* Seções Informativas */}
        {!loading && !error && filteredProducts.length > 0 && (
          <>
            {/* Tabelas de Medidas */}
            <section className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Tabelas de Medidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Camisetas</h3>
                  <Button variant="outline" className="w-full">
                    Ver Tabela de Medidas
                  </Button>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Vestidos</h3>
                  <Button variant="outline" className="w-full">
                    Ver Tabela de Medidas
                  </Button>
                </div>
              </div>
            </section>

            {/* Informações de Envio e Trocas */}
            <section className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Informações de Envio e Trocas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Envio</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Envio para todo o Brasil</li>
                    <li>• Prazo de entrega: 5-10 dias úteis</li>
                    <li>• Frete grátis acima de R$ 150</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Trocas</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• 30 dias para trocas</li>
                    <li>• Produto em perfeito estado</li>
                    <li>• Etiquetas preservadas</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Pagamento</h3>
                  <ul className="text-gray-600 space-y-1">
                    <li>• Cartão de crédito</li>
                    <li>• PIX com desconto</li>
                    <li>• Parcelamento sem juros</li>
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Loja;
