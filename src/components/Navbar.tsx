
import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import ButterflyLogo from './ButterflyLogo';
import { Button } from '@/components/ui/button';

const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-butterfly-orange"
          >
            <ButterflyLogo className="w-8 h-8" />
            <span className="font-display text-xl font-bold">Queren Hapuque</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-600 hover:text-butterfly-orange transition-colors">
              Home
            </Link>
            <Link to="/ingressos" className="text-gray-600 hover:text-butterfly-orange transition-colors">
              Ingressos
            </Link>
            <Link to="/evento" className="text-gray-600 hover:text-butterfly-orange transition-colors">
              Contato
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Link to="/carrinho" className="relative text-butterfly-orange hover:text-butterfly-orange/80 transition-colors">
                <ShoppingCart className="h-6 w-6" />
                <span className="absolute -top-2 -right-2 bg-butterfly-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  R$ 0,00
                </span>
              </Link>
            </div>
            <Button 
              variant="default" 
              className="bg-butterfly-orange hover:bg-butterfly-orange/90"
              onClick={() => window.location.href = '/ingressos'}
            >
              Área do cliente
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
