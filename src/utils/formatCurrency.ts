
export const formatCurrency = (value: number) => {
  if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
  
  // Ensure value is treated as a number and rounded to 2 decimal places
  const numValue = Number(value.toFixed(2));
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numValue);
};
