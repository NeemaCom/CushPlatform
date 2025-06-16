// Vercel serverless function entry point
import { createServer } from '../server/index.js';

let app;

export default async function handler(req, res) {
  if (!app) {
    app = await createServer();
  }
  
  return app(req, res);
}