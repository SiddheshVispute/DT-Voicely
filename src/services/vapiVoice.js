import VapiPackage from "@vapi-ai/web";
import { formatSlot } from "../domain/time.js";

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
    publicKey.length > 8,
  );

  const isAssistantValid = Boolean(
    assistantId &&
    !assistantId.startsWith("e.g.") &&
    assistantId.length > 4,
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
    .map(
      (s) =>
        `• ${s.name}: ${s.duration} minutes, ₹${s.price}${s.description ? ` - ${s.description}` : ""}`,
    )
    .join("\n");

  const faqsList = (config.agent?.faqs || [])
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hoursList = Object.entries(config.hours || {})
    .map(([dayIndex, h]) => `${days[dayIndex]}: ${h.open ? `${h.start} to ${h.end}` : "Closed"}`)
    .join(", ");

  const businessDescription =
    config.description ||
    config.agent?.prompt ||
    `Official ${config.category || "Professional Business"} providing quality services.`;

  return `You are ${config.agent?.name || "Dhruv"}, the voice AI receptionist for ${config.name}.

BUSINESS INFORMATION & CONTEXT:
• Establishment Name: ${config.name}
• Category / Industry: ${config.category || "Professional Services"}
• Business Description & Specialties: ${businessDescription}
• Address / Location: ${config.address || "Main Facility"}
• Contact Phone: ${config.phone || "Not specified"}
• Contact Email: ${config.email || "Not specified"}
• Timezone: ${config.timezone || "Asia/Kolkata"}
• Operating Hours: ${hoursList}

SERVICES OFFERED & PRICING:
${servicesList}

FREQUENTLY ASKED QUESTIONS:
${faqsList || "No specific FAQs provided."}

YOUR RESPONSIBILITIES AS RECEPTIONIST:
1. Greet callers warmly as ${config.agent?.name || "Dhruv"}, virtual receptionist for ${config.name}.
2. Accurately explain the business description, services offered, pricing, opening hours, and location based on the above information. Never invent fake services or hours.
3. If the customer wants to book an appointment:
   - Ask which service they want.
   - Ask for their preferred date and time.
   - Confirm their full name and phone number.
   - Call the 'create_appointment' tool to record and schedule the appointment in the booking calendar.
   - Give the caller a clear confirmation with their service name, date, and time.
4. If the customer does not book immediately, collect their name and contact info and call 'create_lead' to save their inquiry.
5. Keep answers natural, friendly, concise, and suitable for phone conversations.`;
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
          "You entered a private Vapi Secret Key (sk_vapi_...) in the Public Client Key field. Web browsers require your Vapi Public Key found in Vapi Dashboard -> API Keys.",
        );
      }

      if (!creds.isConfigured) {
        throw new Error(
          "Vapi is not configured. Please provide your Vapi Public Client Key and Assistant ID in Settings, or use Voicely Built-in Voice Mode.",
        );
      }

      onStatus("Connecting");

      try {
        vapi = new Vapi(creds.publicKey);

        // Track live transcript messages
        const liveMessages = [];

        const systemPrompt = buildAssistantPrompt(config);

        // Assistant dynamic overrides tailored to the 5-step business profile
        const greeting = config.agent?.greeting
          ? config.agent.greeting
              .replaceAll("{business}", config.name || "our business")
              .replaceAll("{agent}", config.agent?.name || "Dhruv")
          : `Hello! Welcome to ${config.name || "our business"}. I'm ${config.agent?.name || "Dhruv"}, your AI receptionist. How can I help you today?`;

        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const hoursList = Object.entries(config.hours || {})
          .map(([dayIndex, h]) => `${days[dayIndex]}: ${h.open ? `${h.start} to ${h.end}` : "Closed"}`)
          .join(", ");

        const businessOverview =
          config.description ||
          config.agent?.prompt ||
          `Official ${config.category || "Professional Business"} providing quality services.`;

        const assistantOverrides = {
          firstMessage: greeting,
          variableValues: {
            businessName: config.name || "",
            businessCategory: config.category || "",
            businessDescription: businessOverview,
            business_description: businessOverview,
            businessOverview: businessOverview,
            business_overview: businessOverview,
            businessAddress: config.address || "",
            address: config.address || "",
            businessPhone: config.phone || "",
            phone: config.phone || "",
            businessHours: hoursList,
            hours: hoursList,
            services: (config.services || [])
              .map((s) => `${s.name} (${s.duration}m, ₹${s.price}${s.description ? `: ${s.description}` : ""})`)
              .join("; "),
            agentName: config.agent?.name || "Dhruv",
            context: systemPrompt,
            systemPrompt: systemPrompt,
            business_context: systemPrompt,
          },
        };

        vapi.on("call-start", () => {
          active = true;
          onStatus("Connected");
          // Send the full business context into the Vapi LLM context on call start
          const injectPrompt = () => {
            if (!active || !vapi) return;
            try {
              vapi.send({
                type: "add-message",
                message: {
                  role: "system",
                  content: systemPrompt,
                },
                triggerResponseEnabled: false,
              });
            } catch (sysErr) {
              console.warn("Notice: Could not inject system prompt on call-start:", sysErr);
            }
          };

          injectPrompt();
          // Ensure receipt after WebRTC data channel handshake
          setTimeout(injectPrompt, 350);
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

        // Track volume from both the remote assistant and local microphone
        vapi.on("volume-level", (volume) => {
          onVolume(Math.min(1, Math.max(0, volume || 0)));
        });

        vapi.on("local-volume-level", (volume) => {
          onVolume(Math.min(1, Math.max(0, volume || 0)));
        });

        // Ensure audio element auto-plays on arrival
        vapi.on("audio", (player) => {
          if (player && typeof player.play === "function") {
            player.play().catch((playErr) => console.warn("Vapi audio play note:", playErr));
          }
        });

        vapi.on("message", async (msg) => {
          if (!msg) return;

          // 1. Process speech transcripts
          if (msg.type === "transcript") {
            const role = msg.role === "assistant" || msg.role === "bot" ? "assistant" : "customer";
            const text = msg.transcript?.trim();
            if (text && (msg.transcriptType === "final" || msg.transcriptType === "partial")) {
              if (msg.transcriptType === "final") {
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
          }

          // 2. Process conversation updates
          if (msg.type === "conversation-update" && Array.isArray(msg.messages)) {
            const formatted = msg.messages
              .filter((m) => m.role === "assistant" || m.role === "user")
              .map((m) => ({
                id: crypto.randomUUID(),
                role: m.role === "assistant" ? "assistant" : "customer",
                text: m.content || m.message || "",
                at: new Date().toISOString(),
              }))
              .filter((m) => Boolean(m.text));

            if (formatted.length > liveMessages.length) {
              liveMessages.length = 0;
              liveMessages.push(...formatted);
              onTranscript(liveMessages[liveMessages.length - 1], liveMessages);
            }
          }

          // 3. Handle function/tool calls emitted via Web SDK
          const toolCallList = msg.toolCallList || msg.toolCalls;
          if ((msg.type === "tool-calls" || msg.type === "tool-call") && Array.isArray(toolCallList)) {
            for (const toolCall of toolCallList) {
              try {
                const name = toolCall.function?.name || toolCall.name;
                const args =
                  typeof toolCall.function?.arguments === "string"
                    ? JSON.parse(toolCall.function.arguments)
                    : toolCall.function?.arguments || toolCall.parameters || {};

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

        // Start the assistant with business profile overrides; if locked, fallback to clean start
        try {
          await vapi.start(creds.assistantId, assistantOverrides);
        } catch (overrideErr) {
          console.warn("Attempting direct Vapi start without overrides:", overrideErr);
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
