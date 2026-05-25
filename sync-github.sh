#!/bin/bash

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "❌ GITHUB_PERSONAL_ACCESS_TOKEN não encontrado nos secrets."
  exit 1
fi

REPO_URL="https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/endersonevemy4-lab/nazuna.git"

git remote set-url origin "$REPO_URL"

echo "🔄 Verificando alterações..."

git rm --cached package-lock.json yarn.lock 2>/dev/null || true
git rm -r --cached attached_assets/ 2>/dev/null || true
git rm --cached .replit replit.nix 2>/dev/null || true
git add -A

STATUS=$(git status --porcelain)

if [ -n "$STATUS" ]; then
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  git commit -m "sync: atualização automática - $TIMESTAMP"
fi

AHEAD=$(git rev-list origin/main..HEAD --count 2>/dev/null || echo "0")

if [ "$AHEAD" -gt "0" ]; then
  echo "📤 Enviando $AHEAD commit(s) para o GitHub..."
  git push origin main
  echo "✅ GitHub atualizado com sucesso!"
else
  echo "✅ GitHub já está atualizado."
fi
