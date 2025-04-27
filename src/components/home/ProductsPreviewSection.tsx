
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ProductsPreviewSection = () => {
  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl font-bold mb-2">Produtos Oficiais</h2>
          <p className="text-gray-600">Confira nossa coleção exclusiva para o evento</p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="rounded-lg overflow-hidden shadow-md border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="h-60 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1521572163474-6864f9cf177a?q=80" 
                alt="Camiseta do evento" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-6">
              <h3 className="font-medium text-xl mb-2">Camiseta Oficial</h3>
              <p className="text-gray-600 mb-4">Camisetas exclusivas em diversos tamanhos.</p>
              <div className="flex justify-between items-center">
                <span className="text-butterfly-orange font-bold text-xl">R$ 60,00</span>
                <Button asChild variant="outline" className="border-butterfly-orange text-butterfly-orange hover:bg-butterfly-orange/10">
                  <Link to="/loja">Ver Detalhes</Link>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg overflow-hidden shadow-md border border-gray-200 hover:shadow-xl transition-shadow">
            <div className="h-60 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1539008835657-9e8e9680c956?q=80" 
                alt="Vestido do evento" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-6">
              <h3 className="font-medium text-xl mb-2">Vestido Exclusivo</h3>
              <p className="text-gray-600 mb-4">Vestidos elegantes para ocasiões especiais.</p>
              <div className="flex justify-between items-center">
                <span className="text-butterfly-orange font-bold text-xl">R$ 140,00</span>
                <Button asChild variant="outline" className="border-butterfly-orange text-butterfly-orange hover:bg-butterfly-orange/10">
                  <Link to="/loja">Ver Detalhes</Link>
                </Button>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg overflow-hidden shadow-md border border-gray-200 hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-1">
            <div className="h-60 overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1607083206968-13611e3d76db?q=80" 
                alt="Loja completa" 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-6">
              <h3 className="font-medium text-xl mb-2">Visite Nossa Loja</h3>
              <p className="text-gray-600 mb-4">Confira todos os produtos disponíveis para o evento.</p>
              <Button asChild className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90">
                <Link to="/loja">Explorar Loja</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductsPreviewSection;
