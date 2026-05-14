#!/bin/sh
# One-off helper: regenerate the chat @visual baselines against `vite dev`,
# because the production-bundle regen (scripts/regen-baselines.sh) does
# not expose the window.__llm fixture seam (DEV-only in src/main.tsx).
set -e
cd /work
rm -rf node_modules dist
PNPM_VERSION=$(node -p "require('./package.json').packageManager || 'pnpm@9.x'" | sed 's/pnpm@//')
npm install --global "pnpm@${PNPM_VERSION}" >/dev/null 2>&1
pnpm install --frozen-lockfile >/dev/null 2>&1
VITE_BASE_OVERRIDE=/ pnpm build --mode test
VITE_BASE_OVERRIDE=/ pnpm exec vite preview --host 0.0.0.0 --port 5173 --mode test &
PREVIEW_PID=$!
for i in $(seq 1 30); do
  if curl -fs http://localhost:5173/ >/dev/null 2>&1; then break; fi
  sleep 1
done
PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm exec playwright test --update-snapshots --grep @visual \
  chat-proposal-accept.spec.ts chat-streaming.spec.ts chat-tools.spec.ts \
  --workers=1 2>&1 | tail -60
RESULT=$?
kill $PREVIEW_PID 2>/dev/null || true
exit $RESULT
