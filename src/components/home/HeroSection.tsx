
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section className="relative bg-white">
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <h1 className="font-display text-4xl md:text-6xl font-bold text-gray-900">
              Queren Hapuque, VII Conferência de Mulheres 2025
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600">
              Seja bem-vinda à nossa Conferência de Mulheres! Junte-se a nós para momentos únicos e repletos de empoderamento!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-butterfly-orange hover:bg-butterfly-orange/90">
                <Link to="/evento">
                  Explorar eventos Agora
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-butterfly-orange text-butterfly-orange hover:bg-butterfly-orange/10">
                <Link to="/ingressos">
                  Compre online
                </Link>
              </Button>
            </div>
            
            <div className="inline-block px-4 py-2 bg-white rounded-full shadow-sm border border-gray-200">
              <span className="text-gray-600">100% seguro</span>
            </div>
          </div>
          
          <div className="relative">
            <img 
              src="/lovable-uploads/02407974-bd63-45d0-a566-f66d92f28f8e.png"
              alt="Queren Hapuque VII Conferência de Mulheres" 
              className="w-full h-auto rounded-lg shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
