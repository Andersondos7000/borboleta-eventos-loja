
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Minus, Plus, MapPin, Calendar, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent } from "@/components/ui/card";

const Ingressos = () => {
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  const ticketPrice = 83.00;

  const handleIncrement = () => {
    if (quantity < 5) setQuantity(quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleAddToCart = () => {
    navigate('/carrinho');
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
                  <div className="space-y-6">
                    <div>
                      <p className="text-gray-600 mb-2">Preço por ingresso</p>
                      <p className="text-2xl font-bold text-butterfly-orange">
                        R$ {ticketPrice.toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Quantidade</label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center border rounded-md">
                          <button 
                            onClick={handleDecrement}
                            className="px-3 py-2 hover:bg-gray-100"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="px-4 py-2">{quantity}</span>
                          <button 
                            onClick={handleIncrement}
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

                    <div className="border-t pt-4">
                      <div className="flex justify-between mb-4">
                        <span className="font-semibold">Total:</span>
                        <span className="text-xl font-bold text-butterfly-orange">
                          R$ {(ticketPrice * quantity).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      <Button 
                        onClick={handleAddToCart}
                        className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90"
                      >
                        Adicionar ao Carrinho
                      </Button>
                    </div>
                  </div>
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
