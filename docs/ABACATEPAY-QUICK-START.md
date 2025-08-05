# 🚀 AbacatePay - Quick Start Guide

## ⚡ Instalação Rápida

### 1. Instalar Dependências

```bash
# NPM
npm install

# Yarn
yarn install

# PNPM
pnpm install
```

### 2. Configurar Token

```bash
# .env.local
VITE_ABACATE_PAY_TOKEN=seu_token_aqui
```

### 3. Implementar Pagamento

```typescript
import { useAbacatePayment } from './hooks/useAbacatePayment';

const Checkout = () => {
  const { createPixPayment, loading } = useAbacatePayment();

  const handlePayment = async () => {
    const payment = await createPixPayment({
      amount: 2500, // R$ 25,00
      description: "Ingresso VIP",
      externalId: "pedido-123",
      customer: {
        name: "João Silva",
        email: "joao@email.com"
      }
    });

    if (payment) {
      // Exibir QR Code
      console.log(payment.qrCode);
    }
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processando...' : 'Pagar com PIX'}
    </button>
  );
};
```

---

## 🎯 Exemplos Práticos

### Pagamento Simples

```typescript
// Criar pagamento PIX
const payment = await createPixPayment({
  amount: 1500,  // R$ 15,00
  description: "Ingresso Pista",
  externalId: `ticket-${Date.now()}`,
  customer: {
    name: customerName,
    email: customerEmail
  }
});
```

### Verificar Status

```typescript
// Verificar se foi pago
const status = await checkPaymentStatus(payment.id);

if (status?.status === 'APPROVED') {
  // Pagamento aprovado!
  console.log('Pagamento confirmado');
}
```

### Popup de Pagamento

```tsx
const PaymentModal = ({ amount, description }) => {
  const [pixData, setPixData] = useState(null);
  
  const handleCreatePix = async () => {
    const payment = await createPixPayment({
      amount,
      description,
      externalId: `order-${Date.now()}`,
      customer: customerData
    });
    
    setPixData(payment);
  };

  return (
    <div className="modal">
      {!pixData ? (
        <button onClick={handleCreatePix}>
          Gerar PIX
        </button>
      ) : (
        <div>
          <img src={pixData.qrCodeBase64} alt="QR Code" />
          <p>Ou copie o código:</p>
          <code>{pixData.qrCode}</code>
        </div>
      )}
    </div>
  );
};
```

---

## 🔧 Configuração Mínima

### config/abacatePay.ts

```typescript
export const ABACATE_PAY_CONFIG = {
  baseUrl: 'https://api.abacatepay.com/v1',
  token: import.meta.env.VITE_ABACATE_PAY_TOKEN,
  endpoints: {
    createPixQrCode: '/pixQrCode',
    checkPayment: '/pixQrCode/check'
  }
};

export const getAuthHeaders = () => ({
  'Authorization': `Bearer ${ABACATE_PAY_CONFIG.token}`,
  'Content-Type': 'application/json'
});
```

---

## 📱 Componente Completo

