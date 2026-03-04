#!/usr/bin/env node
'use strict';
const { spawnSync } = require('child_process');
const { writeFileSync } = require('fs');

// Use .cmd on Windows for npx
const isWin = process.platform === 'win32';
const result = spawnSync(
  isWin ? 'npx.cmd' : 'npx',
  ['tsc', '--noEmit', '--pretty', 'false'],
  {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 120000,
    shell: true,
    windowsHide: true
  }
);

const stdout = result.stdout || '';
const stderr = result.stderr || '';
const combined = stdout + stderr;

writeFileSync(__dirname + '/tsc_result.txt', combined || '(empty output)\nStatus: ' + result.status);

if (result.error) {
  writeFileSync(__dirname + '/tsc_spawn_error.txt', String(result.error));
}

// Write exit code to separate file
writeFileSync(__dirname + '/tsc_exit_code.txt', String(result.status));
