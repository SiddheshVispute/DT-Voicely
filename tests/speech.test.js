import { it, expect, vi, afterEach } from "vitest";
import { createSpeech, speechSupported } from "../src/services/speech";
afterEach(() => vi.unstubAllGlobals());
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
    expect.stringContaining("text conversation"),
  );
});
