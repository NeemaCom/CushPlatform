import express, { type Request, Response, NextFunction } from "express";
import { createServer as createHttpServer } from "http";
import { registerRoutes } from "./routes";
import path from "path";

const app = express();

// Logging function
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Express configuration
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

// Export server creation function for Vercel
export async function createServer() {
  const httpServer = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  // Serve static files directly
  app.use(express.static('.', {
    setHeaders: (res, path) => {
      if (path.endsWith('.js') || path.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (path.endsWith('.ts') || path.endsWith('.tsx')) {
        res.setHeader('Content-Type', 'text/javascript');
      }
    }
  }));

  // Handle SPA routing
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(process.cwd(), 'index.html'));
    }
  });

  const server = createHttpServer(app);

  // Serve on port 5000 for compatibility with workflow
  if (!process.env.VERCEL) {
    const port = process.env.PORT || 5000;
    server.listen(Number(port), "0.0.0.0", () => {
      log(`serving on port ${port}`);
    });
  }

  return server;
}

// Start the server in development mode
if (process.env.NODE_ENV === 'development') {
  createServer();
}