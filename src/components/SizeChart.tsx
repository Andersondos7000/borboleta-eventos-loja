
import React from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SizeChartProps {
  type: 'camiseta' | 'vestido';
}

const SizeChart: React.FC<SizeChartProps> = ({ type }) => {
  const sizeData = {
    camiseta: {
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
      bust: ['82-86', '86-90', '90-94', '94-102', '102-110', '110-118', '118-129'],
      waist: ['63-67', '67-71', '71-75', '75-83', '83-91', '91-99', '99-110'],
      hips: ['88-92', '92-96', '96-100', '100-108', '108-116', '116-124', '124-135'],
    },
    vestido: {
      sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
      bust: ['82-86', '86-90', '90-94', '94-102', '102-110', '110-118', '118-129'],
      waist: ['63-67', '67-71', '71-75', '75-83', '83-91', '91-99', '99-110'],
      hips: ['88-92', '92-96', '96-100', '100-108', '108-116', '116-124', '124-135'],
    }
  };

  const data = sizeData[type];
  const title = type === 'camiseta' ? 'Tabela de Medidas - Camisetas' : 'Tabela de Medidas - Vestidos';

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableCaption>{title}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Tamanho</TableHead>
            <TableHead>Busto (cm)</TableHead>
            <TableHead>Cintura (cm)</TableHead>
            <TableHead>Quadril (cm)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.sizes.map((size, index) => (
            <TableRow key={size}>
              <TableCell className="font-medium">{size}</TableCell>
              <TableCell>{data.bust[index]}</TableCell>
              <TableCell>{data.waist[index]}</TableCell>
              <TableCell>{data.hips[index]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 text-sm text-gray-500">
        <p>* As medidas podem variar em 1-2 cm devido ao processo de fabricação.</p>
        <p>* Para dúvidas sobre tamanhos, entre em contato com o nosso suporte.</p>
      </div>
    </div>
  );
};

export default SizeChart;
