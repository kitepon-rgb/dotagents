// launchd / cron は最小 PATH で runner を起動する。製品 CLI（npm global・uv tool・grok）が
// 解決できないと scan が全製品を missing と誤観測して BugHub の current matrix を汚すため、
// 既存 PATH の優先順位を変えずに「存在しない entry だけ」を末尾へ補完する。
// 明示 PATH（対話 shell・テストの fake bin）は常に先勝ちで、新しい shadow を作らない。
// Windows は Task Scheduler が user PATH を継承し、npm shim 解決は lib/factory/command.mjs の
// 検証済み契約が所有するため対象外とする。
import { dirname, join } from 'node:path';

export function extendedSchedulerPath({ platform, path, execPath, home }) {
  if (platform === 'win32') return path;
  if (typeof execPath !== 'string' || !execPath || typeof home !== 'string' || !home) throw new Error('scheduler PATH補完にはexecPathとhomeが必要です');
  const current = (typeof path === 'string' ? path : '').split(':').filter(Boolean);
  const seen = new Set(current);
  const candidates = [
    dirname(execPath),
    join(home, '.local', 'bin'),
    join(home, '.grok', 'bin'),
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
  ];
  const additions = candidates.filter((entry) => !seen.has(entry) && (seen.add(entry), true));
  return [...current, ...additions].join(':');
}
