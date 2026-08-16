#!/usr/bin/env bash
# Grok PostToolUse frontend for plan-gate.
# Grok は PostToolUse の stdout を制御に使わない。exit 2 も出さない。
set -uo pipefail
cat >/dev/null 2>&1 || true
exit 0
