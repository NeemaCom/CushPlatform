import express from 'express';
import next from 'next';
import { createServer } from 'http';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: '.' });
const handle = nextApp.getRequestHandler();

export async function setupNextJs(expressApp: express.Application) {
  await nextApp.prepare();

  // Handle all other routes with Next.js
  expressApp.all('*', (req, res) => {
    return handle(req, res);
  });

  return nextApp;
}

export function createIntegratedServer(expressApp: express.Application) {
  return createServer(expressApp);
}