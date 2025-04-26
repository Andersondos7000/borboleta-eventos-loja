
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Shirt, ArrowDown } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EventCountdown from '@/components/EventCountdown';
import ButterflyLogo from '@/components/ButterflyLogo';

const Index = () => {
  // Data do evento: 12 de Abril de 2025
  const eventDate = new Date('2025-04-12T09:00:00');

  // Data de início das vendas: 4 de Janeiro de 2025
  const salesStartDate = new Date('2025-01-04T00:00:00');
  
  // Verifica se as vendas de ingressos já começaram
  const ticketSalesStarted = new Date() >= salesStartDate;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-butterfly-black to-butterfly-black/90 text-white">
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505236858219-8359eb29e329?q=80')] bg-center bg-no-repeat bg-cover"></div>
        </div>
        
        <div className="container mx-auto px-4 py-24 md:py-32 relative z-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <ButterflyLogo className="w-20 h-20 mb-6 animate-butterfly-fly" />
            
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
              VII Conferência de Mulheres<br />
              <span className="text-butterfly-orange">Queren Hapuque</span>
            </h1>
            
            <p className="text-lg md:text-xl mb-8">
              Dias 12 e 13 de Abril de 2025 • Uma jornada de transformação e renovo
            </p>
            
            <div className="flex flex-col md:flex-row gap-4 mb-12">
              <Button asChild size="lg" className="bg-butterfly-orange hover:bg-butterfly-orange/90">
                <Link to="/evento">
                  <Calendar className="mr-2 h-5 w-5" /> Sobre o Evento
                </Link>
              </Button>
              
              <Button asChild size="lg" variant="outline" className="text-butterfly-orange border-butterfly-orange hover:bg-butterfly-orange/10">
                <Link to="/loja">
                  <Shirt className="mr-2 h-5 w-5" /> Loja Oficial
                </Link>
              </Button>
            </div>
            
            <ArrowDown className="animate-bounce text-butterfly-orange h-8 w-8" />
          </div>
        </div>
      </section>
      
      {/* Countdown Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold mb-2">Contagem Regressiva</h2>
            <p className="text-gray-600">O evento começa em:</p>
          </div>
          
          <EventCountdown targetDate={eventDate} className="mb-10" />
          
          <div className="text-center mt-8">
            {ticketSalesStarted ? (
              <Button asChild size="lg" className="bg-butterfly-orange hover:bg-butterfly-orange/90">
                <Link to="/evento">Garanta seu Ingresso Agora!</Link>
              </Button>
            ) : (
              <div>
                <p className="text-xl font-medium mb-3">As vendas começam em:</p>
                <EventCountdown targetDate={salesStartDate} />
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* Event Info Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
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
          </div>
        </div>
      </section>
      
      {/* Products Preview Section */}
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
                  src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80" 
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
      
      {/* CTA Section */}
      <section className="bg-butterfly-orange text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">Pronta para fazer parte dessa história?</h2>
          <p className="text-xl max-w-2xl mx-auto mb-8">
            Não perca a oportunidade de participar da VII Conferência de Mulheres Queren Hapuque. 
            Reserve seu lugar hoje mesmo!
          </p>
          <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/20">
            <Link to="/evento">Garantir Meu Ingresso</Link>
          </Button>
        </div>
      </section>
      
      <Footer />
    </div>
  );
};

export default Index;
