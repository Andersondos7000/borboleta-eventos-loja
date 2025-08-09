import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Minus, Plus, MapPin, Calendar, Users, Bus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartTicket } from '@/contexts/CartContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  price: number;
  available_tickets: number;
  image_url: string;
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
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .gte('available_tickets', 1)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true });

        if (error) {
          console.error('Error fetching events:', error);
          return;
        }

        console.log('Events fetched:', data);

        setEvents(data || []);
        if (data && data.length > 0) {
          setSelectedEvent(data[0]);
          console.log('Selected event set:', data[0]);
        } else {
          console.log('No events found or data is empty');
          // Create a mock event for testing and insert it into the database
          const mockEvent = {
            id: crypto.randomUUID(),
            name: 'Festival Borboleta 2024',
            description: 'Um evento incrível com música e arte',
            date: '2024-12-31T20:00:00Z',
            location: 'Centro de Convenções São Paulo',
            price: 85.00,
            available_tickets: 100,
            image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80'
          };
          
          // Insert mock event into database - TEMPORARILY DISABLED DUE TO RLS POLICY
          // const { error: insertError } = await supabase
          //   .from('events')
          //   .insert(mockEvent);
            
          // if (insertError) {
          //   console.error('Error inserting mock event:', insertError);
          // } else {
          //   console.log('Mock event inserted into database:', mockEvent);
          // }
          
          setEvents([mockEvent]);
          setSelectedEvent(mockEvent);
          console.log('Mock event created for testing:', mockEvent);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchEvents();
  }, []);

  const individualTicketPrice = selectedEvent?.price || 85.00;
  const groupTicketPrice = selectedEvent ? selectedEvent.price * 0.9 : 75.00;

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
      
      // Temporarily disabled auth check for testing
      // if (!user) {
      //   toast({
      //     title: "Login necessário",
      //     description: "Faça login para adicionar ingressos ao carrinho.",
      //     variant: "default"
      //   });
      //   navigate('/auth');
      //   return;
      // }

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
      const ticketName = selectedEvent.name;

      console.log('Ticket details:', { quantity, price, ticketName, selectedEventId: selectedEvent.id });

      // Create a new ticket with event reference - TEMPORARILY DISABLED DUE TO RLS POLICY
      console.log('Creating ticket in database... (DISABLED)');
      // const { data: ticketData, error: ticketError } = await supabase
      //   .from('tickets')
      //   .insert({
      //     event_id: selectedEvent.id,
      //     price: price,
      //     status: 'reserved',
      //     user_id: user?.id || null // Use null instead of 'anonymous-user'
      //   })
      //   .select('id')
      //   .single();

      // if (ticketError) {
      //   console.error('Error creating ticket:', ticketError);
      //   throw ticketError;
      // }

      // console.log('Ticket created successfully:', ticketData);
      
      // Mock ticket data for testing
      const ticketData = { id: crypto.randomUUID() };
      console.log('Mock ticket created:', ticketData);

      // Add ticket to cart
      const cartTicket: CartTicket = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Generate unique ID
        name: ticketName,
        price: price,
        quantity: quantity,
        ticketId: ticketData.id
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
                src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80" 
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
                           <span>{new Date(selectedEvent.date).toLocaleDateString('pt-BR')}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <MapPin className="text-butterfly-orange h-5 w-5" />
                           <span>{selectedEvent.location}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <Users className="text-butterfly-orange h-5 w-5" />
                           <span>{selectedEvent.available_tickets} vagas disponíveis</span>
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
