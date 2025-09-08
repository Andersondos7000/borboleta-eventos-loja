# Script PowerShell para registrar commits no MCP Pieces
# Uso: .\register-commit.ps1 [mensagem-do-commit]

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Obtém a mensagem do commit (do argumento ou do último commit)
$commitMessage = $args[0]
if (-not $commitMessage) {
    $commitMessage = git log -1 --pretty=%B
}

# Executa o script Node.js para registrar o commit
node .\register-recent-commit.js "$commitMessage"