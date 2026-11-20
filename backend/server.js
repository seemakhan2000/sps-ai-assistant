
import http from "node:http";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";

import authRoutes from "./routes/auth.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import documentRoutes from "./routes/document.routes.js";
import modelRoutes from "./routes/model.routes.js";
import answerRoutes from "./routes/Answer.routes.js";

import {
  notFound,
  errorHandler
} from "./middleware/error.middleware.js";

import { initializeSockets } from "./sockets/index.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = new Set(
  [
    env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    ...(env.FRONTEND_URLS || "").split(",")
  ]
    .map((url) => url?.trim().replace(/\/$/, ""))
    .filter(Boolean)
);

// Allow Vercel production and preview deployments
const isAllowedVercelPreview = (origin) => {
  return /^https:\/\/sps-ai-assistant(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(
    origin
  );
};

const corsOptions = {
  origin(origin, callback) {
    const normalizedOrigin = origin?.replace(/\/$/, "");

    if (
      !origin ||
      allowedOrigins.has(normalizedOrigin) ||
      isAllowedVercelPreview(normalizedOrigin)
    ) {
      return callback(null, true);
    }

    console.error("Blocked CORS origin:", origin);

    return callback(
      new Error("Origin not allowed by CORS.")
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS"
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization"
  ]
};

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(helmet());
app.use(compression());

app.use(cors(corsOptions));

app.use(express.json({
  limit: "1mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "1mb"
}));

app.use(cookieParser());

// ==========================================
// RATE LIMITING
// ==========================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    application: "SPS AI Assistant API",
    status: "healthy",
    environment: env.NODE_ENV
  });
});

// ==========================================
// API ROUTES
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/models", modelRoutes);
app.use("/api", answerRoutes);

// ==========================================
// ROOT ROUTE
// ==========================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SPS AI Assistant API is running"
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

app.use(notFound);
app.use(errorHandler);

// ==========================================
// DATABASE CONNECTION REUSE
// ==========================================

let databaseConnection;

async function connectToDatabase() {
  if (!databaseConnection) {
    databaseConnection = connectDatabase().catch((error) => {
      databaseConnection = null;
      throw error;
    });
  }

  return databaseConnection;
}

// ==========================================
// LOCAL DEVELOPMENT SERVER
// ==========================================

if (process.env.NODE_ENV !== "production") {
  const httpServer = http.createServer(app);

  initializeSockets(httpServer);

  async function startServer() {
    try {
      await connectToDatabase();

      httpServer.listen(env.PORT, () => {
        console.log(
          `SPS API running on http://localhost:${env.PORT}`
        );
      });
    } catch (error) {
      console.error("Server startup failed:", error);

      process.exit(1);
    }
  }

  startServer();

  async function shutdown() {
    console.log("Shutting down SPS API...");

    httpServer.close(async () => {
      try {
        const mongoose = await import("mongoose");

        await mongoose.default.disconnect();
      } finally {
        process.exit(0);
      }
    });
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// ==========================================
// VERCEL SERVERLESS HANDLER
// ==========================================

export default async function handler(req, res) {
  try {
    await connectToDatabase();

    return app(req, res);
  } catch (error) {
    console.error("Database connection error:", error);

    return res.status(503).json({
      success: false,
      message: "Database connection failed"
    });
  }
}
