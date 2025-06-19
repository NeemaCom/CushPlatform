#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start Express server
const expressServer = spawn('tsx', ['server/index.ts'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development' },
  cwd: __dirname
});

// Start Vite development server
const viteServer = spawn('vite', ['--port', '3000'], {
  stdio: 'inherit',
  cwd: __dirname
});

// Handle process cleanup
const cleanup = () => {
  console.log('\nShutting down servers...');
  expressServer.kill();
  viteServer.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

expressServer.on('close', (code) => {
  console.log(`Express server exited with code ${code}`);
  cleanup();
});

viteServer.on('close', (code) => {
  console.log(`Vite server exited with code ${code}`);
  cleanup();
});

console.log('Starting development servers...');
console.log('Express API server: http://localhost:5000');
console.log('Vite dev server: http://localhost:3000');