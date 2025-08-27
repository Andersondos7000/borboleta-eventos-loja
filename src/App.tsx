
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
import AdminUsuarios from "./pages/Admin/Usuarios";
import AdminLogin from "./pages/Admin/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Ingressos from "./pages/Ingressos";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/Auth/Callback";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import { CustomersPage } from "./pages/CustomersPage";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { RealtimeProvider } from "./contexts/RealtimeContext";

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
        <RealtimeProvider>
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
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/tickets" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminTickets />
                </ProtectedRoute>
              } />
              <Route path="/admin/produtos" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminProdutos />
                </ProtectedRoute>
              } />
              <Route path="/admin/pedidos" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminPedidos />
                </ProtectedRoute>
              } />
              <Route path="/admin/estoque" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminEstoque />
                </ProtectedRoute>
              } />
              <Route path="/admin/usuarios" element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminUsuarios />
                </ProtectedRoute>
              } />
              <Route path="/ingressos" element={<Ingressos />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/customers" element={
                <ProtectedRoute requireAdmin={true}>
                  <CustomersPage />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </CartProvider>
        </RealtimeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
