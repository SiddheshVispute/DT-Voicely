import VapiPackage from "@vapi-ai/web";
import { formatSlot } from "../domain/time";

const Vapi = VapiPackage.default || VapiPackage;

export function extractVapiErrorMessage(err) {
  if (!err) return "Unable to establish voice connection.";
  if (typeof err === "string") return err;
  if (err.message && typeof err.message === "string") return err.message;
  if (err.error?.message && typeof err.error.message === "string") return err.error.message;
  if (typeof err.error === "string") return err.error;
  if (err.errorMsg && typeof err.errorMsg === "string") return err.errorMsg;
  if (err.stage === "daily" && err.error) return `Microphone / Telephony: ${err.error}`;
  try {
    const s = JSON.stringify(err);
    if (s && s !== "{}") return `Vapi: ${s.slice(0, 160)}`;
  } catch {}
  return "Vapi voice connection failed. Check your Public Client Key and Assistant ID in Settings.";
}

export function getVapiCredentials(config) {
  const envKey = import.meta.env.VITE_VAPI_PUBLIC_KEY || "";
  const envAssistant = import.meta.env.VITE_VAPI_ASSISTANT_ID || "";

  const publicKey = (config?.vapi?.publicKey || envKey).trim();
  const assistantId = (config?.vapi?.assistantId || envAssistant).trim();

  // Validate that credentials are not placeholder templates or invalid secret keys
  const isKeyValid = Boolean(
    publicKey &&
    !publicKey.startsWith("e.g.") &&
    !publicKey.includes("sk_vapi") &&
    publicKey.length > 8
  );

  const isAssistantValid = Boolean(
    assistantId &&
    !assistantId.startsWith("e.g.") &&
    assistantId.length > 4
  );

  return {
    publicKey,
    assistantId,
    isConfigured: isKeyValid && isAssistantValid,
    isPrivateSecretMisplaced: Boolean(publicKey && publicKey.includes("sk_vapi")),
  };
}

export function buildAssistantPrompt(config) {
  const servicesList = (config.services || [])
    .map((s) => `• ${s.name}: ${s.duration} minutes, ₹${s.price} (${s.description || "Service"})`)
    .join("\n");

  const faqsList = (config.agent?.faqs || [])
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const hoursList = Object.entries(config.hours || {})
    .map(([dayIndex, h]) => {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `${days[dayIndex]}: ${h.open ? `${h.start} to ${h.end}` : "Closed"}`;
    })
    .join(", ");

  return `You are ${config.agent?.name || "Maya"}, the voice receptionist for ${config.name} (${config.category || "Professional Business"}).
Location: ${config.address || "Main Office"}.
Contact phone: ${config.phone}. Timezone: ${config.timezone}.
Operating Hours: ${hoursList}.

OFFICIAL SERVICES & PRICING:
${servicesList}

FREQUENTLY ASKED QUESTIONS:
${faqsList || "No custom FAQs provided."}

YOUR RESPONSIBILITIES:
1. Greet callers warmly in a ${(config.agent?.tone || "Warm and professional").toLowerCase()} tone.
2. Answer inquiries accurately using only the official business services, prices, and FAQs above. Never invent services, prices, or operating hours.
3. If the customer wants to book an appointment:
   - Ask for their requested service and preferred date and time.
   - Use the 'check_availability' tool to confirm whether that slot is open. If unavailable, offer alternative slots.
   - Once the customer agrees on an available slot, collect their full name and contact phone number.
   - Re-confirm the appointment details with the customer.
   - Call the 'create_appointment' tool to record the confirmed booking.
4. If the customer is interested or has an enquiry but does NOT book immediately:
   - Ask for their name and phone or email so the business team can follow up.
   - Call the 'create_lead' tool to save their details and inquiry.
5. Be concise and conversational, suitable for a real-time voice call. Avoid long monologues.`;
}

