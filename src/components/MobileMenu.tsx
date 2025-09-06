
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Calendar, Shirt, ShoppingCart, Settings, LogIn, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';

const MobileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  const closeMenu = () => setIsOpen(false);

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

  const handleSignOut = async () => {
    await signOut();
    closeMenu();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-8 w-8" />
          <div className="sr-only">Abrir menu</div>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>
            Navegue pelas páginas do site e acesse sua conta
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col h-full">

          <Separator />
          
          <nav className="flex flex-col gap-1 py-4">
            <Link 
              to="/" 
              className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
              onClick={closeMenu}
            >
              <div>Home</div>
            </Link>
            <Link 
              to="/evento" 
              className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
              onClick={closeMenu}
            >
              <Calendar className="mr-2 h-5 w-5" />
              <div>Evento</div>
            </Link>
            <Link 
              to="/loja" 
              className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
              onClick={closeMenu}
            >
              <Shirt className="mr-2 h-5 w-5" />
              <div>Loja</div>
            </Link>
            <Link 
              to="/ingressos" 
              className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
              onClick={closeMenu}
            >
              <Calendar className="mr-2 h-5 w-5" />
              <div>Ingressos</div>
            </Link>
            <Link 
              to="/carrinho" 
              className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
              onClick={closeMenu}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              <div>Carrinho</div>
            </Link>
            <Link 
              to="/checkout" 
              className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
              onClick={closeMenu}
            >
              <div>Checkout</div>
            </Link>
            {userIsAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
                onClick={closeMenu}
              >
                <Settings className="mr-2 h-5 w-5" />
                <div>Admin</div>
              </Link>
            )}

            <Separator className="my-2" />
            
            {user ? (
              <>
                <Link 
                  to="/perfil" 
                  className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
                  onClick={closeMenu}
                >
                  <User className="mr-2 h-5 w-5" />
                  <div>Meu Perfil</div>
                </Link>
                <button 
                  className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors text-left w-full"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  <div>Sair</div>
                </button>
              </>
            ) : (
              <Link 
                to="/auth" 
                className="flex items-center px-4 py-3 hover:bg-butterfly-orange/10 rounded-md transition-colors"
                onClick={closeMenu}
              >
                <LogIn className="mr-2 h-5 w-5" />
                <div>Entrar / Cadastrar</div>
              </Link>
            )}
          </nav>

          <div className="mt-auto mb-4">
            <Button 
              className="w-full bg-butterfly-orange hover:bg-butterfly-orange/90"
              onClick={() => {
                closeMenu();
                window.location.href = '/ingressos';
              }}
            >
              Comprar Ingresso
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
