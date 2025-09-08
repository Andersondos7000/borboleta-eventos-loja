# Guia de Integração - AbacatePay

Este guia fornece instruções detalhadas para integrar o AbacatePay em seu projeto.

## 📋 Pré-requisitos

- Node.js 18+
- React 18+
- TypeScript
- Supabase configurado
- Conta AbacatePay ativa

## 🚀 Setup Inicial

### 1. Configuração do Supabase

#### Tabelas Necessárias

Crie as seguintes tabelas no seu banco Supabase:

```sql
-- Tabela de pagamentos
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pix_code TEXT,
  pix_qr_code TEXT,
  external_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_external_id ON payments(external_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- RLS (Row Level Security)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update payments" ON payments
  FOR UPDATE USING (auth.role() = 'service_role');
```

#### Função para Atualizar Timestamps

```sql
-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para a tabela payments
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Deploy da Função Supabase

#### Estrutura da Função

Crie o arquivo `supabase/functions/abacatepay-manager/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PaymentRequest {
  action: 'create_payment' | 'get_payment' | 'update_payment';
  amount?: number;
  description?: string;
  customerEmail?: string;
  paymentId?: string;
  status?: string;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const body: PaymentRequest = await req.json();
    const { action } = body;

    switch (action) {
      case 'create_payment':
        return await createPayment(supabase, user.id, body);
      case 'get_payment':
        return await getPayment(supabase, user.id, body.paymentId!);
      case 'update_payment':
        return await updatePayment(supabase, body.paymentId!, body.status!);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function createPayment(supabase: any, userId: string, data: PaymentRequest) {
  const { amount, description, customerEmail } = data;

  // Validações
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }
  if (!description || description.trim().length === 0) {
    throw new Error('Description is required');
  }
  if (!customerEmail || !isValidEmail(customerEmail)) {
    throw new Error('Valid email is required');
  }

  // Criar pagamento no AbacatePay
  const abacatePayResponse = await fetch('https://api.abacatepay.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('ABACATEPAY_API_KEY')}`,
    },
    body: JSON.stringify({
      amount,
      description,
      customer: {
        email: customerEmail,
      },
      payment_method: 'pix',
      expires_in: 1800, // 30 minutos
    }),
  });

  if (!abacatePayResponse.ok) {
    const errorData = await abacatePayResponse.json();
    throw new Error(`AbacatePay API error: ${errorData.message}`);
  }

  const abacatePayData = await abacatePayResponse.json();

  // Salvar no banco
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      amount,
      description,
      customer_email: customerEmail,
      status: 'pending',
      pix_code: abacatePayData.pix_code,
      pix_qr_code: abacatePayData.pix_qr_code,
      external_id: abacatePayData.id,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, data: payment }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

