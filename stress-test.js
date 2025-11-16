import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10, // 10 usuários virtuais
  duration: '30s', // por 30 segundos
};

export default function () {
  const url = `${__ENV.VITE_SUPABASE_URL}/rest/v1/transactions`;
  const payload = JSON.stringify({
    // Simule aqui o payload da sua transação
    amount: 100,
    description: 'Teste de estresse',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'apikey': `${__ENV.VITE_SUPABASE_ANON_KEY}`,
      'Authorization': `Bearer ${__ENV.VITE_SUPABASE_ANON_KEY}`
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 201': (r) => r.status === 201,
  });

  sleep(1);
}