import {
  checkAvailability,
  createAppointmentAction,
  createLeadAction,
  rescheduleAppointmentAction,
  cancelAppointmentAction,
  saveCallSummaryAction,
} from "../domain/actions.js";
import { defaultConfig, validateConfig } from "../domain/config.js";

// In-memory server store for API/webhook handling in development
let serverState = {
  config: structuredClone(defaultConfig),
  appointments: [],
  conversations: [],
  confirmations: [],
  leads: [],
  customers: [],
};

export function getServerState() {
  return serverState;
}

export function setServerState(state) {
  serverState = state;
}

function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

export async function handleApiMiddleware(req, res, next) {
  if (!req.url?.startsWith("/api/")) {
    return next();
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-vapi-secret");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Health check endpoint
  if ((req.url === "/api/health" || req.url === "/api/health/") && req.method === "GET") {
    res.statusCode = 200;
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }

  try {
    // Helper to execute single function
    const executeFunction = (fnName, args) => {
      if (fnName === "check_availability") return checkAvailability(serverState, args);
      if (fnName === "create_appointment") return createAppointmentAction(serverState, { ...args, source: "vapi_voice" });
      if (fnName === "create_lead") return createLeadAction(serverState, { ...args, source: "vapi_voice" });
      if (fnName === "reschedule_appointment") return rescheduleAppointmentAction(serverState, args);
      if (fnName === "cancel_appointment") return cancelAppointmentAction(serverState, args);
      if (fnName === "save_call_summary") return saveCallSummaryAction(serverState, args);
      throw new Error(`Unrecognized function: ${fnName}`);
    };

    // 1. Direct tool execution endpoint
    if (req.url === "/api/vapi/tools" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const calls = body.message?.toolCalls || body.message?.toolCallList || body.toolCalls || body.toolCallList;

      if (Array.isArray(calls)) {
        const results = calls.map((call) => {
          const fnName = call.function?.name || call.name;
          const args = typeof call.function?.arguments === "string" ? JSON.parse(call.function.arguments) : (call.function?.arguments || call.parameters || {});
          try {
            return { toolCallId: call.id, result: JSON.stringify(executeFunction(fnName, args)) };
          } catch (err) {
            return { toolCallId: call.id, error: err.message };
          }
        });
        res.statusCode = 200;
        res.end(JSON.stringify({ results }));
        return;
      }

      const action = body.action || body.name || body.function?.name;
      const params = body.params || body.arguments || body.parameters || body;

      if (!action) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Missing action or toolCalls in request body." }));
        return;
      }

      try {
        const result = executeFunction(action, params);
        res.statusCode = 200;
        res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // 2. Vapi Webhook Endpoint (handles tool calls, end-of-call reports, and assistant requests)
    if (req.url === "/api/vapi/webhook" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const message = body.message || body;
      const calls = message.toolCallList || message.toolCalls;

      // Tool calls during call
      if (message.type === "tool-calls" && Array.isArray(calls)) {
        const results = calls.map((call) => {
          const fnName = call.function?.name || call.name;
          const args = typeof call.function?.arguments === "string" ? JSON.parse(call.function.arguments) : (call.function?.arguments || call.parameters || {});
          try {
            return { toolCallId: call.id, result: JSON.stringify(executeFunction(fnName, args)) };
          } catch (err) {
            return { toolCallId: call.id, error: err.message };
          }
        });

        res.statusCode = 200;
        res.end(JSON.stringify({ results }));
        return;
      }

      // End-of-call report & structured output
      if (message.type === "end-of-call-report") {
        const callData = message.call || {};
        const transcript = message.transcript || [];
        const summary = message.summary || "Call completed via Vapi.";
        const analysis = message.analysis || {};

        saveCallSummaryAction(serverState, {
          conversationId: callData.id || crypto.randomUUID(),
          vapiCallId: callData.id,
          caller: callData.customer?.name || callData.customer?.number || "Phone Caller",
          startedAt: callData.createdAt,
          endedAt: callData.endedAt,
          durationSeconds: callData.duration || 60,
          summary,
          transcript,
          outcome: analysis.structuredData?.outcome || "inquiry",
          leadData: analysis.structuredData?.lead || null,
          source: "vapi_voice",
        });

        res.statusCode = 200;
        res.end(JSON.stringify({ status: "ok", message: "Call report processed" }));
        return;
      }

      // Assistant request for incoming phone calls
      if (message.type === "assistant-request") {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            assistant: {
              firstMessage: serverState.config.agent.greeting
                .replaceAll("{business}", serverState.config.name)
                .replaceAll("{agent}", serverState.config.agent.name),
            },
          }),
        );
        return;
      }

      // Default webhook ack
      res.statusCode = 200;
      res.end(JSON.stringify({ status: "received" }));
      return;
    }

    // 3. Public business context for Website Widget
    if (req.url?.startsWith("/api/business/") && req.url.endsWith("/context")) {
      const safeConfig = {
        name: serverState.config.name,
        category: serverState.config.category,
        address: serverState.config.address,
        phone: serverState.config.phone,
        timezone: serverState.config.timezone,
        services: serverState.config.services,
        hours: serverState.config.hours,
        agent: {
          name: serverState.config.agent.name,
          greeting: serverState.config.agent.greeting,
          tone: serverState.config.agent.tone,
        },
        widget: serverState.config.widget,
      };

      res.statusCode = 200;
      res.end(JSON.stringify(safeConfig));
      return;
    }

    // 4. Fallback for other API routes
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Endpoint not found" }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message || "Internal server error" }));
  }
}
