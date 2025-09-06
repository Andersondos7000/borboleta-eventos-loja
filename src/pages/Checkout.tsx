import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';

const Checkout = () => {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (cart.items.length === 0) {
      navigate('/carrinho');
    }
  }, [cart, navigate]);

  const handleCheckout = async () => {
    setIsProcessing(true);
    
    try {
      // Simulação de processamento de pagamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Pedido realizado com sucesso!',
        description: 'Você receberá um email com os detalhes do seu pedido.',
      });
      
      clearCart();
      navigate('/ingressos');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao processar pagamento',
        description: 'Ocorreu um erro ao processar seu pagamento. Tente novamente.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateTotal = () => {
    return cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (cart.items.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Pagamento</CardTitle>
              <CardDescription>Preencha os dados para finalizar sua compra</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome no Cartão</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-md" 
                      placeholder="Nome como aparece no cartão"
                      value={user?.user_metadata?.full_name || ''}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número do Cartão</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-md" 
                      placeholder="**** **** **** ****"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mês de Expiração</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-md" 
                      placeholder="MM"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ano de Expiração</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-md" 
                      placeholder="AA"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">CVV</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded-md" 
                      placeholder="123"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.name} x {item.quantity}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                
                <Separator />
                
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processando...' : 'Finalizar Compra'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;