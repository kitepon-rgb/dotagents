import { spawn } from 'node:child_process';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { win32 } from 'node:path';

function commandError(message, code = 'EINVAL') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function bareCommand(command) {
  return typeof command === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(command);
}

function pathExtensions(value) {
  const extensions = (value || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean).map((extension) => extension.toLowerCase());
  if (!extensions.length || extensions.some((extension) => !/^\.[A-Za-z0-9]+$/u.test(extension))) throw commandError('Windows PATHEXTが不正です');
  return extensions;
}

function environmentValue(env, name) {
  const key = Object.keys(env).find((entry) => entry.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : env[key];
}

async function regularFile(path, fs) {
  const info = await fs.lstat(path);
  return info.isFile() && !info.isSymbolicLink();
}

async function npmCmdEntrypoint(shim, fs, pathModule) {
  let source;
  try {
    source = await fs.readFile(shim, 'utf8');
  } catch (error) {
    throw commandError('Windows command shimを読めません', error?.code || 'EINVAL');
  }
  source = source.replace(/^\uFEFF/u, '').replace(/\r\n/gu, '\n');
  const match = /^@ECHO off\nGOTO start\n:find_dp0\nSET dp0=%~dp0\nEXIT \/b\n:start\nSETLOCAL\nCALL :find_dp0\n+IF EXIST "%dp0%\\node\.exe" \(\n SET "_prog=%dp0%\\node\.exe"\n\) ELSE \(\n SET "_prog=node"\n\)\n+endLocal & goto #_undefined_# 2>NUL \|\| title %COMSPEC% & set PATHEXT=%PATHEXT:;.JS;=;% & "%_prog%"\s+"%dp0%\\(node_modules(?:\\[A-Za-z0-9@._-]+)+\.(?:cjs|mjs|js))"\s+%\*\n?$/iu.exec(source);
  if (!match) throw commandError('Windows command shimのNode entrypointが不正です');

  const segments = match[1].split('\\');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) throw commandError('Windows command shimのNode entrypointが不正です');
  const shimDirectory = await fs.realpath(pathModule.dirname(shim));
  const nodeModules = pathModule.join(shimDirectory, 'node_modules');
  const entrypoint = pathModule.join(shimDirectory, ...segments);
  let resolved;
  try {
    if (!await regularFile(entrypoint, fs)) throw commandError('Windows command shimのNode entrypointが不正です');
    resolved = await fs.realpath(entrypoint);
  } catch (error) {
    if (error?.code === 'EINVAL') throw error;
    throw commandError('Windows command shimのNode entrypointが不正です', error?.code || 'EINVAL');
  }
  const relative = pathModule.relative(nodeModules, resolved);
  if (!relative || relative === '..' || relative.startsWith(`..${pathModule.sep}`) || pathModule.isAbsolute(relative)) throw commandError('Windows command shimのNode entrypointが不正です');
  return resolved;
}

export async function resolveWindowsCommand(command, {
  env = process.env,
  fs = { lstat, readFile, realpath },
  pathModule = win32,
} = {}) {
  if (!bareCommand(command)) throw commandError('Windows command名が不正です');
  const pathValue = environmentValue(env, 'PATH');
  if (typeof pathValue !== 'string' || !pathValue) throw commandError('Windows PATHが不正です', 'ENOENT');
  const extensions = pathExtensions(environmentValue(env, 'PATHEXT'));
  const directories = pathValue.split(pathModule.delimiter).filter(Boolean);
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = pathModule.join(directory, `${command}${extension}`);
      let present;
      try {
        present = await regularFile(candidate, fs);
      } catch (error) {
        if (error?.code === 'ENOENT') continue;
        throw commandError('Windows commandを検証できません', error?.code || 'EINVAL');
      }
      if (!present) throw commandError('Windows command shimが不正です');
      if (extension === '.exe') return { command: candidate, prefixArgs: [] };
      if (extension === '.cmd') return { command: process.execPath, prefixArgs: [await npmCmdEntrypoint(candidate, fs, pathModule)] };
      throw commandError('Windows command shimの形式を許可していません');
    }
  }
  throw commandError('Windows commandがPATHにありません', 'ENOENT');
}

export function run(command, args, {
  cwd,
  timeoutMs = 5000,
  maxOutputBytes = 64 * 1024,
  env = process.env,
  input,
  platform = process.platform,
  windowsPathModule = win32,
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let child;
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    let timer;

    const settle = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const terminate = () => {
      if (child && !child.killed) child.kill('SIGKILL');
    };

    const collect = (kind) => (chunk) => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > maxOutputBytes) {
        terminate();
        settle({ ok: false, reason: 'output_limit', stdout: '', stderr: '' });
        return;
      }
      if (kind === 'stdout') stdout += chunk;
      else stderr += chunk;
    };

    const start = async () => {
      let executable = command;
      let commandArgs = args;
      if (platform === 'win32') {
        try {
          const resolved = await resolveWindowsCommand(command, { env, pathModule: windowsPathModule });
          executable = resolved.command;
          commandArgs = [...resolved.prefixArgs, ...args];
        } catch (error) {
          settle({ ok: false, reason: 'spawn', stdout: '', stderr: '', error });
          return;
        }
      }
      try {
        child = spawn(executable, commandArgs, { cwd, env, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
      } catch (error) {
        settle({ ok: false, reason: 'spawn', stdout: '', stderr: '', error });
        return;
      }
      if (input !== undefined) {
        child.stdin.on('error', () => {});
        child.stdin.end(input);
      }
      child.stdout.on('data', collect('stdout'));
      child.stderr.on('data', collect('stderr'));
      child.on('error', (error) => {
        settle({ ok: false, reason: 'spawn', stdout: '', stderr: '', error });
      });
      child.on('close', (code) => {
        settle({ ok: code === 0, code, reason: code === 0 ? null : 'exit', stdout, stderr });
      });
      timer = setTimeout(() => {
        terminate();
        settle({ ok: false, reason: 'timeout', stdout: '', stderr: '' });
      }, timeoutMs);
    };
    start();
  });
}
