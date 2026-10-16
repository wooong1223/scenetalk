#!/bin/bash
set -euo pipefail
PREP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_PATH="/Applications/Antigravity.app"
BACKUP_PATH="$PREP_DIR/.install-backups/Antigravity-2.0.10.app"
if pgrep -f '/Applications/Antigravity.app/Contents/MacOS/' >/dev/null; then
  echo 'Antigravity is running. Close it before updating.' >&2
  exit 1
fi
if [ -e "$BACKUP_PATH" ]; then
  echo 'Backup already exists; refusing to overwrite it.' >&2
  exit 1
fi
mkdir -p "$PREP_DIR/.install-backups"
mv "$APP_PATH" "$BACKUP_PATH"
restore_on_failure() {
  if [ ! -e "$APP_PATH" ] && [ -e "$BACKUP_PATH" ]; then
    mv "$BACKUP_PATH" "$APP_PATH"
    echo 'Restored the previous Antigravity app.' >&2
  fi
}
trap restore_on_failure EXIT
HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1 brew install --cask antigravity
/usr/bin/codesign --verify --deep --strict "$APP_PATH"
/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PATH/Contents/Info.plist"
trap - EXIT
