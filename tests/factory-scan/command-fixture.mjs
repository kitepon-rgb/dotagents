import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';

function npmShim(name) {
  return `@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n\r\nIF EXIST "%dp0%\\node.exe" (\r\n  SET "_prog=%dp0%\\node.exe"\r\n) ELSE (\r\n  SET "_prog=node"\r\n  SET PATHEXT=%PATHEXT:;.JS;=;%\r\n)\r\n\r\nendLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\factory-test-fixtures\\${name}.mjs" %*\r\n`;
}

export async function writeCommandFixture(bin, name, body) {
  const command = join(bin, name);
  if (process.platform !== 'win32') {
    await writeFile(command, `#!/bin/sh\n${body}`);
    await chmod(command, 0o755);
    return command;
  }

  const packageDir = join(bin, 'node_modules', 'factory-test-fixtures');
  const script = join(packageDir, name);
  const entrypoint = join(packageDir, `${name}.mjs`);
  await mkdir(packageDir, { recursive: true });
  await writeFile(script, `#!/bin/sh\n${body}`);
  await writeFile(entrypoint, `import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const result = spawnSync(join(process.env.ProgramFiles, 'Git', 'bin', 'sh.exe'), [${JSON.stringify(script)}, ...process.argv.slice(2)], { env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
`);
  await writeFile(`${command}.cmd`, npmShim(name));
  return `${command}.cmd`;
}
