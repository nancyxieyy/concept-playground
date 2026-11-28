#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$APP_DIR"
if [ ! -x node_modules/.bin/tauri ]; then
  echo '请先在 app 目录运行 npm install。' >&2
  exit 1
fi
ICON_TMP=$(mktemp -d "${TMPDIR:-/tmp}/island-icons.XXXXXX")
trap 'rm -rf "$ICON_TMP"' EXIT HUP INT TERM
# 原图为 204×259；只补奶油色边，不裁切、拉伸或重画。
sips --padToHeightWidth 259 259 --padColor FFF4E0 \
  ../assets/ui-v1/props/badge-island.png --out "$ICON_TMP/island.png" >/dev/null
npx --no-install tauri icon "$ICON_TMP/island.png" --output src-tauri/icons