export function createVapiVoice() {
  let vapi = null;
  let active = false;

  return {
    async startCall({
      config,
      onStatus = () => {},
      onTranscript = () => {},
      onVolume = () => {},
      onError = () => {},
      onToolCall = async () => {},
      onCallEnd = () => {},
    }) {
      const creds = getVapiCredentials(config);

      if (creds.isPrivateSecretMisplaced) {
        throw new Error(
          "You entered a private Vapi Secret Key (sk_vapi_...) in the Public Client Key field. Web browsers require your Vapi Public Key found in Vapi Dashboard -> API Keys."
        );
      }

      if (!creds.isConfigured) {
        throw new Error(
          "Vapi is not configured. Please provide your Vapi Public Client Key and Assistant ID in Settings, or use Voicely Built-in Voice Mode."
        );
      }

      onStatus("Connecting");

      try {
        vapi = new Vapi(creds.publicKey);

        // Track live transcript messages
        const liveMessages = [];

        vapi.on("call-start", () => {
          active = true;
          onStatus("Connected");
        });

        vapi.on("call-end", () => {
          active = false;
          onStatus("Ended");
          onCallEnd({ messages: liveMessages });
        });

        vapi.on("speech-start", () => {
          onStatus("Speaking");
        });

        vapi.on("speech-end", () => {
          onStatus("Listening");
        });

        vapi.on("volume-level", (volume) => {
          onVolume(Math.min(1, Math.max(0, volume || 0)));
        });

        vapi.on("message", async (msg) => {
          if (!msg) return;

          // Process speech transcripts
          if (msg.type === "transcript") {
            const role = msg.role === "assistant" ? "assistant" : "customer";
            const text = msg.transcript?.trim();
            if (text && msg.transcriptType === "final") {
              const item = {
                id: crypto.randomUUID(),
                role,
                text,
                at: new Date().toISOString(),
              };
              liveMessages.push(item);
              onTranscript(item, liveMessages);
            }
          }

          // Handle function/tool calls directly if emitted via Web SDK
          if (msg.type === "tool-calls" && Array.isArray(msg.toolCallList)) {
            for (const toolCall of msg.toolCallList) {
              try {
                const name = toolCall.function?.name;
                const args =
                  typeof toolCall.function?.arguments === "string"
                    ? JSON.parse(toolCall.function.arguments)
                    : toolCall.function?.arguments || {};

                const result = await onToolCall(name, args);

                if (vapi && active) {
                  vapi.send({
                    type: "add-message",
                    message: {
                      role: "tool",
                      toolCallId: toolCall.id,
                      result: JSON.stringify(result || { status: "ok" }),
                    },
                  });
                }
              } catch (toolErr) {
                console.error("Vapi tool execution error:", toolErr);
              }
            }
          }
        });

        vapi.on("error", (err) => {
          active = false;
          const msg = extractVapiErrorMessage(err);
          console.error("Vapi Web SDK error:", err);
          onError(msg);
          onStatus("Error");
        });

        // Assistant dynamic overrides
        const assistantOverrides = {};

        if (config.agent?.greeting) {
          assistantOverrides.firstMessage = config.agent.greeting
            .replaceAll("{business}", config.name || "our business")
            .replaceAll("{agent}", config.agent?.name || "Maya");
        }

        assistantOverrides.variableValues = {
          business: config.name || "our business",
          agent: config.agent?.name || "Maya",
          services: config.services?.map((s) => `${s.name} (${s.duration}m, ₹${s.price})`).join(", ") || "",
        };

        // Try start with overrides; if assistant does not accept overrides, fallback to clean start
        try {
          await vapi.start(creds.assistantId, assistantOverrides);
        } catch (startErr) {
          console.warn("Attempting direct Vapi start without overrides:", startErr);
          await vapi.start(creds.assistantId);
        }

        return vapi;
      } catch (err) {
        active = false;
        onStatus("Error");
        const message = extractVapiErrorMessage(err);
        onError(message);
        throw new Error(message);
      }
    },

    endCall() {
      active = false;
      if (vapi) {
        try {
          vapi.stop();
        } catch {
          /* ignore */
        }
        vapi = null;
      }
    },

    isActive() {
      return active;
    },
  };
}
