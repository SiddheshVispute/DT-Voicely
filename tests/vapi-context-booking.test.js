import { describe, it, expect } from "vitest";
import { buildAssistantPrompt } from "../src/services/vapiVoice.js";
import { parseDetails } from "../src/domain/conversation.js";
import { createLocalRepository } from "../src/data/localRepository.js";
import { defaultConfig } from "../src/domain/config.js";
import { memoryStorage } from "./helpers.js";

describe("Vapi Business Context & Post-Conversation Booking", () => {
  it("buildAssistantPrompt includes full 5-step business context", () => {
    const config = {
      ...defaultConfig,
      name: "Apex Physical Therapy",
      category: "Physical Therapy & Rehabilitation",
      description: "Specializing in sports injury recovery, deep tissue therapy, and posture correction.",
      address: "100 Market St, San Francisco, CA",
      phone: "+1 (555) 987-6543",
      services: [
        {
          id: "srv-eval",
          name: "Initial Assessment",
          duration: 45,
          price: 120,
          description: "Full orthopedic assessment.",
        },
      ],
      agent: {
        name: "Dhruv",
        greeting: "Hello, welcome to Apex Physical Therapy! I am Dhruv.",
        faqs: [
          {
            id: "faq-insurance",
            question: "Do you take insurance?",
            answer: "We accept most major health insurance providers.",
          },
        ],
      },
    };

    const prompt = buildAssistantPrompt(config);

    // Business Overview & Description
    expect(prompt).toContain("Apex Physical Therapy");
    expect(prompt).toContain("Physical Therapy & Rehabilitation");
    expect(prompt).toContain("Specializing in sports injury recovery");
    expect(prompt).toContain("100 Market St, San Francisco, CA");
    expect(prompt).toContain("+1 (555) 987-6543");

    // Services
    expect(prompt).toContain("Initial Assessment");
    expect(prompt).toContain("45 minutes");
    expect(prompt).toContain("₹120");
    expect(prompt).toContain("Full orthopedic assessment.");

    // FAQs
    expect(prompt).toContain("Do you take insurance?");
    expect(prompt).toContain("We accept most major health insurance providers.");

    // Responsibilities
    expect(prompt).toContain("create_appointment");
    expect(prompt).toContain("Dhruv");
  });

  it("extracts booking details from post-conversation transcript and books appointment", async () => {
    const repo = createLocalRepository(memoryStorage());
    const snap = await repo.getSnapshot();

    const sampleTranscript = [
      { role: "assistant", text: "Hello! Welcome to Willow Wellness. I'm Dhruv. How can I help you today?" },
      { role: "customer", text: "Hi, I'd like to book a consultation tomorrow at 10:00 AM." },
      { role: "assistant", text: "I can help with that. What is your full name and phone number?" },
      { role: "customer", text: "My name is Samantha Reed and my number is 555-888-9999." },
      { role: "assistant", text: "Great! Your consultation is confirmed for Samantha Reed tomorrow at 10:00 AM. See you then!" },
    ];

    const fullTranscript = sampleTranscript.map((m) => m.text).join("\n");
    const parsed = parseDetails(fullTranscript, snap.config);

    expect(parsed.serviceId).toBe("consultation");
    expect(parsed.customer).toBe("Samantha Reed");
    expect(parsed.phone).toBe("555-888-9999");
    expect(parsed.time).toBe("10:00");
    expect(parsed.date).toBeDefined();

    // Book into the repository
    const appt = await repo.book({
      serviceId: parsed.serviceId,
      date: parsed.date,
      time: parsed.time,
      customer: parsed.customer,
      phone: parsed.phone,
      source: "vapi_voice",
    });

    expect(appt.reference).toMatch(/^VC-[a-f0-9]{8}$/i);
    expect(appt.customer).toBe("Samantha Reed");
    expect(appt.status).toBe("confirmed");

    // Verify it is present in the schedule/appointments list
    const updated = await repo.getSnapshot();
    const found = updated.appointments.find((a) => a.id === appt.id);
    expect(found).toBeDefined();
    expect(found.customer).toBe("Samantha Reed");
    expect(found.serviceName).toBe("Consultation");
  });

  it("handles alias function names in checkAvailability and book", async () => {
    const repo = createLocalRepository(memoryStorage());
    const snap = await repo.getSnapshot();

    // Check availability at an open slot
    const avail = repo.checkAvailability({
      serviceId: "consultation",
      date: "tomorrow",
      time: "03:00 PM",
    });
    expect(avail.available).toBe(true);

    // Book using service name and 12-hour time
    const appt = await repo.book({
      service: "Consultation",
      date: "tomorrow",
      time: "03:00 PM",
      name: "Marcus Vance",
      phone: "+1 555 123 4567",
      source: "vapi_voice",
    });
    expect(appt.customer).toBe("Marcus Vance");
    expect(appt.start).toBeDefined();
    expect(appt.status).toBe("confirmed");
  });
});
