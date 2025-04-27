
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LocationMap from '@/components/LocationMap';

const EventInfoSection = () => {
  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-display text-3xl font-bold mb-4">Sobre o Evento</h2>
            <p className="text-gray-600 mb-6">
              A VII Conferência de Mulheres Queren Hapuque é um encontro especial projetado para transformar, 
              inspirar e capacitar mulheres de todas as idades. Uma experiência única de dois dias repletos de 
              palestras motivacionais, momentos de adoração e oportunidades de networking.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <span className="bg-butterfly-orange text-white p-2 rounded mr-3">
                  <Calendar className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-medium">Data e Horário</h3>
                  <p className="text-gray-600">12 e 13 de Abril de 2025, das 9h às 18h</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="bg-butterfly-orange text-white p-2 rounded mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-medium">Local</h3>
                  <p className="text-gray-600">Centro de Convenções ExpoCenter, São Paulo - SP</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="bg-butterfly-orange text-white p-2 rounded mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-medium">Ingressos</h3>
                  <p className="text-gray-600">R$ 83,00 por pessoa • 1300 lugares disponíveis</p>
                </div>
              </div>
            </div>
            
            <Button asChild className="mt-8 bg-butterfly-orange hover:bg-butterfly-orange/90">
              <Link to="/evento">Mais Informações</Link>
            </Button>
          </div>
          
          <div className="space-y-6">
            <div className="relative">
              <div className="aspect-w-4 aspect-h-3 rounded-lg overflow-hidden shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?q=80" 
                  alt="Mulheres celebrando juntas" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-butterfly-orange/20 rounded-full -z-10"></div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-butterfly-orange/20 rounded-full -z-10"></div>
            </div>
            
            <LocationMap />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventInfoSection;
