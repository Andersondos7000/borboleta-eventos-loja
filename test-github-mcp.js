// Teste do MCP GitHub
console.log('🔍 Testando MCP GitHub...');

// Simular chamada do MCP GitHub
const testGitHub = () => {
  console.log('✅ GitHub Token configurado:', process.env.GITHUB_PERSONAL_ACCESS_TOKEN ? 'SIM' : 'NÃO');
  console.log('📍 Repositório atual: borboleta-eventos-loja');
  console.log('👤 Usuário: Andersondos7000');
  
  // Verificar se o token está válido (formato)
  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
  if (token && token.startsWith('github_pat_')) {
    console.log('🔑 Token válido (formato correto)');
  } else {
    console.log('❌ Token inválido');
  }
  
  console.log('\n🎯 Comandos MCP GitHub disponíveis:');
  console.log('- list-repos: Listar repositórios');
  console.log('- create-issue: Criar issue');
  console.log('- create-pr: Criar pull request');
  console.log('- get-file-contents: Ler arquivos');
  console.log('- push-files: Enviar arquivos');
  
  console.log('\n✅ Teste concluído!');
};

testGitHub();
