
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Evento from "./pages/Evento";
import Loja from "./pages/Loja";
import Carrinho from "./pages/Carrinho";
import Checkout from "./pages/Checkout";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminTickets from "./pages/Admin/Tickets";
import AdminProdutos from "./pages/Admin/Produtos";
import AdminPedidos from "./pages/Admin/Pedidos";
import AdminEstoque from "./pages/Admin/Estoque";
import AdminDatabase from "./pages/Admin/AdminDatabase";
import NotFound from "./pages/NotFound";
import Ingressos from "./pages/Ingressos";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/Auth/Callback";
import Profile from "./pages/Profile";
import MCPDemo from "./pages/MCPDemo";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/evento" element={<Evento />} />
              <Route path="/loja" element={<Loja />} />
              <Route path="/carrinho" element={<Carrinho />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/termos" element={<Terms />} />
              <Route path="/privacidade" element={<Privacy />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/tickets" element={<AdminTickets />} />
              <Route path="/admin/produtos" element={<AdminProdutos />} />
              <Route path="/admin/pedidos" element={<AdminPedidos />} />
              <Route path="/admin/estoque" element={<AdminEstoque />} />
              <Route path="/admin/database" element={<AdminDatabase />} />
              <Route path="/ingressos" element={<Ingressos />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/mcp-demo" element={<MCPDemo />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
