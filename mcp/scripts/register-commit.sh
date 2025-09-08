#!/bin/bash

# Script para registrar commits no MCP Pieces
# Uso: ./register-commit.sh [mensagem-do-commit]

cd "$(dirname "$0")"

# Obtém a mensagem do commit (do argumento ou do último commit)
COMMIT_MESSAGE="$1"
if [ -z "$COMMIT_MESSAGE" ]; then
  COMMIT_MESSAGE=$(git log -1 --pretty=%B)
fi

# Executa o script Node.js para registrar o commit
node ./register-recent-commit.js "$COMMIT_MESSAGE"