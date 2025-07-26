// Configuração da API do Abacate Pay
export const ABACATE_PAY_CONFIG = {
  baseUrl: 'https://api.abacatepay.com/v1',
  // Token obtido das variáveis de ambiente
  token: import.meta.env.VITE_ABACATE_PAY_TOKEN || '',
  endpoints: {
    createPixQrCode: '/pixQrCode',
    checkPayment: '/pixQrCode/check'
  }
};

// Função para obter headers de autenticação
export const getAuthHeaders = () => {
  const token = ABACATE_PAY_CONFIG.token;
  
  if (!token) {
    throw new Error('Token da API do Abacate Pay não configurado. Configure a variável VITE_ABACATE_PAY_TOKEN');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};
