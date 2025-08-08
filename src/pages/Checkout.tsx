import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Form } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, total, subtotal, shipping, clearCart, isLoading: isCartLoading } = useCart();
  const [participantCount, setParticipantCount] = useState(1);
  const [pixData, setPixData] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [orderCreated, setOrderCreated] = useState(false);
  
  useEffect(() => {
    console.log("Checkout page loaded with cart items:", items);
    // Redirect to cart if the cart is empty
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
    setIsProcessingPayment(true);
    setPaymentError(null);

    const customerData = {
      name: `${data.firstName} ${data.lastName}`,
      email: 'customer-email@example.com', // TODO: Get email from auth or a form field
      phone: data.phone,
      cpf: data.cpf,
      id: 'temp-customer-id', // TODO: Get from auth or generate
    };

    const billingData = {
      address: `${data.address}, ${data.number}`,
      city: data.city,
      state: data.state,
      zip_code: data.zipCode,
      // Map other fields
    };

    try {
      const { data: orderResult, error } = await supabase.functions.invoke('create-order', {
        body: {
          amount: total * 100, // Ensure total is in cents
          customer: customerData,
          billing: billingData,
          items: cartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            type: isCartProduct(item) ? 'product' : 'ticket'
          }))
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Order and charge created:', orderResult);
      console.log('orderResult type:', typeof orderResult);
      console.log('orderResult keys:', orderResult ? Object.keys(orderResult) : 'null');
      console.log('orderResult.pixData:', orderResult?.pixData);
      
      // Armazenar dados do PIX para exibir o QR code
      if (orderResult && orderResult.pixData) {
        console.log('PIX data found:', orderResult.pixData);
        setPixData(orderResult.pixData);
        setOrderCreated(true);
        toast({
          title: "Pedido criado com sucesso!",
          description: "Escaneie o QR Code ou copie o código PIX para finalizar o pagamento.",
        });
      } else {
        console.error('PIX data not found. Full response:', JSON.stringify(orderResult, null, 2));
        throw new Error("Dados do PIX não encontrados na resposta");
      }

    } catch (err) {
      console.error('Error creating order:', err);
      setPaymentError(err.message || "Não foi possível processar seu pedido.");
      toast({
        title: "Erro ao criar pedido",
        description: err.message || "Não foi possível processar seu pedido.",
        variant: "destructive",
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
                  {isCartLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-12 w-12 animate-spin text-butterfly-orange" />
                    </div>
                  ) : total > 0 ? (
                    <PaymentSection 
                      pixData={pixData}
                      isLoading={isProcessingPayment}
                      error={paymentError}
                    />
                  ) : null}
                  <TermsSection form={form} total={total} />
                  
                  {orderCreated && pixData && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                          <h3 className="text-lg font-semibold text-green-600">
                            Pedido criado com sucesso!
                          </h3>
                          <p className="text-gray-600">
                            Após realizar o pagamento via PIX, seu pedido será processado automaticamente.
                          </p>
                          <Button 
                            type="button"
                            onClick={() => {
                              clearCart().then(() => {
                                navigate('/');
                              });
                            }}
                            className="w-full"
                          >
                            Voltar ao Início
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
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
