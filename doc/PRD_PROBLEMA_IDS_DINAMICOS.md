# PRD - Problema com IDs Dinâmicos em Inputs de Autenticação

## 📋 Resumo Executivo

**Problema:** Os inputs de formulário na página de autenticação (`/auth`) estão gerando IDs dinâmicos automaticamente pelo Radix UI Tabs, impedindo a automação de testes e integração com ferramentas externas que dependem de seletores CSS estáveis.

**Impacto:** Impossibilidade de automatizar testes, integrar com ferramentas de análise e criar seletores CSS confiáveis para os campos de login e cadastro.

**Prioridade:** Alta - Bloqueia automação e testes automatizados

## 🎯 Definição do Problema

### Localização do Problema
- **Arquivo:** `d:\ecomerce\src\pages\Auth.tsx`
- **Componente:** Formulários de Login e Cadastro dentro de Radix UI Tabs
- **URL:** `http://localhost:8080/auth`
- **Elementos Afetados:**
  - Input de email do login
  - Input de senha do login
  - Input de nome do cadastro
  - Input de email do cadastro
  - Input de senha do cadastro
  - Input de confirmação de senha do cadastro

### Comportamento Atual
- **IDs Esperados:** `login-email`, `login-password`, `signup-name`, `signup-email`, `signup-password`, `signup-confirm-password`
- **IDs Gerados:** `:r6:-form-item`, `:r7:-form-item`, `:r8:-form-item`, etc.
- **Padrão:** IDs seguem formato `:r[número]:-form-item` gerados dinamicamente pelo Radix UI

### Causa Raiz
O Radix UI Tabs está sobrescrevendo os IDs personalizados dos inputs, gerando identificadores únicos automaticamente para evitar conflitos entre abas.

## 🔧 Tentativas de Solução Implementadas

### 1. Primeira Abordagem - useRef com setTimeout
**Data:** Implementação inicial
**Método:** Uso de `useRef` para referenciar inputs e `setTimeout` para forçar IDs após renderização
**Código:**
```typescript
const loginEmailRef = useRef<HTMLInputElement>(null);
const loginPasswordRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  const forceIds = () => {
    if (loginEmailRef.current) {
      loginEmailRef.current.id = 'login-email';
    }
    if (loginPasswordRef.current) {
      loginPasswordRef.current.id = 'login-password';
    }
  };
  
  setTimeout(forceIds, 100);
  setTimeout(forceIds, 500);
  setTimeout(forceIds, 1000);
}, []);
```
**Resultado:** ❌ Falhou - IDs continuaram dinâmicos
**Problema:** `useRef` não conseguiu capturar os elementos corretamente

### 2. Segunda Abordagem - MutationObserver
**Data:** Primeira iteração com observer
**Método:** Implementação de `MutationObserver` para detectar mudanças no DOM
**Código:**
```typescript
useEffect(() => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'id') {
        const target = mutation.target as HTMLElement;
        if (target.tagName === 'INPUT') {
          // Lógica para redefinir IDs
        }
      }
    });
  });
  
  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['id']
  });
}, []);
```
**Resultado:** ❌ Falhou - Observer não detectou mudanças
**Problema:** Observer não foi acionado ou configurado incorretamente

### 3. Terceira Abordagem - Busca Direta no DOM
**Data:** Iteração mais recente
**Método:** Busca direta por inputs usando `document.querySelectorAll`
**Código:**
```typescript
useEffect(() => {
  const forceIds = () => {
    const inputs = document.querySelectorAll('input');
    inputs.forEach((input, index) => {
      if (input.type === 'email' && index === 0) {
        input.id = 'login-email';
      } else if (input.type === 'password' && index === 1) {
        input.id = 'login-password';
      }
    });
  };
  
  setTimeout(forceIds, 100);
  setTimeout(forceIds, 500);
  setTimeout(forceIds, 1000);
}, []);
```
**Resultado:** ❌ Falhou - IDs ainda dinâmicos
**Problema:** Timing inadequado ou Radix UI reescrevendo IDs após nossa modificação

