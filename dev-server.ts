import { spawn } from 'child_process';
import path from 'path';

async function startDevServers() {
  console.log('Starting development servers...');
  
  // Start Express API server
  const apiServer = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  // Start Vite dev server after a short delay
  setTimeout(() => {
    const viteServer = spawn('npx', ['vite', '--port', '3000', '--host', '0.0.0.0'], {
      cwd: process.cwd(),
      stdio: 'inherit'
    });

    viteServer.on('error', (err) => {
      console.error('Vite server error:', err);
    });
  }, 2000);

  apiServer.on('error', (err) => {
    console.error('API server error:', err);
  });

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\nShutting down development servers...');
    apiServer.kill();
    process.exit(0);
  });
}

startDevServers();