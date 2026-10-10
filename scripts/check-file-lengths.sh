#!/usr/bin/env bash
set -euo pipefail

status=0
while IFS= read -r -d '' file; do
  case "$file" in
    */node_modules/*|*/.output/*|*/.wrangler/*|*/dist/*|*/routeTree.gen.ts|*/components/ui/*|*/routes/index.tsx|*/components/dispatch-map.tsx|*.lock|*/migrations/*) continue ;;
  esac
  lines=$(wc -l < "$file")
  if (( lines > 300 )); then
    echo "$file has $lines lines (maximum 300)" >&2
    status=1
  fi
done < <(find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.py' -o -name '*.js' \) -print0)
exit "$status"
