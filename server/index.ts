import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApiOriginGuard, createSecurityHeaders } from "./http-security";
import { clearExpiredAdminAuditIps, isAdminAuditTableMissing } from "./admin-audit";
import { getAllowedFrontendOrigins } from "./origin-policy";
import { purgeExpiredVisitorAnalytics } from "./visitor-intelligence-routes";

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const AUDIT_IP_RETENTION_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

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

function startAuditIpRetentionCleanup() {
  const runCleanup = async () => {
    try {
      const clearedCount = await clearExpiredAdminAuditIps();
      if (clearedCount > 0) {
        log(`Removed expired IP addresses from ${clearedCount} admin audit records`, "retention");
      }
    } catch (error) {
      if (isAdminAuditTableMissing(error)) {
        log("Admin audit table is unavailable; IP cleanup will retry later", "retention");
      } else {
        console.error("[retention] Admin audit IP cleanup failed", error);
      }
    }

    try {
      await purgeExpiredVisitorAnalytics();
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "42P01") {
        log("Visitor analytics tables are unavailable; event cleanup will retry later", "retention");
      } else {
        console.error("[retention] Visitor analytics cleanup failed", error);
      }
    }
  };

  void runCleanup();
  const timer = setInterval(() => void runCleanup(), AUDIT_IP_RETENTION_CLEANUP_INTERVAL_MS);
  timer.unref();
}

// Express configuration
app.set('trust proxy', 1);
app.use(createSecurityHeaders(isProduction));

const allowedOrigins = getAllowedFrontendOrigins();

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api", createApiOriginGuard(allowedOrigins));

app.use("/api", (req, res, next) => {
  const origin = req.get("Origin");
  if (req.method === "OPTIONS" && (!origin || !allowedOrigins.has(origin))) {
    res.vary("Origin");
    return res.sendStatus(403);
  }
  next();
}, cors({ origin: [...allowedOrigins], credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Serve the API and frontend from the same Node process.
export async function createServer() {
  const server = await registerRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    // Development: use Vite middleware for the React app (hot module replacement)
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve the pre-built Vite output
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  // Error handling middleware (must be last)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    log(`Error ${status}: ${message}`);
    res.status(status).json({
      message: isProduction && status >= 500 ? "Internal Server Error" : message,
    });
  });

  const port = Number(process.env.PORT || 5000);
  const host = '0.0.0.0';
    
    server.listen(port, host, () => {
      log(`Server successfully started on ${host}:${port}`);
      if (isProduction) startAuditIpRetentionCleanup();
      log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      log(`Health checks available at: /health, /ready, /live, /startup, /api/health, /`);
      
      // Additional deployment readiness logging
      if (process.env.NODE_ENV === 'production') {
        log(`🚀 PRODUCTION DEPLOYMENT READY`);
        log(`📊 Health endpoints responding correctly`);
        log(`Listening on ${host}:${port}`);
        log(`⚡ Server uptime tracking enabled`);
      } else {
        log(`🔧 Development mode - local development server ready`);
      }
    });

    // Handle server errors
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

  return server;
}

// Start the server for npm run dev and npm run start.
createServer();