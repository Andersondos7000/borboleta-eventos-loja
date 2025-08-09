// Script para testar se o QR Code está sendo retornado pela API
const testQRCodeGeneration = async () => {
  try {
    console.log('🔍 Testando geração de QR Code...');
    
    // Simular dados de teste
    const testData = {
      orderData: {
        firstName: 'João',
        lastName: 'Silva',
        personType: 'fisica',
        cpf: '11144477735',
        country: 'Brasil',
        zipCode: '01310-100',
        address: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        phone: '11999887766',
        email: 'joao.silva@email.com',
        terms: true
      },
      total: 2500, // R$ 25,00
      items: [{
        name: 'Ingresso Teste',
        price: 2500,
        quantity: 1
      }]
    };

    console.log('📤 Enviando requisição para Edge Function...');
    
    const response = await fetch('https://pxcvoiffnandpdyotped.supabase.co/functions/v1/create-abacate-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3ZvaWZmbmFuZHBkeW90cGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4ODE3MTIsImV4cCI6MjA2MTQ1NzcxMn0.nP5x007Tb89eGe4wpZFdayQ_gQ_mQzDeW_NKf4ugHM8'
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Status da resposta:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', errorText);
      return;
    }

    const data = await response.json();
    console.log('📋 Resposta completa:', JSON.stringify(data, null, 2));
    
    // Verificar estrutura dos dados
    console.log('\n🔍 ANÁLISE DOS DADOS:');
    console.log('✅ success:', data.success);
    console.log('✅ orderId:', data.orderId);
    console.log('✅ paymentData existe:', !!data.paymentData);
    
    if (data.paymentData) {
      console.log('✅ paymentData.id:', data.paymentData.id);
      console.log('✅ paymentData.brCode:', !!data.paymentData.brCode);
      console.log('✅ paymentData.brCodeBase64:', !!data.paymentData.brCodeBase64);
      
      if (data.paymentData.brCodeBase64) {
        console.log('🎯 brCodeBase64 length:', data.paymentData.brCodeBase64.length);
        console.log('🎯 brCodeBase64 preview:', data.paymentData.brCodeBase64.substring(0, 50) + '...');
      } else {
        console.log('❌ brCodeBase64 não encontrado!');
      }
      
      if (data.paymentData.brCode) {
        console.log('🎯 brCode length:', data.paymentData.brCode.length);
        console.log('🎯 brCode preview:', data.paymentData.brCode.substring(0, 50) + '...');
      } else {
        console.log('❌ brCode não encontrado!');
      }
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
};

// Executar o teste
testQRCodeGeneration();