import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import fs from 'fs';
import https from 'https';

const browserDistFolder = join(import.meta.dirname, '../browser');
const app = express();
const angularApp = new AngularNodeAppEngine();

// Si en el futuro pones detrás de proxy, esto ayuda
app.set('trust proxy', true);

// Archivos estáticos
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

// Angular SSR handler
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

// Servidor HTTPS en 8787
if (isMainModule(import.meta.url)) {
  const httpsOptions = {
    key: fs.readFileSync('certificate/key.pem'),
    cert: fs.readFileSync('certificate/cert.pem'),
  };

  https.createServer(httpsOptions, app).listen(8787, '0.0.0.0', () => {
    console.log('Servidor HTTPS activo en https://hcpboca.ddns.net:8787');
  });
}

export const reqHandler = createNodeRequestHandler(app);
