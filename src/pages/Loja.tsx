
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard, { ProductProps } from '@/components/ProductCard';
import SizeChart from '@/components/SizeChart';

const Loja = () => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'camisetas' | 'vestidos'>('all');

  const products: ProductProps[] = [
    {
      id: 'tshirt-1',
      name: 'Camiseta Logo Conferência',
      price: 60,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80',
      category: 'camiseta',
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG'],
      inStock: true
    },
    {
      id: 'tshirt-2',
      name: 'Camiseta Borboleta',
      price: 60,
      image: 'https://images.unsplash.com/photo-1583744946564-b52d01a7f084?q=80',
      category: 'camiseta',
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG'],
      inStock: true
    },
    {
      id: 'tshirt-3',
      name: 'Camiseta Queren',
      price: 60,
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80',
      category: 'camiseta',
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XGG'],
      inStock: false
    },
    {
      id: 'dress-1',
      name: 'Vestido Elegance',
      price: 140,
      image: 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80',
      category: 'vestido',
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG'],
      inStock: true
    },
    {
      id: 'dress-2',
      name: 'Vestido Celebration',
      price: 140,
      image: 'https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80',
      category: 'vestido',
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG'],
      inStock: true
    },
    {
      id: 'dress-3',
      name: 'Vestido Butterfly',
      price: 140,
      image: 'https://images.unsplash.com/photo-1542295669297-4d352b042bca?q=80',
      category: 'vestido',
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EXGG'],
      inStock: true
    }
  ];

  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(product => product.category === (activeCategory === 'camisetas' ? 'camiseta' : 'vestido'));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Banner */}
      <section className="bg-butterfly-black text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Loja Oficial
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto">
            Produtos exclusivos da VII Conferência de Mulheres Queren Hapuque. 
            Encontre camisetas e vestidos em diversos tamanhos.
          </p>
        </div>
      </section>
      
      {/* Products Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList>
                <TabsTrigger 
                  value="all" 
                  onClick={() => setActiveCategory('all')}
                  className="px-6"
                >
                  Todos os Produtos
                </TabsTrigger>
                <TabsTrigger 
                  value="camisetas" 
                  onClick={() => setActiveCategory('camisetas')}
                  className="px-6"
                >
                  Camisetas
                </TabsTrigger>
                <TabsTrigger 
                  value="vestidos" 
                  onClick={() => setActiveCategory('vestidos')}
                  className="px-6"
                >
                  Vestidos
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="all" className="mt-0">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="camisetas" className="mt-0">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="vestidos" className="mt-0">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
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
                  <span>Frete grátis para compras acima de R$ 200,00</span>
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
                  <span>O frete de devolução é de responsabilidade do cliente</span>
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
      
      {/* CTA Section */}
      <section className="bg-butterfly-orange text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Não perca os produtos oficiais do evento!
          </h2>
          <p className="text-lg mb-8">
            Garanta já suas peças exclusivas e esteja preparada para a conferência.
          </p>
          <Button 
            variant="outline" 
            size="lg" 
            className="border-white text-white hover:bg-white/20"
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
