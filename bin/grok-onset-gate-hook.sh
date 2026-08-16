#!/usr/bin/env python3
"""Grok UserPromptSubmit frontend for the onset gate."""

import os
from pathlib import Path
import runpy


os.environ["DOTAGENTS_HOOK_HOST"] = "grok"
runpy.run_path(str(Path(__file__).resolve().parent / "onset-gate-hook.sh"), run_name="__main__")
