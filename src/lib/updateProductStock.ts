import { supabase } from './supabase';

export async function updateProductStock(productId: string, size: string, newQuantity: number) {
  const { data, error } = await supabase
    .from('product_stock')
    .update({ quantity: newQuantity })
    .match({ product_id: productId, size });

  if (error) {
    console.error('Erro ao atualizar estoque:', error.message);
    throw error;
  }

  return data;
} 