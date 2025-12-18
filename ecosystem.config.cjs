const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '.env');

const envVars = (() => {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const vars = {};
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (!key) continue;
    vars[key] = value;
  }
  return vars;
})();

const prodEnv = {
  NODE_ENV: envVars.SSR_PROD_NODE_ENV || envVars.NODE_ENV || 'production',
  PORT: envVars.SSR_PROD_PORT || envVars.PORT || '8787',
};

const devEnv = {
  NODE_ENV: envVars.SSR_DEV_NODE_ENV || 'development',
  PORT: envVars.SSR_DEV_PORT || '4200',
};

const appName = envVars.SSR_PM2_APP_NAME || 'gestiona-ssr';

module.exports = {
  apps: [
    {
      name: appName,
      script: path.join(__dirname, 'dist/gestiona/server/server.mjs'),
      cwd: __dirname,
      autorestart: true,
      watch: false,
      env: prodEnv,
      env_development: devEnv,
    },
  ],
};
