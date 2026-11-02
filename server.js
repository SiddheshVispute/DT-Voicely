import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import { handleApiMiddleware } from "./src/server/vapiMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, "dist");

// Enable CORS for API routes
app.use(cors());

// Parse JSON body for incoming requests
app.use(express.json());

// API Middleware (handles /api/vapi/tools, /api/vapi/webhook, /api/business/:id/context, /api/health)
app.use(handleApiMiddleware);

// Serve static frontend assets built by Vite
app.use(express.static(distPath));

// Health check endpoint for Render / monitoring
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "voicely", timestamp: new Date().toISOString() });
});

// Single Page Application (SPA) fallback - all non-API GET requests serve index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Voicely server running on http://0.0.0.0:${PORT}`);
  console.log(`- Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`- API tools:    http://0.0.0.0:${PORT}/api/vapi/tools`);
  console.log(`- API webhook:  http://0.0.0.0:${PORT}/api/vapi/webhook`);
});

