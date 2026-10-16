#!/bin/bash
set -euo pipefail
PREP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ "$#" -ne 1 ] || [ ! -d "$1" ]; then
  echo 'Usage: bash scripts/backup-project.sh /absolute/path/to/event-project' >&2
  exit 1
fi
PROJECT_DIR="$(cd "$1" && pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
if [ "$PROJECT_DIR" = "/" ] || [ "$PROJECT_DIR" = "$HOME" ] || [ "$PROJECT_DIR" = "$PREP_DIR" ]; then
  echo 'Choose the actual event project directory, not your home or this preparation directory.' >&2
  exit 1
fi
mkdir -p "$PREP_DIR/backups"
ARCHIVE_PATH="$PREP_DIR/backups/${PROJECT_NAME}-$(date +%Y%m%d-%H%M%S).tar.gz"
if [ -e "$ARCHIVE_PATH" ]; then
  echo 'Backup path already exists. Try again in a second.' >&2
  exit 1
fi
tar -czf "$ARCHIVE_PATH" \
  --exclude='.git' --exclude='node_modules' --exclude='.venv' \
  --exclude='.env' --exclude='.env.*' --exclude='*.pem' --exclude='*.key' \
  --exclude='.DS_Store' --exclude="$(basename "$PREP_DIR")" \
  -C "$(dirname "$PROJECT_DIR")" "$PROJECT_NAME"
tar -tzf "$ARCHIVE_PATH" >/dev/null
echo "Saved: $ARCHIVE_PATH"
echo 'Source archive only: separately back up cloud data, documents and Git history. Review files before publishing.'
