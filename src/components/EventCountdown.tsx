
import React, { useState, useEffect } from 'react';

interface CountdownProps {
  className?: string;
}

// Data do evento: 12 e 13 de abril de 2026
const EVENT_START_DATE = new Date('2026-04-12T09:00:00');
const EVENT_END_DATE = new Date('2026-04-13T18:00:00');

const EventCountdown: React.FC<CountdownProps> = ({ className = "" }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [eventStatus, setEventStatus] = useState<'upcoming' | 'ongoing' | 'ended'>('upcoming');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentTime = +now;
      const startTime = +EVENT_START_DATE;
      const endTime = +EVENT_END_DATE;
      
      if (currentTime < startTime) {
        // Evento ainda não começou
        setEventStatus('upcoming');
        const difference = startTime - currentTime;
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else if (currentTime >= startTime && currentTime <= endTime) {
        // Evento em andamento
        setEventStatus('ongoing');
        const difference = endTime - currentTime;
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        // Evento já terminou
        setEventStatus('ended');
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []); // Sem dependências pois as datas são constantes

  const getStatusMessage = () => {
    switch (eventStatus) {
      case 'upcoming':
        return 'Faltam para o evento:';
      case 'ongoing':
        return 'Evento em andamento! Termina em:';
      case 'ended':
        return 'Evento finalizado!';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (eventStatus) {
      case 'upcoming':
        return 'bg-butterfly-orange';
      case 'ongoing':
        return 'bg-green-500';
      case 'ended':
        return 'bg-gray-500';
      default:
        return 'bg-butterfly-orange';
    }
  };

  return (
    <div className={`text-center ${className}`}>

      <p className={`text-sm md:text-base font-medium mt-2 mb-6 ${
        eventStatus === 'ended' ? 'text-gray-500' : 
        eventStatus === 'ongoing' ? 'text-green-600' : 'text-butterfly-orange'
      }`}>
        {getStatusMessage()}
      </p>
      
      {eventStatus !== 'ended' && (
         <div className="flex flex-wrap justify-center gap-6">
           <div className="flex flex-col items-center">
             <div className={`${getStatusColor()} text-white text-3xl md:text-5xl font-bold rounded-lg w-20 md:w-32 h-20 md:h-32 flex items-center justify-center`}>
               {timeLeft.days}
             </div>
             <span className="mt-3 text-sm md:text-base font-medium">Dias</span>
           </div>
           
           <div className="flex flex-col items-center">
             <div className={`${getStatusColor()} text-white text-3xl md:text-5xl font-bold rounded-lg w-20 md:w-32 h-20 md:h-32 flex items-center justify-center`}>
               {timeLeft.hours}
             </div>
             <span className="mt-3 text-sm md:text-base font-medium">Horas</span>
           </div>
           
           <div className="flex flex-col items-center">
             <div className={`${getStatusColor()} text-white text-3xl md:text-5xl font-bold rounded-lg w-20 md:w-32 h-20 md:h-32 flex items-center justify-center`}>
               {timeLeft.minutes}
             </div>
             <span className="mt-3 text-sm md:text-base font-medium">Minutos</span>
           </div>
           
           <div className="flex flex-col items-center">
             <div className={`${getStatusColor()} text-white text-3xl md:text-5xl font-bold rounded-lg w-20 md:w-32 h-20 md:h-32 flex items-center justify-center`}>
               {timeLeft.seconds}
             </div>
             <span className="mt-3 text-sm md:text-base font-medium">Segundos</span>
           </div>
         </div>
       )}
       
       {eventStatus === 'ended' && (
         <div className="text-center py-8">
           <div className="text-6xl mb-4">🎉</div>
           <p className="text-lg text-gray-600">Obrigado por participar!</p>
         </div>
       )}
     </div>
   );
 };
 
 export default EventCountdown;
