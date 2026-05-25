#!/bin/bash

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "❌ GITHUB_PERSONAL_ACCESS_TOKEN não encontrado nos secrets."
  exit 1
fi

REPO_URL="https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/endersonevemy4-lab/nazuna.git"

git remote set-url origin "$REPO_URL"

echo "🔄 Verificando alterações..."

git add -A

STATUS=$(git status --porcelain)

if [ -z "$STATUS" ]; then
  echo "✅ Nenhuma alteração para enviar."
else
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  git commit -m "sync: atualização automática - $TIMESTAMP"
  echo "📤 Enviando para o GitHub..."
  git push origin main
  echo "✅ GitHub atualizado com sucesso!"
fi
