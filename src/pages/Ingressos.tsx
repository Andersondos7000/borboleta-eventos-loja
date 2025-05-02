
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

const Ingressos = () => {
  const [individualQuantity, setIndividualQuantity] = useState(1);
  const [groupQuantity, setGroupQuantity] = useState(10);
  const [activeTab, setActiveTab] = useState("individual");
  const [eventData, setEventData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const individualTicketPrice = 83.00;
  const groupTicketPrice = 75.00;

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        setEventData(data);
      } catch (error) {
        console.error('Error fetching event:', error);
        toast({
          title: "Erro ao carregar evento",
          description: "Não foi possível carregar os detalhes do evento.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvent();
  }, [toast]);

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
      if (!eventData) {
        toast({
          title: "Evento não encontrado",
          description: "Não foi possível adicionar o ingresso ao carrinho.",
          variant: "destructive"
        });
        return;
      }

      // If user is not logged in, redirect to auth page
      if (!user) {
        toast({
          title: "Login necessário",
          description: "Faça login para adicionar ingressos ao carrinho.",
          variant: "default"
        });
        navigate('/auth');
        return;
      }

      // Create a new ticket in the database
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          event_id: eventData.id,
          price: activeTab === "individual" ? individualTicketPrice : groupTicketPrice,
          status: 'reserved',
          user_id: user.id
        })
        .select('id')
        .single();

      if (ticketError) throw ticketError;

      // Add ticket to cart
      const cartTicket: CartTicket = {
        id: crypto.randomUUID(), // Temporary ID until added to cart
        name: eventData.name || "VII Conferência de Mulheres",
        price: activeTab === "individual" ? individualTicketPrice : groupTicketPrice,
        quantity: activeTab === "individual" ? individualQuantity : groupQuantity,
        ticketId: ticketData.id
      };

      await addToCart(cartTicket);
      navigate('/carrinho');
    } catch (error) {
      console.error('Error adding ticket to cart:', error);
      toast({
        title: "Erro ao adicionar ingresso",
        description: "Não foi possível adicionar o ingresso ao carrinho.",
        variant: "destructive"
      });
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
                    <div className="flex items-center gap-2">
                      <Calendar className="text-butterfly-orange h-5 w-5" />
                      <span>12 e 13 de Abril de 2025</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="text-butterfly-orange h-5 w-5" />
                      <span>Centro de Convenções ExpoCenter - São Paulo, SP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="text-butterfly-orange h-5 w-5" />
                      <span>1300 vagas disponíveis</span>
                    </div>
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
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="px-4 py-2">{individualQuantity}</span>
                            <button 
                              onClick={handleIndividualIncrement}
                              className="px-3 py-2 hover:bg-gray-100"
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
                        disabled={isLoading}
                      >
                        Adicionar ao Carrinho
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
