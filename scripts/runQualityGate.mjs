import { spawn } from 'node:child_process';

const steps = [
  ['npm', ['run', 'index:de:check']],
  ['npm', ['run', 'format:check']],
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'check']],
  ['npm', ['test']],
  ['npm', ['run', 'build']],
  ['npm', ['run', 'build:pages']],
];

for (const [command, args] of steps) {
  await runStep(command, args);
}

async function runStep(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}`));
    });

    child.on('error', reject);
  });
}