async function getPayment(supabase: any, userId: string, paymentId: string) {
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`Payment not found: ${error.message}`);
  }

  // Verificar status no AbacatePay se ainda estiver pendente
  if (payment.status === 'pending' && payment.external_id) {
    const abacatePayResponse = await fetch(
      `https://api.abacatepay.com/v1/payments/${payment.external_id}`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('ABACATEPAY_API_KEY')}`,
        },
      }
    );

    if (abacatePayResponse.ok) {
      const abacatePayData = await abacatePayResponse.json();
      
      if (abacatePayData.status !== payment.status) {
        // Atualizar status no banco
        const { data: updatedPayment } = await supabase
          .from('payments')
          .update({ status: abacatePayData.status })
          .eq('id', paymentId)
          .select()
          .single();
        
        return new Response(
          JSON.stringify({ success: true, data: updatedPayment }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, data: payment }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

async function updatePayment(supabase: any, paymentId: string, status: string) {
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ status })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Update failed: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true, data: payment }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

#### Deploy da Função

```bash
# Deploy da função
supabase functions deploy abacatepay-manager

# Configurar secrets
supabase secrets set ABACATEPAY_API_KEY=your_api_key_here

# Verificar logs
supabase functions logs abacatepay-manager
```

### 3. Configuração do Frontend

#### Variáveis de Ambiente

Crie/atualize o arquivo `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# AbacatePay (apenas para referência, a chave real fica no Supabase)
ABACATEPAY_API_URL=https://api.abacatepay.com
```

#### Configuração do Supabase Client

Crie/atualize `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      payments: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          description: string;
          customer_email: string;
          status: 'pending' | 'paid' | 'cancelled' | 'expired';
          pix_code: string | null;
          pix_qr_code: string | null;
          external_id: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          description: string;
          customer_email: string;
          status?: 'pending' | 'paid' | 'cancelled' | 'expired';
          pix_code?: string | null;
          pix_qr_code?: string | null;
          external_id?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          description?: string;
          customer_email?: string;
          status?: 'pending' | 'paid' | 'cancelled' | 'expired';
          pix_code?: string | null;
          pix_qr_code?: string | null;
          external_id?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
```

## 🔧 Implementação

### 1. Importar Componentes

```typescript
// Em qualquer componente
import { AbacatePayButton, PaymentStatus } from '@/components/abacatepay';
import { useAbacatePayment, usePaymentStatus } from '@/hooks/abacatepay';
```

### 2. Exemplo de Integração Completa

```tsx
// pages/checkout.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { AbacatePayButton } from '@/components/abacatepay';
import { useAuth } from '@/hooks/useAuth';

interface CheckoutProps {
  cartItems: CartItem[];
  total: number;
}

export default function CheckoutPage({ cartItems, total }: CheckoutProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentSuccess = (paymentData: any) => {
    // Salvar pedido no banco
    savePurchaseOrder({
      userId: user.id,
      paymentId: paymentData.id,
      items: cartItems,
      total,
    });

    // Redirecionar para página de pagamento
    router.push(`/payment/${paymentData.id}`);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    setIsProcessing(false);
    // Mostrar toast de erro
  };

  if (!user) {
    return <div>Por favor, faça login para continuar.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Finalizar Compra</h1>
      
      {/* Resumo do pedido */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="font-semibold mb-4">Resumo do Pedido</h2>
        {cartItems.map(item => (
          <div key={item.id} className="flex justify-between py-2">
            <span>{item.name} x{item.quantity}</span>
            <span>R$ {((item.price * item.quantity) / 100).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>R$ {(total / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Botão de pagamento */}
      <AbacatePayButton
        amount={total}
        description={`Pedido com ${cartItems.length} itens`}
        customerEmail={user.email}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        disabled={isProcessing}
        className="w-full"
      />
    </div>
  );
}
```

```tsx
// pages/payment/[id].tsx
import { useRouter } from 'next/router';
import { PaymentStatus } from '@/components/abacatepay';

export default function PaymentPage() {
  const router = useRouter();
  const { id: paymentId } = router.query;

  const handleStatusChange = (status: string, paymentData: any) => {
    switch (status) {
      case 'paid':
        // Pagamento confirmado
        router.push('/success');
        break;
      case 'expired':
      case 'cancelled':
        // Pagamento falhou
        router.push('/checkout?error=payment_failed');
        break;
    }
  };

  if (!paymentId || typeof paymentId !== 'string') {
    return <div>Pagamento não encontrado</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Pagamento</h1>
      
      <PaymentStatus
        paymentId={paymentId}
        onStatusChange={handleStatusChange}
        className="w-full"
      />
      
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>Mantenha esta página aberta até a confirmação do pagamento.</p>
      </div>
    </div>
  );
}
```

## 🧪 Testes

### Configuração do Jest

Atualize `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/components/abacatepay/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    './src/hooks/abacatepay/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
```

### Executar Testes

```bash
# Todos os testes
npm test

# Apenas AbacatePay
npm test abacatepay

# Com coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 🚀 Deploy

### Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Função Supabase deployada
- [ ] Tabelas criadas no banco
- [ ] RLS configurado
- [ ] Testes passando
- [ ] Build sem erros

### Comandos de Deploy

```bash
# Build do projeto
npm run build

# Deploy da função Supabase
supabase functions deploy abacatepay-manager

# Verificar status
supabase functions logs abacatepay-manager
```

## 🔍 Monitoramento

### Logs Importantes

```bash
# Logs da função
supabase functions logs abacatepay-manager

# Logs em tempo real
supabase functions logs abacatepay-manager --follow

# Filtrar por erro
supabase functions logs abacatepay-manager | grep ERROR
```

### Métricas a Acompanhar

- Taxa de sucesso de pagamentos
- Tempo médio de confirmação
- Erros de API
- Performance da função Supabase

## 🔒 Segurança

### Boas Práticas

1. **Nunca exponha a API key do AbacatePay no frontend**
2. **Use RLS no Supabase**
3. **Valide todos os inputs**
4. **Implemente rate limiting**
5. **Use HTTPS sempre**
6. **Monitore logs de segurança**

### Validações Obrigatórias

```typescript
// Validação de valor
if (!amount || amount <= 0 || amount > 100000) {
  throw new Error('Invalid amount');
}

// Validação de email
if (!email || !isValidEmail(email)) {
  throw new Error('Valid email required');
}

// Validação de usuário
if (!user || !user.id) {
  throw new Error('User authentication required');
}
```

## 📞 Suporte

Para problemas de integração:

1. Verifique os logs do Supabase Functions
2. Teste os endpoints manualmente
3. Valide as variáveis de ambiente
4. Consulte a documentação da API AbacatePay
5. Abra uma issue no repositório

---

**Próximos passos:** Após completar esta integração, consulte o [README.md](./README.md) para exemplos de uso avançado.