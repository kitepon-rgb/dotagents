import { spawn } from 'node:child_process';

export function run(command, args, {
  cwd,
  timeoutMs = 5000,
  maxOutputBytes = 64 * 1024,
  env = process.env,
  input,
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

    try {
      child = spawn(command, args, { cwd, env, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    } catch (error) {
      settle({ ok: false, reason: 'spawn', stdout: '', stderr: '', error });
      return;
    }

    if (input !== undefined) {
      child.stdin.on('error', () => {});
      child.stdin.end(input);
    }

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
  });
}
