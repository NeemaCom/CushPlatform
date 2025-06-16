import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServer } from '../server/index.js';

let app: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    app = await createServer();
  }
  
  // Handle the request with the Express app
  app(req, res);
}