```tsx
import React, { useState, useEffect } from 'react';
import { useAbacatePayment } from '../hooks/useAbacatePayment';

interface PixPaymentProps {
  amount: number;
  description: string;
  customerData: {
    name: string;
    email: string;
  };
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const PixPayment: React.FC<PixPaymentProps> = ({
  amount,
  description,
  customerData,
  onSuccess,
  onError
}) => {
  const { createPixPayment, checkPaymentStatus, loading } = useAbacatePayment();
  const [pixData, setPixData] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleCreatePayment = async () => {
    try {
      const payment = await createPixPayment({
        amount,
        description,
        externalId: `order-${Date.now()}`,
        customer: customerData
      });

      if (payment) {
        setPixData(payment);
      } else {
        onError('Erro ao criar pagamento');
      }
    } catch (error) {
      onError('Erro inesperado');
    }
  };

  const handleCheckPayment = async () => {
    if (!pixData) return;

    setChecking(true);
    try {
      const result = await checkPaymentStatus(pixData.id);
      
      if (result?.status === 'APPROVED') {
        onSuccess();
      } else if (result?.status === 'REJECTED') {
        onError('Pagamento rejeitado');
      }
    } catch (error) {
      onError('Erro ao verificar pagamento');
    } finally {
      setChecking(false);
    }
  };

  const copyPixCode = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode);
      // Mostrar feedback visual
    }
  };

  if (!pixData) {
    return (
      <div className="pix-payment">
        <h3>Pagamento PIX</h3>
        <p>Valor: R$ {(amount / 100).toFixed(2)}</p>
        <p>{description}</p>
        
        <button 
          onClick={handleCreatePayment}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Gerando...' : 'Gerar PIX'}
        </button>
      </div>
    );
  }

  return (
    <div className="pix-payment">
      <h3>Escaneie o QR Code</h3>
      
      <div className="qr-container">
        <img 
          src={pixData.qrCodeBase64} 
          alt="QR Code PIX"
          className="qr-code"
        />
      </div>

      <div className="pix-code">
        <p>Ou copie o código PIX:</p>
        <div className="code-container">
          <code>{pixData.qrCode}</code>
          <button onClick={copyPixCode} className="btn-copy">
            📋 Copiar
          </button>
        </div>
      </div>

      <div className="payment-actions">
        <button 
          onClick={handleCheckPayment}
          disabled={checking}
          className="btn-check"
        >
          {checking ? 'Verificando...' : 'Já efetuei o pagamento'}
        </button>
      </div>

      <div className="payment-info">
        <p>Valor: R$ {(amount / 100).toFixed(2)}</p>
        <p>Expira em: {new Date(pixData.expiresAt).toLocaleString()}</p>
      </div>
    </div>
  );
};
```

---

## 🎨 Estilos CSS

```css
.pix-payment {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  text-align: center;
}

.qr-container {
  margin: 20px 0;
}

.qr-code {
  max-width: 200px;
  height: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

.code-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
}

.code-container code {
  flex: 1;
  background: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
}

.btn-primary, .btn-check, .btn-copy {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-check {
  background: #28a745;
  color: white;
  margin-top: 20px;
}

.btn-copy {
  background: #6c757d;
  color: white;
  font-size: 12px;
  padding: 5px 10px;
}

.payment-info {
  margin-top: 20px;
  font-size: 14px;
  color: #666;
}

@media (max-width: 480px) {
  .pix-payment {
    margin: 10px;
    padding: 15px;
  }
  
  .qr-code {
    max-width: 150px;
  }
  
  .code-container {
    flex-direction: column;
  }
}
```

---

## 🔍 Troubleshooting Rápido

### Erro: Token não configurado
```bash
# Verifique se o token está no .env
echo $VITE_ABACATE_PAY_TOKEN

# Se vazio, configure:
echo "VITE_ABACATE_PAY_TOKEN=seu_token" >> .env.local
```

### Erro de CORS
```typescript
// Adicione proxy no vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://api.abacatepay.com/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
```

### QR Code não aparece
```typescript
// Verifique se o base64 tem o prefixo correto
const qrCodeSrc = pixData.qrCodeBase64.startsWith('data:') 
  ? pixData.qrCodeBase64 
  : `data:image/png;base64,${pixData.qrCodeBase64}`;
```

---

## 📊 Monitoramento Simples

```typescript
// Log básico de pagamentos
const logPayment = (action: string, data: any) => {
  console.log(`[ABACATE] ${action}:`, {
    timestamp: new Date().toISOString(),
    ...data
  });
};

// Uso:
logPayment('PIX_CREATED', { amount, transactionId });
logPayment('PAYMENT_APPROVED', { transactionId });
```

---

## 🎯 Próximos Passos

1. **Implementar webhook** para confirmação automática
2. **Adicionar retry logic** para requests falhando
3. **Configurar ambiente de teste** separado
4. **Implementar cache** para melhor performance
5. **Adicionar métricas** de conversão

---

✅ **Pronto!** Sua integração AbacatePay está funcionando.

Para dúvidas: [Documentação Completa](./ABACATEPAY-SDK-ENHANCED.md)
