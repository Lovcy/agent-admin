import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { delimiter, join, extname } from 'node:path';

export async function resolveExecutable(name) {
  if (name.includes('/') || name.includes('\\')) return name;
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    for (const extension of process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : ['']) {
      const candidate = join(dir, `${name}${extension}`);
      if (
        await access(candidate).then(
          () => true,
          () => false,
        )
      )
        return candidate;
    }
  }
  throw new Error(`Executable not found: ${name}`);
}
export async function run(executable, args, { cwd, capture = true, timeout = 120000, env } = {}) {
  const resolved = await resolveExecutable(executable);
  let command = resolved;
  let commandArgs = args;
  let windowsVerbatimArguments = false;
  // Windows command shims require cmd.exe; reject shell metacharacters rather than interpolate them.
  if (process.platform === 'win32' && ['.cmd', '.bat'].includes(extname(resolved).toLowerCase())) {
    if ([resolved, ...args].some((value) => /["%\r\n&|<>^!]/.test(value)))
      throw new Error('Unsafe argument for Windows command shim');
    command = process.env.ComSpec || 'cmd.exe';
    windowsVerbatimArguments = true;
    commandArgs = [
      '/d',
      '/s',
      '/c',
      `"${[resolved, ...args].map((value) => `"${value}"`).join(' ')}"`,
    ];
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      windowsVerbatimArguments,
      cwd,
      env: { ...process.env, ...env },
      windowsHide: true,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeout);
    child.stdout?.on('data', (chunk) => {
      stdout += chunk;
      if (stdout.length > 20_000_000) child.kill();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) reject(new Error(`Command timed out: ${executable}`));
      else if (code !== 0)
        reject(new Error(`${executable} exited ${code}: ${stderr.slice(-3000)}`));
      else resolve({ stdout, stderr, code });
    });
  });
}
