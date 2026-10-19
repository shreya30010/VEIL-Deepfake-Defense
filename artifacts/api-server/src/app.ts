import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "./lib/auth";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Helmet security headers (configured to permit local embedded assets & Vite dev)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(authMiddleware);

// Rate limiting on /api/auth/* (brute-force defense)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Too many authentication requests. Please try again after 15 minutes.",
  },
});

// Rate limiting on /api/detect/analyze
const detectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "TooManyRequests",
    message: "Detection analysis rate limit exceeded. Please wait a moment before sending more media.",
  },
});

app.use("/api/auth", authLimiter);
app.use("/api/detect/analyze", detectLimiter);

app.use("/api", router);

// 404 JSON fallback handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    statusCode: 404,
  });
});

// Global JSON error handler (400, 413, 500)
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ err, url: req.url }, "Request processing error");

    if (err.name === "ZodError" || err.issues) {
      return res.status(400).json({
        error: "ValidationError",
        message: "Request validation failed",
        statusCode: 400,
        details: err.issues || err.errors,
      });
    }

    if (err.type === "entity.too.large") {
      return res.status(413).json({
        error: "PayloadTooLarge",
        message: "Uploaded file or payload exceeds the allowed size limit (15MB)",
        statusCode: 413,
      });
    }

    const statusCode =
      typeof err.status === "number"
        ? err.status
        : typeof err.statusCode === "number"
          ? err.statusCode
          : 500;

    return res.status(statusCode).json({
      error: err.name || "InternalServerError",
      message: err.message || "An unexpected internal server error occurred",
      statusCode,
    });
  },
);

export default app;
