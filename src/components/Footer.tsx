import React from 'react';
import { Link } from 'react-router-dom';
import ButterflyLogo from './ButterflyLogo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-butterfly-black text-white">
      <div className="container mx-auto px-6 py-12">
        {/* Layout Mobile - duas colunas */}
        <div className="block md:hidden">
          <div className="grid grid-cols-2 gap-6">
            {/* Coluna Esquerda - Mobile: Navegação */}
            <div className="space-y-4">
              <h3 className="text-butterfly-orange font-medium mb-4">Navegação</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/" className="hover:text-butterfly-orange transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/evento" className="hover:text-butterfly-orange transition-colors">
                    Evento
                  </Link>
                </li>
                <li>
                  <Link to="/loja" className="hover:text-butterfly-orange transition-colors">
                    Loja
                  </Link>
                </li>
                <li>
                  <Link to="/carrinho" className="hover:text-butterfly-orange transition-colors">
                    Carrinho
                  </Link>
                </li>
              </ul>
            </div>

            {/* Coluna Direita - Mobile: Contato */}
            <div className="space-y-4">
              <h3 className="text-butterfly-orange font-medium mb-4">Contato</h3>
              <ul className="space-y-2 text-sm">
                <li>contato@borboletaeventos.com.br</li>
                <li>(00) 12345-6789</li>
                <li>São Paulo, SP - Brasil</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Layout Desktop - quatro colunas */}
        <div className="hidden md:grid md:grid-cols-4 gap-8">
          {/* Logo */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <ButterflyLogo className="w-8 h-8" />
              <span className="font-display text-xl font-bold text-butterfly-orange">Borboleta Eventos</span>
            </div>
            <p className="text-sm text-gray-300">
              Realizando sonhos e transformando eventos em momentos inesquecíveis.
            </p>
          </div>

          {/* Navegação */}
          <div className="space-y-4">
            <h3 className="text-butterfly-orange font-medium mb-4">Navegação</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-butterfly-orange transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/evento" className="hover:text-butterfly-orange transition-colors">
                  Evento
                </Link>
              </li>
              <li>
                <Link to="/loja" className="hover:text-butterfly-orange transition-colors">
                  Loja
                </Link>
              </li>
              <li>
                <Link to="/carrinho" className="hover:text-butterfly-orange transition-colors">
                  Carrinho
                </Link>
              </li>
            </ul>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-butterfly-orange font-medium mb-4">Contato</h3>
            <ul className="space-y-2 text-sm">
              <li>contato@borboletaeventos.com.br</li>
              <li>(00) 12345-6789</li>
              <li>São Paulo, SP - Brasil</li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div className="space-y-4">
            <h3 className="text-butterfly-orange font-medium mb-4">Redes Sociais</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-white hover:text-butterfly-orange transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                </svg>
              </a>
              <a href="#" className="text-white hover:text-butterfly-orange transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="#" className="text-white hover:text-butterfly-orange transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        {/* Logo e Redes Sociais para Mobile */}
        <div className="block md:hidden mt-8 pt-8 border-t border-gray-800">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <ButterflyLogo className="w-8 h-8" />
              <span className="font-display text-xl font-bold text-butterfly-orange">Borboleta Eventos</span>
            </div>
            <p className="text-sm text-gray-300">
              Realizando sonhos e transformando eventos em momentos inesquecíveis.
            </p>
            <div className="flex justify-center space-x-4">
              <a href="#" className="text-white hover:text-butterfly-orange transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                </svg>
              </a>
              <a href="#" className="text-white hover:text-butterfly-orange transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" className="text-white hover:text-butterfly-orange transition-colors">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center text-gray-400">
          <p>© {new Date().getFullYear()} Borboleta Eventos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
