
import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from 'react-router-dom';
import { ArrowRight, Copy, Info, LifeBuoy, Lock, ShieldCheck, ShoppingCart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ui/use-toast";

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
  const [couponCode, setCouponCode] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  
  // Dados do carrinho fictícios - em uma aplicação real, viriam do estado global
  const cartItems = [
    { id: 1, name: "Ingresso Conferência", price: 83.00, quantity: 1 },
    { id: 2, name: "Camiseta Borboleta", price: 60.00, quantity: 1 },
  ];
  
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal; // Aqui poderia incluir cálculos de desconto, frete, etc

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

  const applyCoupon = () => {
    if (couponCode.trim()) {
      toast({
        title: "Cupom aplicado!",
        description: "Desconto aplicado ao seu pedido.",
      });
    }
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
            {/* Formulário Principal - 2/3 da largura em desktop */}
            <div className="lg:col-span-2 space-y-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {/* Seção de Informações do Cliente */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Info className="h-5 w-5 text-butterfly-orange" />
                        Informações do Cliente
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome*</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite seu nome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sobrenome*</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite seu sobrenome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="personType"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Tipo de Pessoa*</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex flex-row space-x-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="fisica" id="fisica" />
                                    <Label htmlFor="fisica">Pessoa Física</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="juridica" id="juridica" />
                                    <Label htmlFor="juridica">Pessoa Jurídica</Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cpf"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF/CNPJ*</FormLabel>
                              <FormControl>
                                <Input placeholder="000.000.000-00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>País*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um país" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Brasil">Brasil</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP*</FormLabel>
                              <FormControl>
                                <Input placeholder="00000-000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Endereço*</FormLabel>
                                <FormControl>
                                  <Input placeholder="Rua, Avenida, etc." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número*</FormLabel>
                              <FormControl>
                                <Input placeholder="123" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <FormField
                          control={form.control}
                          name="neighborhood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro (opcional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu bairro" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade*</FormLabel>
                              <FormControl>
                                <Input placeholder="Sua cidade" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado*</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="UF" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="AC">AC</SelectItem>
                                  <SelectItem value="AL">AL</SelectItem>
                                  <SelectItem value="AP">AP</SelectItem>
                                  <SelectItem value="AM">AM</SelectItem>
                                  <SelectItem value="BA">BA</SelectItem>
                                  <SelectItem value="CE">CE</SelectItem>
                                  <SelectItem value="DF">DF</SelectItem>
                                  <SelectItem value="ES">ES</SelectItem>
                                  <SelectItem value="GO">GO</SelectItem>
                                  <SelectItem value="MA">MA</SelectItem>
                                  <SelectItem value="MT">MT</SelectItem>
                                  <SelectItem value="MS">MS</SelectItem>
                                  <SelectItem value="MG">MG</SelectItem>
                                  <SelectItem value="PA">PA</SelectItem>
                                  <SelectItem value="PB">PB</SelectItem>
                                  <SelectItem value="PR">PR</SelectItem>
                                  <SelectItem value="PE">PE</SelectItem>
                                  <SelectItem value="PI">PI</SelectItem>
                                  <SelectItem value="RJ">RJ</SelectItem>
                                  <SelectItem value="RN">RN</SelectItem>
                                  <SelectItem value="RS">RS</SelectItem>
                                  <SelectItem value="RO">RO</SelectItem>
                                  <SelectItem value="RR">RR</SelectItem>
                                  <SelectItem value="SC">SC</SelectItem>
                                  <SelectItem value="SP">SP</SelectItem>
                                  <SelectItem value="SE">SE</SelectItem>
                                  <SelectItem value="TO">TO</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Celular*</FormLabel>
                              <FormControl>
                                <Input placeholder="(00) 00000-0000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Seção de Informações Adicionais */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4">Informação Adicional</h2>

                      <FormField
                        control={form.control}
                        name="additionalNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas do Pedido (opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Informações adicionais sobre seu pedido, perguntas ou comentários especiais..."
                                className="min-h-[100px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Seção de Participantes */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                          <Info className="h-5 w-5 text-butterfly-orange" />
                          Participantes
                        </h2>
                        <Button type="button" variant="outline" onClick={addParticipant}>
                          Adicionar Participante
                        </Button>
                      </div>

                      {Array.from({ length: participantCount }).map((_, index) => (
                        <div key={index} className="border p-4 rounded-md mb-4">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-medium">Participante {index + 1}</h3>
                            {index > 0 && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => removeParticipant(index)}
                                className="h-8 text-red-500 hover:text-red-700"
                              >
                                Remover
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`participants.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nome do Participante (opcional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Nome do participante" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`participants.${index}.cpf`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>CPF do Participante (opcional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="000.000.000-00" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`participants.${index}.tshirt`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Camiseta (T-shirt)</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tamanho" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="">Nenhuma</SelectItem>
                                      <SelectItem value="PP">PP</SelectItem>
                                      <SelectItem value="P">P</SelectItem>
                                      <SelectItem value="M">M</SelectItem>
                                      <SelectItem value="G">G</SelectItem>
                                      <SelectItem value="GG">GG</SelectItem>
                                      <SelectItem value="EXGG">EXGG</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`participants.${index}.dress`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Vestido</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tamanho" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="">Nenhum</SelectItem>
                                      <SelectItem value="0">0</SelectItem>
                                      <SelectItem value="2">2</SelectItem>
                                      <SelectItem value="4">4</SelectItem>
                                      <SelectItem value="6">6</SelectItem>
                                      <SelectItem value="8">8</SelectItem>
                                      <SelectItem value="10">10</SelectItem>
                                      <SelectItem value="12">12</SelectItem>
                                      <SelectItem value="14">14</SelectItem>
                                      <SelectItem value="16">16</SelectItem>
                                      <SelectItem value="18">18</SelectItem>
                                      <SelectItem value="GG">GG</SelectItem>
                                      <SelectItem value="EXGG">EXGG</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Seção de Pagamento */}
                  <Card>
                    <CardContent className="pt-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Lock className="h-5 w-5 text-butterfly-orange" />
                        Método de Pagamento
                      </h2>
                      
                      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-md p-5 mb-4">
                        <div className="flex items-center mb-4">
                          <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2">
                            <span className="font-bold">1</span>
                          </div>
                          <p className="font-medium">Abra o aplicativo do seu banco</p>
                        </div>
                        
                        <div className="flex items-center mb-4">
                          <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2">
                            <span className="font-bold">2</span>
                          </div>
                          <p className="font-medium">Escaneie o QR Code ou copie o código abaixo</p>
                        </div>
                        
                        <div className="flex items-center mb-4">
                          <div className="bg-butterfly-orange rounded-full p-2 text-white mr-2">
                            <span className="font-bold">3</span>
                          </div>
                          <p className="font-medium">Confirme o pagamento no seu app</p>
                        </div>
                        
                        <div className="mt-6 flex flex-col items-center">
                          <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                            <span className="text-gray-500">QR Code do PIX</span>
                          </div>
                          
                          <div className="flex items-center w-full max-w-md">
                            <Input 
                              value="00020126330014BR.GOV.BCB.PIX01112345678901520400005303986540105XXXXX"
                              className="text-xs"
                              readOnly
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="ml-2" 
                              onClick={() => {
                                navigator.clipboard.writeText("00020126330014BR.GOV.BCB.PIX01112345678901520400005303986540105XXXXX");
                                toast({ title: "Código PIX copiado!" });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Termos e Condições */}
                  <Card>
                    <CardContent className="pt-6">
                      <FormField
                        control={form.control}
                        name="terms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Eu li e concordo com os <Link to="#" className="text-butterfly-orange hover:underline">Termos de Serviço</Link> e <Link to="#" className="text-butterfly-orange hover:underline">Política de Privacidade</Link>
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <div className="mt-6">
                        <Button
                          type="submit"
                          className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90 text-white py-3 text-lg"
                        >
                          Fazer Pedido R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </form>
              </Form>
            </div>

            {/* Resumo do Pedido - 1/3 da largura em desktop */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-butterfly-orange" />
                      Resumo do Pedido
                    </h2>

                    {/* Itens do carrinho */}
                    <div className="space-y-3 mb-4">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span className="text-gray-600">
                            {item.name} x{item.quantity}
                          </span>
                          <span className="font-medium">
                            {(item.price * item.quantity).toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    {/* Cupom de desconto */}
                    <div className="flex space-x-2 mb-4">
                      <Input
                        placeholder="Cupom de desconto"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        onClick={applyCoupon}
                        variant="outline"
                      >
                        Aplicar
                      </Button>
                    </div>

                    {/* Total */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{subtotal.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-butterfly-orange">{total.toLocaleString('pt-BR', { 
                          style: 'currency', 
                          currency: 'BRL' 
                        })}</span>
                      </div>
                    </div>

                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <ShieldCheck className="h-5 w-5 text-butterfly-orange" />
                        <span className="font-medium">Garantia de devolução 100%</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Caso não fique satisfeito com sua compra, garantimos reembolso total dentro de 7 dias após o evento.
                      </p>
                    </div>

                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <LifeBuoy className="h-5 w-5 text-butterfly-orange" />
                        <span className="font-medium">Suporte 24/7</span>
                      </div>
                      <div className="flex items-center mt-3">
                        <div className="w-12 h-12 rounded-full bg-gray-200 mr-3"></div>
                        <div>
                          <p className="font-medium">Mariana Silva</p>
                          <p className="text-sm text-gray-600">Consultora de Atendimento</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center mt-4">
                      <Lock className="h-4 w-4 text-gray-500 mr-1" />
                      <span className="text-xs text-gray-500">Pagamento seguro com criptografia SSL</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;
