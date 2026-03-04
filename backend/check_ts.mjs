import { spawnSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['tsc', '--noEmit', '--pretty', 'false'],
  {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 60000,
    shell: false
  }
);

const output = (result.stdout || '') + (result.stderr || '');
writeFileSync(join(__dirname, 'tsc_errors.txt'), output);

console.log('EXIT STATUS:', result.status);
console.log('OUTPUT:');
console.log(output || '(empty)');
if (result.error) {
  console.log('ERROR:', result.error.message);
}
