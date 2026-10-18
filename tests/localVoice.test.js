import { it, expect } from "vitest";
import { resampleAudio } from "../src/services/localVoice";
it("preserves 16kHz samples without modifying audio", () => {
  const audio = Float32Array.from([0, 0.2, -0.4, 0.8]);
  expect(resampleAudio(audio, 16000)).toBe(audio);
});
it("resamples mono audio at its real input rate to the model rate", () => {
  const audio = Float32Array.from({ length: 48000 }, (_, i) =>
    Math.sin((i * 2 * Math.PI * 440) / 48000),
  );
  const result = resampleAudio(audio, 48000);
  expect(result).toHaveLength(16000);
  expect(
    Math.abs(result[1] - Math.sin((2 * Math.PI * 440) / 16000)),
  ).toBeLessThan(0.01);
  expect([...result].every(Number.isFinite)).toBe(true);
});
