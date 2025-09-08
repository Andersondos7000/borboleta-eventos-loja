import { supabase } from './supabase';

// DEPRECATED: Função original que usava tabela 'product_sizes' inexistente
// export async function updateProductStock(productId: string, size: string, newQuantity: number) {
//   const { data, error } = await supabase
//     .from('product_sizes')
//     .update({ quantity: newQuantity })
//     .match({ product_id: productId, size });
// 
//   if (error) {
//     console.error('Erro ao atualizar estoque:', error.message);
//     throw error;
//   }
// 
//   return data;
// }

// NOVA IMPLEMENTAÇÃO: Atualiza apenas o status in_stock na tabela products
export async function updateProductStock(productId: string, size: string, newQuantity: number) {
  try {
    console.warn('DEPRECATED: updateProductStock - funcionalidade limitada sem tabela product_sizes');
    
    // Por enquanto, apenas atualiza o status in_stock baseado na quantidade
    const inStock = newQuantity > 0;
    
    const { data, error } = await supabase
      .from('products')
      .update({ in_stock: inStock })
      .eq('id', productId);

    if (error) {
      console.error('Erro ao atualizar status do produto:', error.message);
      throw error;
    }

    console.log(`Produto ${productId} atualizado: in_stock = ${inStock}`);
    return data;
  } catch (error) {
    console.error('Erro na função updateProductStock:', error);
    throw error;
  }
}