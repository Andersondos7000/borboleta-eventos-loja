import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CustomerInformation from "@/components/checkout/CustomerInformation";
import AdditionalNotes from "@/components/checkout/AdditionalNotes";
import ParticipantsList from "@/components/checkout/ParticipantsList";
import OrderSummary from "@/components/checkout/OrderSummary";
import TermsSection from "@/components/checkout/TermsSection";

import { useCart } from "@/hooks/useCart";
import { isCartProduct } from "@/lib/cart-utils";
import { supabase } from "@/lib/supabase";

const formSchema = z.object({
  firstName: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  lastName: z.string().min(2, { message: "Sobrenome deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  personType: z.enum(["fisica", "juridica"]),
  cpf: z.string().min(11, { message: "CPF deve ter pelo menos 11 caracteres" }),
  country: z.string().min(2, { message: "País é obrigatório" }),
  zipCode: z.string().min(8, { message: "CEP deve ter pelo menos 8 caracteres" }),
  address: z.string().min(5, { message: "Endereço deve ter pelo menos 5 caracteres" }),
  number: z.string().min(1, { message: "Número é obrigatório" }),
  neighborhood: z.string().optional(),
  city: z.string().min(2, { message: "Cidade é obrigatória" }),
  state: z.string().min(2, { message: "Estado é obrigatório" }),
  phone: z.string().optional(),
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
  const { items, subtotal, total, clearCart } = useCart();
  const [participantCount, setParticipantCount] = useState(1);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderData, setOrderData] = useState<FormValues | null>(null);
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

  // Calcular subtotal e total baseado nos testItems quando carrinho vazio
  const calculatedSubtotal = items.length === 0 
    ? testItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) / 100 // Converter de centavos para reais
    : subtotal;
  
  const calculatedTotal = items.length === 0
    ? calculatedSubtotal // Para teste PIX, não há frete
    : total;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
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
      const orderTotal = items.length === 0 ? testTotal : total;

      // Criar pedido no Supabase
      const orderPayload = {
        user_id: session.session?.user?.id || null,
        payment_id: `temp_${Date.now()}`, // Temporary ID, will be updated after payment
        customer_data: {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          document: data.cpf,
          address: {
            street: data.address,
            number: data.number,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zip_code: data.zipCode,
            country: 'BR'
          }
        },
        items: testItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity
        })),
        total: Math.round(orderTotal * 100), // Converter para centavos
        payment_method: 'pix',
        payment_status: 'pending',
        shipping_address: {
          street: data.address,
          number: data.number,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          zip_code: data.zipCode,
          country: 'BR'
        },
        participants: data.participants || [],
        additional_notes: data.additionalNotes || ''
      };

      const { data: orderResponse, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderError) {
        throw orderError;
      }

      // Salvar dados do pedido para usar no checkout
      setOrderData(data);
      setOrderCreated(true);
      
      // Clear cart after successful order creation
      await clearCart();
      
      toast({
        title: "Pedido criado com sucesso!",
        description: "Agora você pode prosseguir com o pagamento PIX.",
      });
      
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

  const handleImportParticipants = (participants: Array<{name: string, cpf: string, tshirt: string, dress: string}>) => {
    const currentParticipants = form.getValues().participants || [];
    const newParticipants = [...currentParticipants, ...participants];
    form.setValue('participants', newParticipants);
    setParticipantCount(newParticipants.length);
    toast({
      title: "Participantes importados",
      description: `${participants.length} participante(s) foram adicionados com sucesso.`,
    });
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
                    onImportParticipants={handleImportParticipants}
                    onRemoveParticipant={removeParticipant}
                  />
                  {orderCreated && orderData ? (
                    <div className="bg-blue-50 p-6 rounded-lg text-center">
                      <p className="text-blue-600 font-medium">Pedido criado com sucesso!</p>
                      <p className="text-gray-600 mt-2">Sistema de pagamento será implementado em breve.</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <p className="text-gray-600">Complete os dados acima para prosseguir com o pagamento</p>
                    </div>
                  )}
                  <TermsSection 
                    form={form} 
                    total={calculatedTotal} 
                    isProcessing={isProcessingPayment}
                    onSubmit={onSubmit}
                    orderData={orderData ? {
                      customer: {
                        name: `${orderData.firstName} ${orderData.lastName}`,
                        email: orderData.email,
                        phone: orderData.phone,
                        document: orderData.cpf
                      },
                      amount: items.length === 0 ? testItems.reduce((sum, item) => sum + (item.price * item.quantity), 0) : calculatedTotal, // Valor já em reais
                      description: `Pedido - ${testItems.map(item => item.name).join(', ')}`,
                      items: testItems.map(item => ({
                        title: item.name,
                        quantity: item.quantity,
                        unit_price: item.price
                      }))
                    } : undefined}
                  />
                </form>
              </Form>
            </div>
            
            <OrderSummary 
              cartItems={formattedCartItems}
              subtotal={calculatedSubtotal}
              total={calculatedTotal}
            />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;