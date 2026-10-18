import { it, expect, vi, afterEach } from "vitest";
import { createSpeech, speechSupported } from "../src/services/speech";
const services = [];
afterEach(() => {
  for (const service of services.splice(0)) service.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function environment() {
  let recognizer;
  class Recognition {
    constructor() {
      recognizer = this;
    }
    start() {}
    abort() {}
  }
  const synthesis = { cancel: vi.fn(), speak: vi.fn() };
  vi.stubGlobal("window", {
    SpeechRecognition: Recognition,
    speechSynthesis: synthesis,
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(text) {
        this.text = text;
      }
    },
  );
  const onText = vi.fn(),
    onStatus = vi.fn(),
    onError = vi.fn(),
    service = createSpeech({ onText, onStatus, onError });
  services.push(service);
  return {
    service,
    onText,
    onStatus,
    onError,
    synthesis,
    get recognition() {
      return recognizer;
    },
  };
}
it("starts recognition only after listening is requested and deduplicates final results", () => {
  const e = environment();
  expect(e.recognition).toBeUndefined();
  e.service.listen();
  const callback = e.recognition.onresult;
  const result = Object.assign([{ transcript: "Book a consultation" }], {
    isFinal: true,
  });
  callback({ resultIndex: 0, results: [result, result] });
  callback({ resultIndex: 0, results: [result] });
  expect(e.onText).toHaveBeenCalledTimes(1);
  e.service.dispose();
});
it("stops recognition before speaking and cancels synthesis on disposal", () => {
  const e = environment();
  e.service.listen();
  const r = e.recognition;
  e.service.speak("Hello", true);
  expect(r.onresult).toBeNull();
  expect(e.synthesis.speak).toHaveBeenCalledTimes(1);
  e.service.dispose();
  expect(e.synthesis.cancel).toHaveBeenCalled();
});
it("explains permission and network failures", () => {
  const e = environment();
  e.service.listen();
  e.recognition.onerror({ error: "not-allowed" });
  expect(e.onError).toHaveBeenLastCalledWith(
    expect.stringContaining("permission was denied"),
  );
  e.service.listen();
  e.recognition.onerror({ error: "network" });
  expect(e.onError).toHaveBeenLastCalledWith(
    expect.stringContaining("offline"),
  );
});
it("keeps a clear text fallback when recognition is unavailable", () => {
  vi.stubGlobal("window", { speechSynthesis: { cancel() {} } });
  const onError = vi.fn();
  const s = createSpeech({ onText: vi.fn(), onStatus: vi.fn(), onError });
  expect(speechSupported()).toBe(false);
  s.listen();
  expect(onError).toHaveBeenCalledWith(
    expect.stringContaining("On-device voice"),
  );
});
it("reports Connecting until recognition actually starts", () => {
  const e = environment();
  e.service.listen();
  expect(e.onStatus).toHaveBeenLastCalledWith("Connecting");
  e.recognition.onstart();
  expect(e.onStatus).toHaveBeenLastCalledWith("Listening");
});
it("times out a recognizer that never starts instead of claiming to listen", () => {
  vi.useFakeTimers();
  const e = environment();
  e.service.listen();
  vi.advanceTimersByTime(8001);
  expect(e.onStatus).toHaveBeenLastCalledWith("Unavailable");
  expect(e.onError).toHaveBeenCalledWith(
    expect.stringContaining("did not start"),
  );
  expect(e.recognition.onresult).toBeNull();
});
it("times out a stalled recognition turn without creating a message", () => {
  vi.useFakeTimers();
  const e = environment();
  e.service.listen();
  e.recognition.onstart();
  vi.advanceTimersByTime(18001);
  expect(e.onError).toHaveBeenCalledWith(
    expect.stringContaining("No speech result"),
  );
  expect(e.onText).not.toHaveBeenCalled();
});
