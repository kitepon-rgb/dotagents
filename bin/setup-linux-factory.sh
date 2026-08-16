#!/usr/bin/env bash
# native Linux（main-server）向け一撃展開入口。POSIX配線はWSL版と共有し、server契約を明示する。
set -euo pipefail

script_source="${BASH_SOURCE[0]}"
while [ -L "$script_source" ]; do
  script_dir="$(cd "$(dirname "$script_source")" && pwd)"
  script_source="$(readlink "$script_source")"
  case "$script_source" in /*) ;; *) script_source="$script_dir/$script_source" ;; esac
done
ROOT="$(cd "$(dirname "$script_source")/.." && pwd)"

export DOTAGENTS_SETUP_VARIANT=linux
exec "$ROOT/bin/setup-wsl-factory.sh" "$@"
