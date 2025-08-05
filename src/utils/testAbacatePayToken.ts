// Utilitário para testar se o token da API do Abacate Pay está configurado
import { ABACATE_PAY_CONFIG, getAuthHeaders } from '@/config/abacatePay';

export const testAbacatePayToken = () => {
  console.log('=== Teste do Token Abacate Pay ===');
  console.log('Token configurado:', ABACATE_PAY_CONFIG.token ? '✅ Sim' : '❌ Não');
  console.log('Token length:', ABACATE_PAY_CONFIG.token?.length || 0);
  console.log('Base URL:', ABACATE_PAY_CONFIG.baseUrl);
  
  try {
    const headers = getAuthHeaders();
    console.log('Headers gerados:', headers);
    console.log('=== Teste Concluído ===');
    return true;
  } catch (error) {
    console.error('❌ Erro ao gerar headers:', error);
    return false;
  }
};

// Função para testar a API do Abacate Pay
export const testAbacatePayAPI = async () => {
  try {
    const headers = getAuthHeaders();
    
    // Fazer uma requisição de teste (pode falhar se não houver token válido)
    const response = await fetch(`${ABACATE_PAY_CONFIG.baseUrl}/health`, {
      method: 'GET',
      headers: {
        'Authorization': headers.Authorization
      }
    });
    
    console.log('API Response Status:', response.status);
    
    if (response.status === 401) {
      console.error('❌ Token inválido ou não configurado');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao testar API:', error);
    return false;
  }
};
