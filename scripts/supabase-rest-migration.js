/**
 * Script para executar migração SQL via API REST do Supabase
 * 
 * A API REST do Supabase permite executar SQL diretamente no banco de dados
 * usando a chave service_role para operações administrativas.
 * 
 * Documentação: https://supabase.com/docs/reference/api/rest
 */

const SUPABASE_URL = 'https://ojxmfxbflbfinodkhixk.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qeG1meGJmbGJmaW5vZGtoaXhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDkyNTA4MCwiZXhwIjoyMDcwNTAxMDgwfQ.otn_yr7CqJpg9B_z9XaONVxqHSlNsCro67bVstt5JmQ';

// SQL da migração - função delete_user_cascade
const MIGRATION_SQL = `
-- Função para deletar usuário e todos os dados relacionados em cascata
CREATE OR REPLACE FUNCTION delete_user_cascade(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Deletar itens do carrinho do usuário
    DELETE FROM cart_items WHERE user_id = user_id_param;
    
    -- Deletar tickets do usuário
    DELETE FROM tickets WHERE user_id = user_id_param;
    
    -- Deletar pedidos do usuário
    DELETE FROM orders WHERE user_id = user_id_param;
    
    -- Deletar perfil do usuário
    DELETE FROM profiles WHERE id = user_id_param;
    
    -- Deletar usuário da tabela auth.users (requer privilégios especiais)
    DELETE FROM auth.users WHERE id = user_id_param;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retorna FALSE
        RETURN FALSE;
END;
$$;

-- Conceder permissões para executar a função
GRANT EXECUTE ON FUNCTION delete_user_cascade(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_user_cascade(UUID) TO authenticated;

-- Criar política RLS para a função (apenas admins podem executar)
CREATE POLICY "Only admins can delete users" ON auth.users
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Comentário da função
COMMENT ON FUNCTION delete_user_cascade(UUID) IS 'Deleta um usuário e todos os seus dados relacionados em cascata. Apenas administradores podem executar esta função.';
`;

/**
 * Executa SQL via API REST do Supabase
 * @param {string} sql - Query SQL para executar
 * @returns {Promise<Object>} - Resultado da execução
 */
async function executeSQL(sql) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'apikey': SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
                query: sql
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Erro ao executar SQL:', error);
        throw error;
    }
}

/**
 * Método alternativo usando endpoint direto do PostgREST
 * @param {string} sql - Query SQL para executar
 * @returns {Promise<Object>} - Resultado da execução
 */
async function executeSQLDirect(sql) {
    try {
        // Para DDL (CREATE, ALTER, DROP), usamos o endpoint direto
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/sql',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'apikey': SERVICE_ROLE_KEY,
                'Accept': 'application/json'
            },
            body: sql
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.text();
        return result;
    } catch (error) {
        console.error('Erro ao executar SQL direto:', error);
        throw error;
    }
}

/**
 * Executa a migração da função delete_user_cascade
 */
async function runMigration() {
    console.log('🚀 Iniciando migração da função delete_user_cascade...');
    
    try {
        // Método 1: Tentar via RPC (se disponível)
        console.log('📝 Tentando executar via RPC...');
        try {
            const result = await executeSQL(MIGRATION_SQL);
            console.log('✅ Migração executada com sucesso via RPC:', result);
            return;
        } catch (rpcError) {
            console.log('⚠️  RPC não disponível, tentando método direto...');
        }

        // Método 2: Execução direta via PostgREST
        console.log('📝 Executando via PostgREST direto...');
        const result = await executeSQLDirect(MIGRATION_SQL);
        console.log('✅ Migração executada com sucesso:', result);
        
    } catch (error) {
        console.error('❌ Erro na migração:', error.message);
        console.log('\n💡 Alternativas:');
        console.log('1. Use o SQL Editor no dashboard do Supabase');
        console.log('2. Execute via CLI: supabase db push');
        console.log('3. Use uma Edge Function para executar o SQL');
    }
}

/**
 * Testa se a função foi criada corretamente
 */
async function testFunction() {
    console.log('🧪 Testando se a função foi criada...');
    
    const testSQL = `
        SELECT 
            routine_name,
            routine_type,
            data_type
        FROM information_schema.routines 
        WHERE routine_name = 'delete_user_cascade'
        AND routine_schema = 'public';
    `;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'apikey': SERVICE_ROLE_KEY
            },
            body: JSON.stringify({
                query: testSQL
            })
        });

        if (response.ok) {
            const result = await response.json();
            if (result.length > 0) {
                console.log('✅ Função delete_user_cascade encontrada!');
                console.log(result);
            } else {
                console.log('❌ Função delete_user_cascade não encontrada.');
            }
        }
    } catch (error) {
        console.log('⚠️  Não foi possível testar a função:', error.message);
    }
}

// Executar se chamado diretamente
if (typeof window === 'undefined') {
    // Node.js environment
    runMigration().then(() => {
        return testFunction();
    });
} else {
    // Browser environment
    console.log('📋 Script carregado. Use runMigration() para executar.');
    window.runMigration = runMigration;
    window.testFunction = testFunction;
}

// Exportar funções para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runMigration,
        testFunction,
        executeSQL,
        executeSQLDirect
    };
}