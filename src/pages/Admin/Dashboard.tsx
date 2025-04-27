import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { download } from 'lucide-react';

const AdminDashboard = () => {
  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    // Here you would implement the actual export logic
    console.log(`Exporting in ${format} format`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard Administrativo</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                <download className="mr-2 h-4 w-4" />
                Exportar Relatório
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Exportar como Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Exportar como PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Exportar como CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Estatísticas de Vendas</h2>
            <p className="text-gray-600">Total de vendas: R$ 12.500,00</p>
            <p className="text-gray-600">Número de pedidos: 150</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Controle de Ingressos</h2>
            <p className="text-gray-600">Ingressos vendidos: 850</p>
            <p className="text-gray-600">Ingressos restantes: 450</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Produtos em Destaque</h2>
            <p className="text-gray-600">Camiseta Logo Conferência: 250 vendas</p>
            <p className="text-gray-600">Vestido Elegance: 180 vendas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
