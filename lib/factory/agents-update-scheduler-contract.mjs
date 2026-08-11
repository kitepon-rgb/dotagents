export function assertFixtureSidUsage({ sid, command, dryRun, os }) {
  if (sid && (command !== 'install' || !dryRun || os === 'win32')) throw new Error('--sidは非Windowsのinstall --dry-run専用です');
}
