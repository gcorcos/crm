const { spawnSync } = require('child_process');
const fs = require('fs');
const result = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
  cwd: __dirname,
  shell: true,
  encoding: 'utf8',
  timeout: 60000
});
const output = (result.stdout || '') + (result.stderr || '');
fs.writeFileSync(__dirname + '/tsc_output.txt', output);
console.log('Status:', result.status);
console.log(output);
