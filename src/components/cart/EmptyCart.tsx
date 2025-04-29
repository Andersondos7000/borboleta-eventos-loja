
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const EmptyCart: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
      <h2 className="text-xl font-medium mb-4">Seu carrinho está vazio</h2>
      <p className="text-gray-600 mb-6">
        Parece que você ainda não adicionou nenhum item ao seu carrinho.
      </p>
      <div className="flex flex-col md:flex-row justify-center gap-4">
        <Button asChild className="bg-butterfly-orange hover:bg-butterfly-orange/90">
          <Link to="/loja">Explorar Loja</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/evento">Ver Ingressos</Link>
        </Button>
      </div>
    </div>
  );
};

export default EmptyCart;
