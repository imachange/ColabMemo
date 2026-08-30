#!/usr/bin/env bash
set -euo pipefail

npm install

if ! node -e "import('sharp').then(()=>process.exit(0)).catch(()=>process.exit(1))"; then
  echo "sharp のロードに失敗したため再ビルドします"
  npm rebuild sharp || true
fi

npm run dev
