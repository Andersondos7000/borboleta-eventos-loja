
import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/home/HeroSection';
import CountdownSection from '@/components/home/CountdownSection';
import EventInfoSection from '@/components/home/EventInfoSection';
import ProductsPreviewSection from '@/components/home/ProductsPreviewSection';
import CTASection from '@/components/home/CTASection';

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
      <HeroSection />
      <CountdownSection 
        eventDate={eventDate}
        salesStartDate={salesStartDate}
        ticketSalesStarted={ticketSalesStarted}
      />
      <EventInfoSection />
      <ProductsPreviewSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
