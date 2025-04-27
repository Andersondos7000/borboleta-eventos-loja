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
import NotFound from "./pages/NotFound";
import Ingressos from "./pages/Ingressos";

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
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/evento" element={<Evento />} />
          <Route path="/loja" element={<Loja />} />
          <Route path="/carrinho" element={<Carrinho />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/tickets" element={<AdminTickets />} />
          <Route path="/admin/produtos" element={<AdminProdutos />} />
          <Route path="/admin/pedidos" element={<AdminPedidos />} />
          <Route path="/admin/estoque" element={<AdminEstoque />} />
          <Route path="/ingressos" element={<Ingressos />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
