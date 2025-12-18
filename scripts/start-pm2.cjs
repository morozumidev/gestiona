#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const vars = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    if (!key) continue;
    const value = line.slice(eqIdx + 1).trim();
    vars[key] = value;
  }
  return vars;
}

const envVars = readEnv(envPath);
const appName = envVars.SSR_PM2_APP_NAME || 'gestiona-ssr';

function run(command, args, { ignoreError = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Failed to execute ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (!ignoreError && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result.status;
}

const deleteStatus = run('pm2', ['delete', appName], { ignoreError: true });
if (deleteStatus === 0) {
  console.log(`Removed previous PM2 process ${appName}`);
} else {
  console.log(`PM2 process ${appName} was not running (exit code ${deleteStatus}), continuing...`);
}

run('pm2', ['start', 'ecosystem.config.cjs']);
