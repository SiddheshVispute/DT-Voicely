import { env, pipeline } from "@huggingface/transformers";
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;
let transcriber;
async function load() {
  if (!transcriber)
    transcriber = pipeline(
      "automatic-speech-recognition",
      "onnx-community/whisper-tiny.en",
      {
        device: "wasm",
        dtype: "q8",
        progress_callback: (progress) =>
          self.postMessage({ type: "progress", progress }),
      },
    ).catch((error) => {
      transcriber = null;
      throw error;
    });
  return transcriber;
}
self.onmessage = async ({ data }) => {
  try {
    const model = await load();
    if (data.type === "load") {
      self.postMessage({ id: data.id, type: "ready" });
      return;
    }
    if (data.type === "transcribe") {
      const output = await model(data.audio, {
        max_new_tokens: 100,
        chunk_length_s: 20,
        stride_length_s: 3,
        return_timestamps: false,
      });
      self.postMessage({
        id: data.id,
        type: "transcript",
        text: output.text.trim(),
      });
    }
  } catch (error) {
    self.postMessage({ id: data.id, type: "error", error: error.message });
  }
};
