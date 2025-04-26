import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Calendar, Shirt } from 'lucide-react';
import ButterflyLogo from './ButterflyLogo';
import { Button } from '@/components/ui/button';

const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm border-b border-butterfly-orange/10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-butterfly-orange"
          >
            <ButterflyLogo className="w-8 h-8" />
            <span className="font-display text-xl font-bold">Borboleta Eventos</span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-butterfly-orange/10 transition-colors">
              Home
            </Link>
            <Link to="/evento" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-butterfly-orange/10 transition-colors flex items-center">
              <Calendar className="mr-1 h-4 w-4" /> Evento
            </Link>
            <Link to="/loja" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-butterfly-orange/10 transition-colors flex items-center">
              <Shirt className="mr-1 h-4 w-4" /> Loja
            </Link>
            <Link to="/checkout" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-butterfly-orange/10 transition-colors">
              Checkout
            </Link>
            <Link to="/admin" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-butterfly-orange/10 transition-colors">
              Admin
            </Link>
            <Link to="/ingressos" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-butterfly-orange/10 transition-colors flex items-center">
              <Calendar className="mr-1 h-4 w-4" /> Ingressos
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/carrinho" className="relative text-butterfly-orange hover:text-butterfly-orange/80 transition-colors">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute -top-2 -right-2 bg-butterfly-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </Link>
            <Button variant="default" className="hidden md:flex">
              Comprar Ingresso
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
