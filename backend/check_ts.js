const { spawnSync } = require('child_process');
const { writeFileSync } = require('fs');
const { join } = require('path');

const result = spawnSync(
  'npx',
  ['tsc', '--noEmit', '--pretty', 'false'],
  {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 120000,
    shell: true
  }
);

const output = (result.stdout || '') + (result.stderr || '');
writeFileSync(join(__dirname, 'tsc_errors.txt'), output || '(no output)');

// Also write exit status
writeFileSync(join(__dirname, 'tsc_status.txt'), String(result.status));

if (result.error) {
  writeFileSync(join(__dirname, 'tsc_error_obj.txt'), result.error.message);
}

process.exit(0); // Always exit 0 so Bash captures output
