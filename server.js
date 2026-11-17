import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { handleApiMiddleware } from "./src/server/vapiMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Automatically load .env if present using native Node.js loader
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(envPath);
    console.log(`Loaded environment from ${envPath}`);
  } catch (err) {
    console.warn(`Notice: Unable to parse .env file: ${err.message}`);
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const distPath = path.join(__dirname, "dist");

// Configure CORS
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(
  cors({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);

// Parse JSON body for incoming requests
app.use(express.json());

// API Middleware (handles /api/vapi/tools, /api/vapi/webhook, /api/business/:id/context, /api/health, /api/info)
app.use(handleApiMiddleware);

// Serve static frontend assets built by Vite
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Health check endpoint for Render / monitoring / cloud balancers
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "voicely-backend",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Single Page Application (SPA) fallback - all non-API GET requests serve index.html
app.use((req, res, next) => {
  if (req.method !== "GET") return next();
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send("Voicely backend running. Run 'npm run build' to generate the static frontend.");
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`\n========================================`);
  console.log(`  Voicely Backend Server Started`);
  console.log(`========================================`);
  console.log(`- Local URL:     http://localhost:${PORT}`);
  console.log(`- Health Check:  http://localhost:${PORT}/health`);
  console.log(`- API Info:      http://localhost:${PORT}/api/info`);
  console.log(`- Vapi Tools:    http://localhost:${PORT}/api/vapi/tools`);
  console.log(`- Vapi Webhook:  http://localhost:${PORT}/api/vapi/webhook`);
  console.log(`- Node Env:      ${process.env.NODE_ENV || "development"}`);
  console.log(`========================================\n`);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server stopped.");
    process.exit(0);
  });
});
