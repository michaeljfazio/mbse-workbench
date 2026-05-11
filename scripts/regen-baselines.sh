#!/bin/sh
# Regenerates @visual Playwright baselines on the Linux renderer used by CI.
# Intended to be run inside the mcr.microsoft.com/playwright:v1.48.2-jammy
# container via podman. See docs/CONTEXT.md for the full procedure.
set -e
cd /work
rm -rf node_modules dist
# Skip corepack — the container's stale signing keys reject `corepack enable`.
# Install pnpm directly via npm; lockfile pins the actual deps.
PNPM_VERSION=$(node -p "require('./package.json').packageManager || 'pnpm@9.x'" | sed 's/pnpm@//')
npm install --global "pnpm@${PNPM_VERSION}"
pnpm install --frozen-lockfile
VITE_BASE_OVERRIDE=/ pnpm build
VITE_BASE_OVERRIDE=/ pnpm exec vite preview --host 0.0.0.0 --port 5173 &
PREVIEW_PID=$!
for i in $(seq 1 30); do
  if curl -fs http://localhost:5173/ >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm exec playwright test --update-snapshots --grep @visual --workers=2 2>&1 | tail -120
RESULT=$?
kill $PREVIEW_PID 2>/dev/null || true
exit $RESULT
