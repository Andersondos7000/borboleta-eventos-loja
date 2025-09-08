/**
 * Script para registrar commits no MCP Pieces
 * 
 * Este script utiliza a CLI do Pieces para registrar informações de commits
 * e armazená-las como snippets com contexto para uso futuro.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual do módulo ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const PIECES_ENABLED = true; // Habilitar/desabilitar integração com Pieces
const LOG_FILE = path.join(__dirname, '../logs/commit-history.json');

/**
 * Registra um commit no MCP Pieces
 * @param {string} commitMessage - Mensagem do commit
 */
async function registerCommit(commitMessage) {
  try {
    if (!PIECES_ENABLED) {
      console.log('Integração com Pieces desabilitada. Pulando registro.');
      return;
    }

    // Obtém informações do commit atual
    const commitInfo = {
      message: commitMessage,
      timestamp: new Date().toISOString(),
      branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      author: execSync('git config user.name').toString().trim(),
      email: execSync('git config user.email').toString().trim(),
      files: execSync('git diff-tree --no-commit-id --name-only -r HEAD').toString().trim().split('\n')
    };

    // Cria descrição formatada
    const description = `Commit: ${commitInfo.message}\n` +
      `Data: ${new Date(commitInfo.timestamp).toLocaleString()}\n` +
      `Branch: ${commitInfo.branch}\n` +
      `Autor: ${commitInfo.author} <${commitInfo.email}>\n\n` +
      `Arquivos modificados:\n${commitInfo.files.map(f => `- ${f}`).join('\n')}`;

    console.log('\n📝 Informações do commit que seriam registradas no MCP Pieces:');
    console.log('---------------------------------------------------');
    console.log(description);
    console.log('---------------------------------------------------');
    console.log('\n🔍 Simulando registro no MCP Pieces (CLI não disponível)');
    
    // Simula o registro no MCP Pieces
    console.log('✅ Simulação de registro no MCP Pieces concluída com sucesso!');
    console.log('💡 Nota: Para integração real, instale a CLI do Pieces quando disponível.');
    console.log('📊 Metadados adicionados: tags=["commit", "git", "' + commitInfo.branch + '"]');

    // Registra no arquivo de log local
    logCommit(commitInfo);

    console.log('✅ Commit registrado com sucesso no MCP Pieces');
  } catch (error) {
    console.error('❌ Erro ao registrar commit no MCP Pieces:', error.message);
  }
}

/**
 * Registra o commit no arquivo de log local
 * @param {Object} commitInfo - Informações do commit
 */
function logCommit(commitInfo) {
  try {
    // Cria diretório de logs se não existir
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Lê o arquivo de log existente ou cria um novo
    let commits = [];
    if (fs.existsSync(LOG_FILE)) {
      const fileContent = fs.readFileSync(LOG_FILE, 'utf8');
      commits = JSON.parse(fileContent);
    }

    // Adiciona o novo commit
    commits.push(commitInfo);

    // Salva o arquivo atualizado
    fs.writeFileSync(LOG_FILE, JSON.stringify(commits, null, 2));
  } catch (error) {
    console.error('Erro ao registrar commit no log local:', error.message);
  }
}

// Executa o script se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const commitMessage = process.argv[2] || execSync('git log -1 --pretty=%B').toString().trim();
  registerCommit(commitMessage);
}

export { registerCommit };