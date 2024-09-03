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
import { useParticipants } from "@/hooks/useParticipants";

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
  const { participants } = useParticipants();
  const [participantCount, setParticipantCount] = useState(1);
  const [paymentData, setPaymentData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [caravanParticipants, setCaravanParticipants] = useState([]);
  
  // Check if cart contains group/caravan tickets
  const hasCaravanTickets = items.some(item => 
    item.name.toLowerCase().includes('caravana') || 
    item.quantity >= 10
  );
  
  useEffect(() => {
    console.log("Checkout page loaded with cart items:", items);
    if (items.length === 0) {
      navigate('/carrinho');
      toast({
        title: "Carrinho vazio",
        description: "Adicione itens ao carrinho antes de prosseguir para o checkout.",
      });
    }
  }, [items, navigate, toast]);

  // Convert cart items to match the OrderSummary component's expected format
  const formattedCartItems = items.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    ...(isCartProduct(item) ? { 
      category: item.category as 'camiseta' | 'vestido' | undefined, 
      size: item.size 
    } : {})
  }));

  // Converter participantes do hook para o formato do formulário
  const getFormParticipants = () => {
    if (participants.length > 0) {
      return participants.map(participant => ({
        name: participant.name || "",
        cpf: participant.cpf || "",
        tshirt: participant.shirt_size || "",
        dress: participant.dress_size || ""
      }));
    }
    return [{ name: "", cpf: "", tshirt: "", dress: "" }];
  };

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
      participants: getFormParticipants(),
      terms: false,
    },
  });

  // Atualizar formulário quando participantes mudarem
  useEffect(() => {
    const formParticipants = getFormParticipants();
    form.setValue('participants', formParticipants);
    setParticipantCount(formParticipants.length);
  }, [participants, form]);

  // Escutar mudanças nos participantes via evento customizado
  useEffect(() => {
    const handleParticipantsUpdate = (event: CustomEvent) => {
      console.log('[DEBUG] Evento participantsUpdated recebido:', event.detail);
      const formParticipants = getFormParticipants();
      form.setValue('participants', formParticipants);
      setParticipantCount(formParticipants.length);
      console.log('[DEBUG] Formulário atualizado com novos participantes:', formParticipants);
    };

    window.addEventListener('participantsUpdated', handleParticipantsUpdate as EventListener);
    
    return () => {
      window.removeEventListener('participantsUpdated', handleParticipantsUpdate as EventListener);
    };
  }, [form]);

  // Validação de quantidade de participantes vs ingressos comprados
  useEffect(() => {
    const totalTickets = items.reduce((total, item) => {
      // Contar apenas ingressos (tickets), não produtos
      if (!isCartProduct(item)) {
        return total + item.quantity;
      }
      return total;
    }, 0);

    const participantsCount = participants.length;

    if (totalTickets > 0 && participantsCount !== totalTickets) {
      if (participantsCount < totalTickets) {
        const missing = totalTickets - participantsCount;
        toast({
          title: "Participantes insuficientes",
          description: `Você comprou ${totalTickets} ingresso(s) mas adicionou apenas ${participantsCount} participante(s). Falta${missing > 1 ? 'm' : ''} ${missing} participante(s).`,
          variant: "destructive"
        });
      } else if (participantsCount > totalTickets) {
        const excess = participantsCount - totalTickets;
        toast({
          title: "Participantes em excesso",
          description: `Você adicionou ${participantsCount} participante(s) mas comprou apenas ${totalTickets} ingresso(s). Você precisa comprar mais ${excess} ingresso(s) na aba de ingressos ou excluir ${excess} participante(s).`,
          variant: "destructive"
        });
      }
    }
  }, [participants.length, items, toast]);

  const onSubmit = async (data: FormValues) => {
    console.log("Form submitted with data:", data);
    console.log('Items being purchased:', items);
    
    setIsProcessingPayment(true);
    
    try {
      // Get current session (optional for guest checkout)
      const { data: session } = await supabase.auth.getSession();
      
      // Allow guest checkout - no authentication required
      console.log('Processing checkout for:', session.session ? 'authenticated user' : 'guest user');

      // Calcular total dos itens de teste
      const testTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Call Abacate Pay edge function
      const invokeHeaders = session.session ? {
        Authorization: `Bearer ${session.session.access_token}`
      } : {};
      
      const { data: paymentResponse, error } = await supabase.functions.invoke('abacatepay-manager', {
        headers: invokeHeaders,
        body: {
          orderData: data,
          total: items.length === 0 ? testTotal : total,
          items: items.map(item => ({
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
                    onParticipantCountChange={setParticipantCount}
                    ticketQuantity={ticketQuantity}
                    onTicketQuantityChange={setTicketQuantity}
                    maxTickets={5}
                    minTickets={1}
                    showCaravanButton={hasCaravanTickets}
                    onCaravanParticipantsSave={setCaravanParticipants}
                  />
                  <PaymentSection 
                    paymentData={paymentData}
                    isLoading={isProcessingPayment}
                    // Removed duplicate isLoading prop
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