### 4. Teste Manual no Console
**Data:** Teste direto
**Método:** Execução manual de JavaScript no console do navegador
**Código:**
```javascript
const inputs = document.querySelectorAll('input');
inputs[0].id = 'login-email';
inputs[1].id = 'login-password';
console.log('IDs forçados:', inputs[0].id, inputs[1].id);
```
**Resultado:** ✅ Sucesso temporário - IDs foram alterados
**Problema:** Mudança não persiste, é revertida pelo Radix UI

## 🔍 Análise Técnica

### Estrutura do Componente
```typescript
// Estrutura simplificada do Auth.tsx
function Auth() {
  // Estados e hooks
  const [loginData, setLoginData] = useState({});
  const [signupData, setSignupData] = useState({});
  
  // useEffect com tentativas de forçar IDs
  useEffect(() => {
    // Lógica de forçar IDs
  }, []);
  
  return (
    <Tabs defaultValue="login">
      <TabsContent value="login">
        <Input type="email" /> {/* ID dinâmico gerado aqui */}
        <Input type="password" /> {/* ID dinâmico gerado aqui */}
      </TabsContent>
      <TabsContent value="signup">
        {/* Inputs de cadastro */}
      </TabsContent>
    </Tabs>
  );
}
```

### Problemas Identificados
1. **Timing:** Radix UI pode estar aplicando IDs após nossos `setTimeout`
2. **Re-renderização:** Componente pode estar re-renderizando e perdendo IDs customizados
3. **Conflito de Bibliotecas:** Radix UI pode ter proteção contra modificação de IDs
4. **Estrutura de Estados:** Declarações de estado estavam em posição inadequada (já corrigido)

## 📊 Logs e Evidências

### Console do Navegador
```
[vite] connecting...
[vite] connected.
Future versions of React Router will default to the new behavior.
The above element has an empty `autocomplete` attribute.
The above element has an empty `autocomplete` attribute.
```

### IDs Atuais Detectados
```javascript
// Resultado da verificação via browser_evaluate
{
  "loginEmail": null,
  "loginPassword": null,
  "actualIds": [":r6:-form-item", ":r7:-form-item"]
}
```

## 🎯 Requisitos da Solução

### Funcionais
1. **RF001:** Inputs devem ter IDs estáticos e previsíveis
2. **RF002:** IDs devem persistir durante toda a sessão do usuário
3. **RF003:** Solução deve funcionar com Radix UI Tabs
4. **RF004:** Não deve quebrar funcionalidade existente

### Não Funcionais
1. **RNF001:** Performance não deve ser impactada
2. **RNF002:** Solução deve ser maintível e limpa
3. **RNF003:** Compatibilidade com automação de testes
4. **RNF004:** Logs de debug devem ser removíveis em produção

## 🚀 Próximos Passos Sugeridos

### Opção 1: Modificação do Radix UI
- Investigar props do Radix UI Tabs para desabilitar geração automática de IDs
- Verificar documentação oficial para override de comportamento

### Opção 2: Wrapper Customizado
- Criar wrapper personalizado para inputs que force IDs
- Implementar hook customizado para gerenciar IDs

### Opção 3: Seletores Alternativos
- Usar data-attributes ao invés de IDs
- Implementar seletores CSS mais robustos

### Opção 4: Substituição de Biblioteca
- Avaliar alternativas ao Radix UI Tabs
- Implementar tabs customizados com controle total

## 📈 Critérios de Sucesso

1. ✅ Inputs possuem IDs estáticos (`login-email`, `login-password`, etc.)
2. ✅ IDs persistem durante navegação entre abas
3. ✅ Automação de testes funciona corretamente
4. ✅ Performance mantida
5. ✅ Código limpo e maintível

## 🔗 Arquivos Relacionados

- `d:\ecomerce\src\pages\Auth.tsx` - Componente principal
- `d:\ecomerce\src\components\ui\*` - Componentes UI do Radix
- `d:\ecomerce\package.json` - Dependências do projeto

---

**Documento criado em:** Janeiro 2025  
**Última atualização:** Janeiro 2025  
**Status:** Problema ativo, aguardando solução