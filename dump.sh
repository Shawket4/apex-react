#!/usr/bin/env bash
OUT=/tmp/apex-context.txt
> "$OUT"

dump() {
  for f in "$@"; do
    if [ -f "$f" ]; then
      echo "=== $f ===" >> "$OUT"
      cat "$f" >> "$OUT"
      echo "" >> "$OUT"
    fi
  done
}

dump_dir() {
  if [ -d "$1" ]; then
    find "$1" -type f \( -name '*.ts' -o -name '*.tsx' \) | sort | while read -r f; do
      echo "=== $f ===" >> "$OUT"; cat "$f" >> "$OUT"; echo "" >> "$OUT"
    done
  fi
}

# Root config
dump package.json tsconfig.json vite.config.ts tailwind.config.ts index.html

# App shell + routing + providers
dump_dir src/app

# Shared foundation (all of it)
dump_dir src/shared/api
dump_dir src/shared/auth
dump_dir src/shared/config
dump_dir src/shared/hooks
dump_dir src/shared/lib
dump_dir src/shared/types
dump src/shared/i18n/index.ts

# Just the UI primitives I really need
dump src/shared/ui/map-view.tsx \
     src/shared/ui/page-shell.tsx \
     src/shared/ui/sheet.tsx \
     src/shared/ui/date-range-picker.tsx \
     src/shared/ui/empty-state.tsx \
     src/shared/ui/search-input.tsx

# One reference entity (mirror its shape exactly)
dump_dir src/entities/fee-mapping
dump_dir src/entities/car

# How maps get used + a playback-ish flow if any
dump src/widgets/fee-mappings/fee-mappings-location-dialog.tsx \
     src/widgets/trip-location-dialog/trip-location-dialog.tsx \
     src/widgets/trip-form/drop-off-picker-modal.tsx

# Reference page wiring
dump src/pages/fee-mappings/fee-mappings.tsx

# Sidebar + layout for route registration
dump src/widgets/sidebar/sidebar.tsx \
     src/widgets/layout/layout.tsx

wc -l "$OUT"
