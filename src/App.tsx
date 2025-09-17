
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

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
import { ProfilesPage } from "./pages/ProfilesPage";
import AdminSidebarDemo from "./pages/AdminSidebarDemo";
import { CartProvider } from "./contexts/CartContext";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { RealtimeProvider } from "./contexts/RealtimeContext";
import ErrorHandler from "./components/ErrorHandler";
import { useAuthErrorHandler } from "./hooks/useAuthErrorHandler";
import AuthErrorNotification from "./components/AuthErrorNotification";

// Importar utilitários de teste em desenvolvimento
if (import.meta.env.DEV) {
  import('./utils/authTestUtils');
}



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Componente interno que usa o hook de tratamento de erros
const AppContent = () => {
  // Inicializar o tratamento de erros de autenticação
  const { authError, clearAuthError } = useAuthErrorHandler();
  
  return (
    <BrowserRouter>
      <ErrorHandler />
      <AuthErrorNotification 
        error={authError} 
        onDismiss={clearAuthError} 
      />
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
              <Route path="/user" element={<Navigate to="/perfil" replace />} />
              <Route path="/customers" element={
                <ProtectedRoute requireAdmin={true}>
                  <ProfilesPage />
                </ProtectedRoute>
              } />
              <Route path="/admin-sidebar-demo" element={<AdminSidebarDemo />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AdminAuthProvider>
          <RealtimeProvider>
            <CartProvider>
              <Toaster />
              <Sonner />
              <AppContent />
            </CartProvider>
          </RealtimeProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
