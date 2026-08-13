#!/bin/sh
# 対話hookは隔離Pythonだけを起動する。親PATH/PYTHONPATHを解釈しない。
set -f

invoked=$0
case "$invoked" in
  /*) ;;
  *) invoked="$(pwd -P)/$invoked" ;;
esac
invoked_dir=$(CDPATH='' cd -P -- "$(/usr/bin/dirname -- "$invoked")" 2>/dev/null && pwd) || exit 0
source=$invoked
while [ -L "$source" ]; do
  target=$(/usr/bin/readlink "$source") || exit 0
  case "$target" in
    /*) source=$target ;;
    *) source="$(/usr/bin/dirname -- "$source")/$target" ;;
  esac
done
source_dir=$(CDPATH='' cd -P -- "$(/usr/bin/dirname -- "$source")" 2>/dev/null && pwd) || exit 0
core="$source_dir/../lib/orchestrate/advisory-hook.py"
[ -f "$core" ] && [ ! -L "$core" ] || exit 0

if [ "${OS:-}" = "Windows_NT" ]; then
  python=$(command -v python 2>/dev/null) || exit 0
  core=$(cygpath -m "$core") || exit 0
  invoked_dir=$(cygpath -m "$invoked_dir") || exit 0
  source_dir=$(cygpath -m "$source_dir") || exit 0
  exec "$python" -I "$core" "$invoked_dir" "$source_dir"
fi

for python in /usr/bin/python3 /opt/homebrew/bin/python3 /usr/local/bin/python3; do
  if [ -f "$python" ] && [ ! -d "$python" ] && [ -x "$python" ]; then
    exec "$python" -I "$core" "$invoked_dir" "$source_dir"
  fi
done
exit 0
