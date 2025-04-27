
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EventCountdown from '@/components/EventCountdown';

interface CountdownSectionProps {
  eventDate: Date;
  salesStartDate: Date;
  ticketSalesStarted: boolean;
}

const CountdownSection: React.FC<CountdownSectionProps> = ({ 
  eventDate, 
  salesStartDate, 
  ticketSalesStarted 
}) => {
  return (
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
  );
};

export default CountdownSection;
