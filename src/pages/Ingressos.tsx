import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Minus, Plus, MapPin, Calendar, Users, Bus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { CartTicket } from '@/lib/cart-utils';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  venue_name: string;
  ticket_price: number;
  max_capacity: number;
  current_attendees: number;
  cover_image: string;
}

const Ingressos = () => {
  const [individualQuantity, setIndividualQuantity] = useState(1);
  const [groupQuantity, setGroupQuantity] = useState(10);
  const [activeTab, setActiveTab] = useState("individual");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const loadEvents = async () => {
      console.log('🎫 Carregando eventos...');
      
      try {
        setIsLoading(true);
        
        // Dados mock para demonstração enquanto resolvemos conectividade
        const mockEvents: Event[] = [
          {
            id: '1',
            title: 'Festival de Música Eletrônica',
            description: 'Uma noite inesquecível com os melhores DJs do cenário nacional e internacional.',
            start_date: '2024-02-15T20:00:00Z',
            venue_name: 'Arena Anhembi - São Paulo',
            ticket_price: 120.00,
            max_capacity: 5000,
            current_attendees: 3200,
            cover_image: '/placeholder.svg'
          },
          {
            id: '2',
            title: 'Show de Rock Nacional',
            description: 'As melhores bandas de rock do Brasil em um só lugar.',
            start_date: '2024-02-20T19:30:00Z',
            venue_name: 'Estádio do Morumbi - São Paulo',
            ticket_price: 85.00,
            max_capacity: 8000,
            current_attendees: 6500,
            cover_image: '/placeholder.svg'
          },
          {
            id: '3',
            title: 'Conferência de Tecnologia',
            description: 'Palestras sobre as últimas tendências em tecnologia e inovação.',
            start_date: '2024-02-25T09:00:00Z',
            venue_name: 'Centro de Convenções Frei Caneca - São Paulo',
            ticket_price: 200.00,
            max_capacity: 1500,
            current_attendees: 1200,
            cover_image: '/placeholder.svg'
          }
        ];
        
        setEvents(mockEvents);
        setSelectedEvent(mockEvents[1]); // Seleciona o segundo evento como padrão
        console.log('✅ Eventos carregados com sucesso:', mockEvents.length);
        
      } catch (error) {
        console.error('❌ Erro ao carregar eventos:', error);
        toast({
          title: "Erro ao carregar eventos",
          description: "Erro ao carregar eventos. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [toast]);

  const individualTicketPrice = selectedEvent?.ticket_price || 85.00;
  const groupTicketPrice = selectedEvent ? selectedEvent.ticket_price * 0.9 : 75.00;

  const handleIndividualIncrement = () => {
    if (individualQuantity < 5) setIndividualQuantity(individualQuantity + 1);
  };

  const handleIndividualDecrement = () => {
    if (individualQuantity > 1) setIndividualQuantity(individualQuantity - 1);
  };

  const handleGroupIncrement = () => {
    setGroupQuantity(groupQuantity + 1);
  };

  const handleGroupDecrement = () => {
    if (groupQuantity > 10) setGroupQuantity(groupQuantity - 1);
  };

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      
      console.log('Starting add to cart process');
      console.log('Selected event:', selectedEvent);
      console.log('User:', user);
      console.log('Active tab:', activeTab);
      
      // Allow guest users to add tickets to cart
      console.log('User authentication status:', user ? 'authenticated' : 'guest');

      if (!selectedEvent) {
        console.log('No selected event - showing error');
        toast({
          title: "Erro",
          description: "Nenhum evento selecionado.",
          variant: "destructive"
        });
        return;
      }

      const quantity = activeTab === "individual" ? individualQuantity : groupQuantity;
      const price = activeTab === "individual" ? individualTicketPrice : groupTicketPrice;
      const ticketName = selectedEvent.title;

      console.log('Ticket details:', { quantity, price, ticketName, selectedEventId: selectedEvent.id });

      // For authenticated users, get customer_id; for guests, use null
      let customerData = null;
      let ticketData = null;
      
      if (user) {
        console.log('Getting customer for authenticated user:', user.id);
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (customerError) {
          console.error('Error getting customer:', customerError);
          // For authenticated users without customer record, we'll still allow cart addition
          console.log('User authenticated but no customer record found, proceeding with cart addition');
        } else {
          customerData = customer;
          console.log('Customer found:', customerData);
        }

        // Create a new ticket with event reference for authenticated users
        console.log('Creating ticket in database for authenticated user...');
        const ticketNumber = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { data: ticket, error: ticketError } = await supabase
            .from('tickets')
            .insert({
              user_id: user.id,
              ticket_type: `Ingresso - ${ticketNumber}`,
              unit_price: price,
              total_price: price,
              quantity: 1,
              status: 'active',
              buyer_email: user.email
            })
            .select()
            .single();

        if (ticketError) {
          console.error('Error creating ticket:', ticketError);
          throw ticketError;
        }

        ticketData = ticket;
        console.log('Ticket created successfully:', ticketData);
      } else {
        console.log('Guest user - ticket will be created during checkout');
        // For guest users, we'll create a temporary ticket ID for cart purposes
        ticketData = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ticket_type: `Ingresso Temporário`,
          unit_price: price,
          total_price: price,
          quantity: 1,
          user_id: null,
          status: 'active',
          created_at: new Date().toISOString()
        };
      }

      // Add ticket to cart
      const cartTicket: CartTicket = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate unique ID
        ticket_id: ticketData.id,
        name: ticketData.ticket_type || selectedEvent.title,
        price: price,
        quantity: quantity,
        unit_price: price,
        total_price: price * quantity,
        ticket_type: 'individual',
        status: 'active'
      };

      console.log('Adding to cart:', cartTicket);
      await addToCart(cartTicket);
      
      console.log('Successfully added to cart');
      
      toast({
        title: "Ingresso adicionado!",
        description: `${quantity} ${quantity > 1 ? 'ingressos foram adicionados' : 'ingresso foi adicionado'} ao seu carrinho.`,
      });
      
      navigate('/carrinho');
    } catch (error) {
      console.error('Full error details:', error);
      console.error('Error stack:', error.stack);
      toast({
        title: "Erro ao adicionar ingresso",
        description: "Não foi possível adicionar o ingresso ao carrinho.",
        variant: "destructive"
      });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const calculateTotal = () => {
    return activeTab === "individual" 
      ? individualTicketPrice * individualQuantity 
      : groupTicketPrice * groupQuantity;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-butterfly-orange">Ingressos para o Evento</h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <img 
                src="/ingressos.webp" 
                alt="Layout do Ingresso"
                className="w-full rounded-lg shadow-lg mb-6"
              />
              
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-4">Detalhes do Evento</h2>
                   <div className="space-y-4">
                     {selectedEvent ? (
                       <>
                         <div className="flex items-center gap-2">
                           <Calendar className="text-butterfly-orange h-5 w-5" />
                           <span>{new Date(selectedEvent.start_date).toLocaleDateString('pt-BR')}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <MapPin className="text-butterfly-orange h-5 w-5" />
                           <span>{selectedEvent.venue_name}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <Users className="text-butterfly-orange h-5 w-5" />
                           <span>{(selectedEvent.max_capacity || 0) - (selectedEvent.current_attendees || 0)} vagas disponíveis</span>
                         </div>
                       </>
                     ) : (
                       <div className="text-center py-4 text-gray-500">
                         Carregando informações do evento...
                       </div>
                     )}
                   </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-xl font-semibold mb-6">Comprar Ingressos</h2>
                  
                  <Tabs defaultValue="individual" onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="individual" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Individual
                      </TabsTrigger>
                      <TabsTrigger value="group" className="flex items-center gap-2">
                        <Bus className="h-4 w-4" />
                        Caravana
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="individual" className="space-y-6">
                      <div>
                        <p className="text-gray-600 mb-2">Preço por ingresso</p>
                        <p className="text-2xl font-bold text-butterfly-orange">
                          R$ {individualTicketPrice.toFixed(2).replace('.', ',')}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Quantidade</label>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border rounded-md">
                            <button 
                              onClick={handleIndividualDecrement}
                              className="px-3 py-2 hover:bg-gray-100"
                              disabled={individualQuantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-4 py-2">{individualQuantity}</span>
                            <button 
                              onClick={handleIndividualIncrement}
                              className="px-3 py-2 hover:bg-gray-100"
                              disabled={individualQuantity >= 5}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="text-sm text-gray-500">
                            (Máximo 5 ingressos por compra)
                          </span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="group" className="space-y-6">
                      <div>
                        <p className="text-gray-600 mb-2">Preço por ingresso (caravana)</p>
                        <p className="text-2xl font-bold text-butterfly-orange">
                          R$ {groupTicketPrice.toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          Desconto de 10% por ingresso para caravanas!
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Quantidade</label>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border rounded-md">
                            <button 
                              onClick={handleGroupDecrement}
                              className="px-3 py-2 hover:bg-gray-100"
                              disabled={groupQuantity <= 10}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-4 py-2">{groupQuantity}</span>
                            <button 
                              onClick={handleGroupIncrement}
                              className="px-3 py-2 hover:bg-gray-100"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <span className="text-sm text-gray-500">
                            (Mínimo 10 ingressos)
                          </span>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between mb-4">
                        <span className="font-semibold">Total:</span>
                        <span className="text-xl font-bold text-butterfly-orange">
                          R$ {calculateTotal().toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <Button 
                        onClick={handleAddToCart}
                        className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90"
                        disabled={isLoading || isAddingToCart}
                      >
                        {isAddingToCart ? 'Adicionando...' : 'Adicionar ao Carrinho'}
                      </Button>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Ingressos;
