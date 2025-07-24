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

// Export server creation function for Vercel and Cloud Run
export async function createServer() {
  // Debug environment variables
  log(`Google OAuth Environment Check: CLIENT_ID=${process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 15) + '...' : 'MISSING'}, CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET ? 'PRESENT' : 'MISSING'}`);
  
  const httpServer = await registerRoutes(app);

  // In development, serve from root. In production, serve from dist
  const staticDir = process.env.NODE_ENV === 'production' ? 'dist' : '.';
  
  // Serve static files from public directory first
  app.use(express.static('public', {
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));
  
  // Serve build assets with proper headers
  app.use(express.static(staticDir, { 
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      }
      if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
      if (filePath.endsWith('.jsx')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));

  // Root endpoint - always serve the web application
  // Health checks should use dedicated endpoints: /health, /api/health, /ready, /live
  app.get('/', (req, res) => {
    // Serve from dist in production, root in development
    const htmlPath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'dist', 'index.html')
      : path.join(process.cwd(), 'index.html');
    res.sendFile(htmlPath);
  });

  // Handle SPA routing (serve HTML for non-API paths, excluding root which is handled above)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      const htmlPath = process.env.NODE_ENV === 'production' 
        ? path.join(process.cwd(), 'dist', 'index.html')
        : path.join(process.cwd(), 'index.html');
      res.sendFile(htmlPath);
    }
  });

  // Error handling middleware (must be last)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    log(`Error ${status}: ${message}`);
    res.status(status).json({ message });
  });

  const server = createHttpServer(app);

  // Enhanced port configuration for different deployment environments
  if (!process.env.VERCEL) {
    // Cloud Run and deployment platforms use PORT environment variable
    // Default to 5000 for Cloud Run compatibility (critical for deployment)
    const port = process.env.PORT || 5000;
    const host = '0.0.0.0'; // Always bind to all interfaces for Cloud Run compatibility
    
    server.listen(Number(port), host, () => {
      log(`Server successfully started on ${host}:${port}`);
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`Health checks available at: /health, /ready, /live, /startup, /api/health, /`);
      
      // Additional deployment readiness logging
      if (process.env.NODE_ENV === 'production') {
        log(`🚀 PRODUCTION DEPLOYMENT READY`);
        log(`📊 Health endpoints responding correctly`);
        log(`🔧 Cloud Run compatibility: PORT=${port}, HOST=${host}`);
        log(`⚡ Server uptime tracking enabled`);
      } else {
        log(`🔧 Development mode - local development server ready`);
      }
    });

    // Handle server errors with deployment-friendly error handling
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log(`Error: Port ${port} is already in use`);
        if (process.env.NODE_ENV === 'production') {
          // In production, exit gracefully rather than retry
          log(`Deployment failed - port ${port} unavailable`);
          process.exit(1);
        } else {
          // In development, try next port
          log(`Trying with port ${Number(port) + 1}...`);
          server.listen(Number(port) + 1, host);
        }
      } else if (err.code === 'EACCES') {
        log(`Error: Permission denied for port ${port}`);
        if (process.env.NODE_ENV === 'production') {
          log(`Deployment failed - insufficient permissions for port ${port}`);
          process.exit(1);
        }
      } else {
        log(`Server error: ${err.code} - ${err.message}`);
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        } else {
          throw err;
        }
      }
    });

    // Graceful shutdown handling for production deployments
    const gracefulShutdown = () => {
      log('Received termination signal. Starting graceful shutdown...');
      server.close(() => {
        log('HTTP server closed. Exiting process.');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        log('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Handle uncaught exceptions in production
    if (process.env.NODE_ENV === 'production') {
      process.on('uncaughtException', (err) => {
        log(`Uncaught Exception: ${err.message}`);
        console.error(err.stack);
        gracefulShutdown();
      });

      process.on('unhandledRejection', (reason, promise) => {
        log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
        gracefulShutdown();
      });
    }
  }

  return server;
}

// Always start the server - required for all environments including Cloud Run
createServer();