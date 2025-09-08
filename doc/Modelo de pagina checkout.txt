import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CustomerInformation from "@/components/checkout/CustomerInformation";
import AdditionalNotes from "@/components/checkout/AdditionalNotes";
import ParticipantsList from "@/components/checkout/ParticipantsList";
import PaymentSection from "@/components/checkout/PaymentSection";
import OrderSummary from "@/components/checkout/OrderSummary";
import TermsSection from "@/components/checkout/TermsSection";
import { useCart, isCartProduct } from "@/contexts/CartContext";
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
  firstName: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  lastName: z.string().min(2, { message: "Sobrenome deve ter pelo menos 2 caracteres" }),
  personType: z.enum(["fisica", "juridica"]),
  cpf: z.string().min(11, { message: "CPF deve ter pelo menos 11 caracteres" }),
  country: z.string().min(2, { message: "País é obrigatório" }),
  zipCode: z.string().min(8, { message: "CEP deve ter pelo menos 8 caracteres" }),
  address: z.string().min(5, { message: "Endereço deve ter pelo menos 5 caracteres" }),
  number: z.string().min(1, { message: "Número é obrigatório" }),
  neighborhood: z.string().optional(),
  city: z.string().min(2, { message: "Cidade é obrigatória" }),
  state: z.string().min(2, { message: "Estado é obrigatório" }),
  phone: z.string().min(10, { message: "Celular deve ter pelo menos 10 caracteres" }),
  additionalNotes: z.string().optional(),
  participants: z.array(
    z.object({
      name: z.string().optional(),
      cpf: z.string().optional(),
      tshirt: z.string().optional(),
      dress: z.string().optional(),
    })
  ),
  terms: z.boolean().refine(val => val === true, { message: "Você deve aceitar os termos" }),
});

type FormValues = z.infer<typeof formSchema>;

const Checkout = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { items, subtotal, shipping, total, clearCart } = useCart();
  const [participantCount, setParticipantCount] = useState(1);
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  useEffect(() => {
    console.log("Checkout page loaded with cart items:", items);
    // Para teste: permitir checkout mesmo com carrinho vazio
    // if (items.length === 0) {
    //   navigate('/carrinho');
    //   toast({
    //     title: "Carrinho vazio",
    //     description: "Adicione itens ao carrinho antes de prosseguir para o checkout.",
    //   });
    // }
  }, [items, navigate, toast]);

  // Convert cart items to match the OrderSummary component's expected format
  // Para teste: adicionar item fictício se carrinho vazio
  const testItems = items.length === 0 ? [{
    id: 'test-ticket-pix',
    name: 'Ingresso Teste PIX',
    price: 8500, // R$ 85,00 em centavos
    quantity: 1,
    type: 'ticket'
  }] : items;
  
  const formattedCartItems = testItems.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    ...(isCartProduct(item) ? { category: item.category, size: item.size } : {})
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      personType: "fisica",
      cpf: "",
      country: "Brasil",
      zipCode: "",
      address: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      phone: "",
      additionalNotes: "",
      participants: Array(1).fill({ name: "", cpf: "", tshirt: "", dress: "" }),
      terms: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    console.log("Form submitted with data:", data);
    console.log('Items being purchased:', testItems);
    
    setIsProcessingPayment(true);
    
    try {
      // Get current session
      const { data: session } = await supabase.auth.getSession();
      
      // BYPASS TEMPORÁRIO PARA TESTE PIX
      const isTestUser = data.firstName === 'João Silva' && data.lastName === 'Santos';
      
      if (!session.session && !isTestUser) {
        toast({
          title: "Erro de autenticação",
          description: "Você precisa estar logado para finalizar o pedido.",
          variant: "destructive"
        });
        return;
      }

      // Calcular total dos itens de teste
      const testTotal = testItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Call Abacate Pay edge function
      const invokeHeaders = session.session ? {
        Authorization: `Bearer ${session.session.access_token}`
      } : {};
      
      const { data: paymentResponse, error } = await supabase.functions.invoke('abacatepay-manager', {
        headers: invokeHeaders,
        body: {
          orderData: data,
          total: items.length === 0 ? testTotal : total,
          items: testItems.map(item => ({
            productId: isCartProduct(item) ? item.productId : null,
            ticketId: !isCartProduct(item) ? item.ticketId : null,
            price: item.price,
            quantity: item.quantity,
            size: isCartProduct(item) ? item.size : null,
            name: item.name
          })),
          isTestUser: isTestUser
        }
      });

      if (error) {
        throw error;
      }

      if (paymentResponse.success) {
        setPaymentData(paymentResponse.paymentData);
        
        // Clear cart after successful order creation
        await clearCart();
        
        toast({
          title: "Pedido criado com sucesso!",
          description: "Escaneie o QR Code ou copie o código PIX para pagar.",
        });
      } else {
        throw new Error(paymentResponse.error || 'Erro ao processar pagamento');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Erro ao processar pedido",
        description: "Tente novamente em alguns minutos.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const addParticipant = () => {
    setParticipantCount(prev => prev + 1);
    const currentParticipants = form.getValues().participants || [];
    form.setValue('participants', [...currentParticipants, { name: "", cpf: "", tshirt: "", dress: "" }]);
  };

  const removeParticipant = (index: number) => {
    if (participantCount <= 1) return;
    setParticipantCount(prev => prev - 1);
    const currentParticipants = form.getValues().participants || [];
    currentParticipants.splice(index, 1);
    form.setValue('participants', [...currentParticipants]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-butterfly-orange mb-2">
              Ordem de Pagamento
            </h1>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Chegamos até aqui, vamos concluir o cadastro referente ao seu pedido, vamos.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <CustomerInformation form={form} />
                  <AdditionalNotes form={form} />
                  <ParticipantsList 
                    form={form}
                    participantCount={participantCount}
                    onAddParticipant={addParticipant}
                    onRemoveParticipant={removeParticipant}
                  />
                  <PaymentSection 
                    paymentData={paymentData}
                    isLoading={isProcessingPayment}
                    isProcessing={isProcessingPayment}
                  />
                  <TermsSection 
                    form={form} 
                    total={total} 
                    isProcessing={isProcessingPayment}
                  />
                </form>
              </Form>
            </div>
            
            <OrderSummary 
              cartItems={formattedCartItems}
              subtotal={subtotal}
              total={total}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;
