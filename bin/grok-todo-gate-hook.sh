#!/usr/bin/env python3
"""Grok SessionStart / Stop frontend for the todo gate."""

import os
from pathlib import Path
import runpy


os.environ["DOTAGENTS_HOOK_HOST"] = "grok"
runpy.run_path(str(Path(__file__).resolve().parent / "todo-gate-hook.sh"), run_name="__main__")
