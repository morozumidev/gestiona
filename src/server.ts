// server.ts — detrás de Nginx (sin HTTPS en Node)
import express, { type RequestHandler } from 'express';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));         // ✅ en vez de import.meta.dirname
const browserDistFolder = resolve(__dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// si hay proxy (Nginx), confía en X-Forwarded-*
app.set('trust proxy', true);

// estáticos del build
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// SSR handler
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

// fallback por si alguna ruta no la toma el SSR
const fallback: RequestHandler = (_req, res) => {
  res.sendFile(join(browserDistFolder, 'index.html'));
};
app.use(fallback);

// levanta en HTTP (Nginx hace el TLS)
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const nodeEnv = (process.env['NODE_ENV'] ?? '').toLowerCase();
  const runningInPm2 = Boolean(process.env['pm_id']);
  const isProd = runningInPm2 || nodeEnv === 'production';
  const defaultPort = isProd ? 8787 : 4200;
  const port = Number(process.env['PORT'] ?? defaultPort);
  const host = '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`SSR listening on http://${host}:${port} (${isProd ? 'prod' : 'dev'})`);
  });
}

// opcional: para integraciones
export const reqHandler = createNodeRequestHandler(app);
