import express from 'express';
import { createServer } from 'http';
import path from 'path';

export async function setupNextJs(expressApp: express.Application) {
  // Serve static files
  expressApp.use(express.static(path.join(process.cwd(), 'public')));
  
  // Basic HTML template for React rendering
  const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cush - Global Immigration Services</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <link href="https://cdn.tailwindcss.com" rel="stylesheet">
</head>
<body>
    <div id="root">
        <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">Welcome to Cush</h1>
                    <p class="text-gray-600">Global Immigration Services Platform</p>
                </div>
                <div class="space-y-4">
                    <a href="/login" class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 block text-center">
                        Sign In
                    </a>
                    <a href="/dashboard" class="w-full border border-blue-600 text-blue-600 py-3 px-4 rounded-lg hover:bg-blue-50 transition duration-200 block text-center">
                        Dashboard
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

  // Serve main routes
  expressApp.get('/', (req, res) => {
    res.send(htmlTemplate);
  });

  expressApp.get('/login', (req, res) => {
    const loginTemplate = htmlTemplate.replace('Welcome to Cush', 'Sign In')
      .replace('Global Immigration Services Platform', 'Enter your credentials');
    res.send(loginTemplate);
  });

  expressApp.get('/dashboard', (req, res) => {
    const dashboardTemplate = htmlTemplate.replace('Welcome to Cush', 'Dashboard')
      .replace('Global Immigration Services Platform', 'Financial Overview');
    res.send(dashboardTemplate);
  });

  // Fallback for other routes
  expressApp.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
      res.send(htmlTemplate);
    }
  });

  return Promise.resolve();
}

export function createIntegratedServer(expressApp: express.Application) {
  return createServer(expressApp);
}