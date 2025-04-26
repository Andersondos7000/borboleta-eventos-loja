
import React, { useState } from 'react';
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
  const [participantCount, setParticipantCount] = useState(1);
  
  //Dados do carrinho fictícios - em uma aplicação real, viriam do estado global
  const cartItems = [
    { id: 1, name: "Ingresso Conferência", price: 83.00, quantity: 1 },
    { id: 2, name: "Camiseta Borboleta", price: 60.00, quantity: 1 },
  ];
  
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal;

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

  const onSubmit = (data: FormValues) => {
    console.log(data);
    toast({
      title: "Pedido realizado com sucesso!",
      description: "Você receberá um e-mail com as instruções para pagamento.",
    });
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
                  <PaymentSection />
                  <TermsSection form={form} total={total} />
                </form>
              </Form>
            </div>
            
            <OrderSummary 
              cartItems={cartItems}
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
