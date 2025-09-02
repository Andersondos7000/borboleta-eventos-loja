
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Calendar, Shirt, User } from 'lucide-react';
import ButterflyLogo from './ButterflyLogo';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import MobileMenu from './MobileMenu';


const Navbar: React.FC = () => {
  const { items } = useCart();
  const { user, signOut, isAdmin } = useAuth();
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await isAdmin();
        setUserIsAdmin(adminStatus);
      } else {
        setUserIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, isAdmin]);
  
  // Calculate total quantity by summing up all item quantities
  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);
  
  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-butterfly-orange/10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MobileMenu />
            <Link 
              to="/" 
              className="flex items-center space-x-2 text-butterfly-orange"
            >
              <ButterflyLogo className="w-8 h-8" />
              <span className="font-display text-xl font-bold">Borboleta Eventos</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <Link to="/" className="px-3 py-2 rounded-md text-base font-medium hover:bg-butterfly-orange/10 transition-colors">
              Home
            </Link>
            <Link to="/evento" className="px-3 py-2 rounded-md text-base font-medium hover:bg-butterfly-orange/10 transition-colors flex items-center">
              <Calendar className="mr-1 h-4 w-4" /> Evento
            </Link>
            <Link to="/loja" className="px-3 py-2 rounded-md text-base font-medium hover:bg-butterfly-orange/10 transition-colors flex items-center">
              <Shirt className="mr-1 h-4 w-4" /> Loja
            </Link>
            <Link to="/checkout" className="px-3 py-2 rounded-md text-base font-medium hover:bg-butterfly-orange/10 transition-colors">
              Checkout
            </Link>
            {userIsAdmin && (
              <Link to="/admin" className="px-3 py-2 rounded-md text-base font-medium hover:bg-butterfly-orange/10 transition-colors">
                Admin
              </Link>
            )}
            <Link to="/ingressos" className="px-3 py-2 rounded-md text-base font-medium hover:bg-butterfly-orange/10 transition-colors flex items-center">
              <Calendar className="mr-1 h-4 w-4" /> Ingressos
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Ícone de login para mobile */}
            {!user && (
              <Link 
                to="/auth" 
                className="md:hidden text-butterfly-orange hover:text-butterfly-orange/80 transition-colors"
                title="Entrar"
              >
                <User className="h-6 w-6" />
              </Link>
            )}

            <Link to="/carrinho" className="relative text-butterfly-orange hover:text-butterfly-orange/80 transition-colors" data-testid="cart-icon">
              <ShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-butterfly-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Link>
            
            {user ? (
              <Link 
                to="/perfil"
                className="hidden md:flex items-center space-x-2 text-butterfly-orange hover:text-butterfly-orange/80 transition-colors"
              >
                <User className="h-5 w-5" />
                <span className="font-medium">Perfil</span>
              </Link>
            ) : (
              <Button 
                variant="default" 
                className="hidden md:flex"
                onClick={() => window.location.href = '/auth'}
              >
                Entrar
              </Button>
            )}
            

          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
