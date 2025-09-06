
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, ShoppingCart, Shirt, Database, ChartBar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import ButterflyLogo from './ButterflyLogo';

const AdminSidebar: React.FC = () => {
  const location = useLocation();
  
  const menuItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: <ChartBar className="h-5 w-5" />
    },
    {
      name: 'Vendas de Ingressos',
      href: '/admin/tickets',
      icon: <Calendar className="h-5 w-5" />
    },
    {
      name: 'Produtos',
      href: '/admin/produtos',
      icon: <Shirt className="h-5 w-5" />
    },
    {
      name: 'Pedidos',
      href: '/admin/pedidos',
      icon: <ShoppingCart className="h-5 w-5" />
    },
    {
      name: 'Estoque',
      href: '/admin/estoque',
      icon: <Database className="h-5 w-5" />
    },
    {
      name: 'Usuários',
      href: '/admin/usuarios',
      icon: <Users className="h-5 w-5" />
    }
  ];

  return (
    <div className="bg-butterfly-black min-h-screen w-64 text-white relative z-0">
      <div className="p-4 flex items-center space-x-2 border-b border-butterfly-orange/20">
        <ButterflyLogo className="w-8 h-8" />
        <div className="font-display text-xl font-bold text-butterfly-orange">Admin</div>
      </div>
      
      <nav className="mt-8 px-4">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                  location.pathname === item.href
                    ? "bg-butterfly-orange text-white"
                    : "hover:bg-white/10"
                )}
              >
                {item.icon}
                <div>{item.name}</div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="absolute bottom-4 left-4 right-4">
        <Link
          to="/"
          className="flex items-center space-x-2 px-4 py-2 text-sm rounded-lg hover:bg-white/10 transition-colors"
        >
          <div>← Voltar ao site</div>
        </Link>
      </div>
    </div>
  );
};

export default AdminSidebar;
