#!/usr/bin/env bash
set -euo pipefail
SSH_USER="ubuntu"; SSH_HOST="3.21.31.202"; SSH_KEY="${SSH_KEY_OVERRIDE:-$HOME/.ssh/veracruz.pem}"; SSH_PORT="22"
APP="gestiona"; BASE="/var/www/${APP}_releases"; REL="${BASE}/${APP}-$(date +%Y%m%d%H%M%S)"

[ -f "$SSH_KEY" ] && chmod 400 "$SSH_KEY" >/dev/null 2>&1 || true

LOCAL_DIST="$(pwd)/dist"
APPDIR="$(find "$LOCAL_DIST" -maxdepth 1 -mindepth 1 -type d | head -n1 || true)"
BROWSER="${APPDIR}/browser"; SERVER="${APPDIR}/server"
[[ -d "$BROWSER" && -d "$SERVER" ]] || { echo "❌ No encuentro $BROWSER o $SERVER. Build SSR primero."; exit 3; }

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o IdentitiesOnly=yes "$SSH_USER@$SSH_HOST" \
  "sudo mkdir -p '$BASE' && sudo chown -R '$SSH_USER:$SSH_USER' '$BASE' && mkdir -p '$REL/browser' '$REL/server'"

rsync -az -e "ssh -i $SSH_KEY -p $SSH_PORT -o IdentitiesOnly=yes" "$SERVER/"/  "$SSH_USER@$SSH_HOST:$REL/server/"
rsync -az -e "ssh -i $SSH_KEY -p $SSH_PORT -o IdentitiesOnly=yes" "$BROWSER/"/ "$SSH_USER@$SSH_HOST:$REL/browser/"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o IdentitiesOnly=yes "$SSH_USER@$SSH_HOST" \
  "sudo bash /usr/local/bin/activate_gestiona_release.sh '$REL'"

ssh -i "$SSH_KEY" -p "$SSH_PORT" -o IdentitiesOnly=yes "$SSH_USER@$SSH_HOST" \
  "curl -fsS -H 'Host: civis.creativamin.com' http://127.0.0.1/ >/dev/null && echo '✅ Deploy OK: $REL' || (echo '⚠️ Smoke test falló'; exit 1)"
