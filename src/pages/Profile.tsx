
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, User, Package, Ticket } from "lucide-react";

// Profile form schema
const profileSchema = z.object({
  username: z.string().min(3, { message: "Nome de usuário deve ter pelo menos 3 caracteres" }),
  avatar_url: z.string().url({ message: "URL inválida" }).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileData = {
  id: string;
  username: string;
  avatar_url: string | null;
  updated_at: string;
  created_at: string;
};

interface DatabaseOrder {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface DatabaseTicket {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
  status: string;
  events?: {
    name: string;
    date?: string;
    location?: string;
  };
}

interface SupabaseError {
  message: string;
}

const Profile = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [orders, setOrders] = useState<DatabaseOrder[]>([]);
  const [tickets, setTickets] = useState<DatabaseTicket[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      avatar_url: "",
    },
  });

  // Load user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setProfile(data);
          profileForm.reset({
            username: data.username || "",
            avatar_url: data.avatar_url || "",
          });
        }
      } catch (error: unknown) {
        const err = error as SupabaseError;
        toast({
          title: "Erro ao carregar perfil",
          description: err.message || "Tente novamente mais tarde",
          variant: "destructive",
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, toast, profileForm]);

  // Load user orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          setOrders(data);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoadingOrders(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Load user tickets
  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select("*, events(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (data) {
          setTickets(data);
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoadingTickets(false);
      }
    };
    if (user) {
      fetchTickets();
      // --- SUPABASE REALTIME ---
      const ticketsChannel = supabase.channel('realtime-profile-tickets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `user_id=eq.${user.id}` }, () => {
          fetchTickets();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(ticketsChannel);
      };
    }
  }, [user]);

  // Handle profile update
  const onSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: values.username,
          avatar_url: values.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      
      // Refresh profile data
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
        
      if (data) {
        setProfile(data);
      }
    } catch (error: unknown) {
      const err = error as SupabaseError;
      toast({
        title: "Erro ao atualizar perfil",
        description: err.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-butterfly-orange" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="container py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-butterfly-orange">Meu Perfil</h1>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Informações</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span>Meus Pedidos</span>
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                <span>Meus Ingressos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                  <CardDescription>
                    Atualize suas informações de perfil aqui.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingProfile ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-butterfly-orange" />
                    </div>
                  ) : (
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={profileForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome de usuário</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu nome de usuário" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="avatar_url"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL da foto de perfil</FormLabel>
                              <FormControl>
                                <Input placeholder="https://exemplo.com/sua-foto.jpg" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div>
                          <Button 
                            type="submit" 
                            className="bg-butterfly-orange hover:bg-butterfly-orange/90"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              "Salvar alterações"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Email: {user.email}</p>
                    <p className="text-sm text-gray-500">
                      Conta criada em: {profile?.created_at ? new Date(profile.created_at).toLocaleString() : "Carregando..."}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => signOut()}>
                    Sair
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Pedidos</CardTitle>
                  <CardDescription>
                    Veja o histórico de seus pedidos realizados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingOrders ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-butterfly-orange" />
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order: DatabaseOrder) => (
                        <Card key={order.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">Pedido #{order.id.substring(0, 8)}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(order.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="font-bold text-butterfly-orange">
                                  {order.amount.toLocaleString('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL' 
                                  })}
                                </p>
                                <p className="text-sm text-right capitalize">{order.status}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <h3 className="text-lg font-medium">Nenhum pedido encontrado</h3>
                      <p className="text-gray-500 mt-1">
                        Você ainda não realizou nenhum pedido.
                      </p>
                      <Button 
                        className="mt-4 bg-butterfly-orange hover:bg-butterfly-orange/90" 
                        onClick={() => navigate("/loja")}
                      >
                        Ir para a loja
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tickets">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Ingressos</CardTitle>
                  <CardDescription>
                    Veja seus ingressos para eventos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingTickets ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-6 w-6 animate-spin text-butterfly-orange" />
                    </div>
                  ) : tickets.length > 0 ? (
                    <div className="space-y-4">
                      {tickets.map((ticket: DatabaseTicket) => (
                        <Card key={ticket.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">
                                  {ticket.events?.name || "Evento"}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {ticket.events?.date
                                    ? new Date(ticket.events.date).toLocaleString()
                                    : "Data não disponível"}
                                </p>
                              </div>
                              <div>
                                <p className="font-bold text-butterfly-orange capitalize">
                                  {ticket.status}
                                </p>
                                <p className="text-sm text-right">
                                  {ticket.events?.location || "Local a confirmar"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Ticket className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <h3 className="text-lg font-medium">Nenhum ingresso encontrado</h3>
                      <p className="text-gray-500 mt-1">
                        Você ainda não adquiriu nenhum ingresso.
                      </p>
                      <Button 
                        className="mt-4 bg-butterfly-orange hover:bg-butterfly-orange/90" 
                        onClick={() => navigate("/ingressos")}
                      >
                        Ver Ingressos disponíveis
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
