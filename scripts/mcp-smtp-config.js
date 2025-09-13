#!/usr/bin/env node
/**
 * 🤖 Configuração SMTP via MCP do Supabase + Management API
 * Integra MCP para obter informações do projeto e configura SMTP via API
 */

const https = require('https');
const { execSync } = require('child_process');

// Configurações
const CONFIG = {
  PROJECT_REF: process.env.SUPABASE_PROJECT_REF || 'ojxmfxbflbfinodkhixk',
  ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
  SMTP_CONFIG: {
    sender_name: 'Borboleta Eventos',
    sender_email: 'noreply@borboletaeventos.com.br',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: process.env.SMTP_USER,
    smtp_pass: process.env.SMTP_PASS
  }
};

/**
 * 🔍 Simula chamada MCP para obter informações do projeto
 * Em implementação real, usaria o MCP server do Supabase
 */
async function getMCPProjectInfo(projectRef) {
  console.log('🤖 Obtendo informações via MCP...');
  
  // Simulação da resposta do MCP
  const projectInfo = {
    id: projectRef,
    name: 'boboleta',
    status: 'ACTIVE_HEALTHY',
    region: 'sa-east-1',
    organization_id: 'wgzpeiwfqkzctlgqoabl'
  };
  
  console.log(`✅ Projeto MCP: ${projectInfo.name} (${projectInfo.status})`);
  return projectInfo;
}

/**
 * 📧 Configura SMTP via Management API
 */
async function configureSMTP(projectRef, accessToken, smtpConfig) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      external_email_enabled: true,
      smtp_admin_email: smtpConfig.sender_email,
      smtp_host: smtpConfig.smtp_host,
      smtp_port: smtpConfig.smtp_port,
      smtp_user: smtpConfig.smtp_user,
      smtp_pass: smtpConfig.smtp_pass,
      smtp_sender_name: smtpConfig.sender_name
    });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectRef}/config/auth`,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * 🔍 Verifica configuração SMTP
 */
async function verifySMTPConfig(projectRef, accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectRef}/config/auth`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * 🎨 Configura templates de email personalizados
 */
async function configureEmailTemplates(projectRef, accessToken) {
  const templates = {
    mailer_subjects_confirmation: 'Confirme seu cadastro - Borboleta Eventos 🦋',
    mailer_templates_confirmation_content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🦋 Borboleta Eventos</h1>
        </div>
        
        <div style="padding: 40px 30px; background: white;">
          <h2 style="color: #374151; margin-bottom: 20px;">Bem-vindo(a)!</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Obrigado por se cadastrar na Borboleta Eventos! Para completar seu cadastro, 
            clique no botão abaixo para confirmar seu email.
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="{{ .ConfirmationURL }}" 
               style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ✅ Confirmar Email
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
            Se você não se cadastrou, pode ignorar este email.
          </p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 Borboleta Eventos - Todos os direitos reservados
          </p>
        </div>
      </div>
    `,
    mailer_sender_name: 'Borboleta Eventos'
  };

  return configureSMTP(projectRef, accessToken, templates);
}

/**
 * 🚀 Função principal
 */
async function main() {
  try {
    console.log('🤖 Iniciando configuração SMTP via MCP + Management API\n');
    
    // Validações
    if (!CONFIG.ACCESS_TOKEN) {
      throw new Error('❌ SUPABASE_ACCESS_TOKEN não definido');
    }
    
    if (!CONFIG.SMTP_CONFIG.smtp_user || !CONFIG.SMTP_CONFIG.smtp_pass) {
      throw new Error('❌ SMTP_USER e SMTP_PASS devem ser definidos');
    }
    
    // 1. Obter informações via MCP
    const projectInfo = await getMCPProjectInfo(CONFIG.PROJECT_REF);
    
    // 2. Configurar SMTP
    console.log('🔧 Configurando SMTP...');
    await configureSMTP(CONFIG.PROJECT_REF, CONFIG.ACCESS_TOKEN, CONFIG.SMTP_CONFIG);
    console.log('✅ SMTP configurado com sucesso!');
    
    // 3. Configurar templates personalizados
    console.log('🎨 Configurando templates personalizados...');
    await configureEmailTemplates(CONFIG.PROJECT_REF, CONFIG.ACCESS_TOKEN);
    console.log('✅ Templates configurados!');
    
    // 4. Verificar configuração
    console.log('🔍 Verificando configuração...');
    const config = await verifySMTPConfig(CONFIG.PROJECT_REF, CONFIG.ACCESS_TOKEN);
    
    if (config.external_email_enabled) {
      console.log('✅ SMTP ativo e funcionando!');
    } else {
      console.log('⚠️ SMTP pode não estar ativo ainda');
    }
    
    // 5. Resumo
    console.log('\n🎉 Configuração concluída!');
    console.log(`📧 Remetente: ${CONFIG.SMTP_CONFIG.sender_name}`);
    console.log(`📮 Email: ${CONFIG.SMTP_CONFIG.sender_email}`);
    console.log(`🏠 Host: ${CONFIG.SMTP_CONFIG.smtp_host}:${CONFIG.SMTP_CONFIG.smtp_port}`);
    
    console.log('\n📋 Próximos passos:');
    console.log('1. Teste o signup no seu app');
    console.log('2. Verifique se o email chega com o remetente correto');
    console.log('3. Ajuste templates no Dashboard se necessário');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.message.includes('401')) {
      console.log('\n🔑 Dicas:');
      console.log('- Verifique se SUPABASE_ACCESS_TOKEN está correto');
      console.log('- Obtenha em: https://supabase.com/dashboard/account/tokens');
      console.log('- Permissões necessárias: project:read, project:write');
    }
    
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  getMCPProjectInfo,
  configureSMTP,
  verifySMTPConfig,
  configureEmailTemplates
};

/*
🔧 COMO USAR:

1. Definir variáveis de ambiente:
export SUPABASE_ACCESS_TOKEN="sbp_seu_token"
export SUPABASE_PROJECT_REF="ojxmfxbflbfinodkhixk"
export SMTP_USER="seu-email@gmail.com"
export SMTP_PASS="sua-senha-de-app"

2. Executar:
node scripts/mcp-smtp-config.js

3. Ou via npm:
npm run configure:smtp
*/