
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const CTASection = () => {
  return (
    <section className="bg-butterfly-orange text-white py-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
          Pronta para fazer parte dessa história?
        </h2>
        <p className="text-xl max-w-2xl mx-auto mb-8">
          Não perca a oportunidade de participar da VII Conferência de Mulheres Queren Hapuque. 
          Reserve seu lugar hoje mesmo!
        </p>
        <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
          <Link to="/evento">Garantir Meu Ingresso</Link>
        </Button>
      </div>
    </section>
  );
};

export default CTASection;
