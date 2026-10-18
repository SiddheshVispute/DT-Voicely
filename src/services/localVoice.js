export function resampleAudio(input, sourceRate, targetRate = 16000) {
  if (sourceRate === targetRate) return input;
  const ratio = sourceRate / targetRate,
    output = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < output.length; i++) {
    const position = i * ratio,
      left = Math.floor(position),
      fraction = position - left;
    output[i] =
      input[left] * (1 - fraction) +
      (input[Math.min(left + 1, input.length - 1)] || 0) * fraction;
  }
  return output;
}
function timeout(promise, ms, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
export function createLocalVoice({
  onText,
  onStatus,
  onError,
  onLevel = () => {},
  onProgress = () => {},
}) {
  let worker,
    loading,
    context,
    ready = false,
    disposed = false,
    capture = null,
    generation = 0,
    requestId = 0;
  const pending = new Map();
  function ensureWorker() {
    if (worker) return;
    worker = new Worker(new URL("./transcription.worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      if (data.type === "progress") {
        onProgress({ state: "loading", ...data.progress });
        return;
      }
      const request = pending.get(data.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(data.id);
      data.type === "error"
        ? request.reject(new Error(data.error))
        : request.resolve(data);
    };
    worker.onerror = () => {
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(
          new Error(
            "The on-device speech worker could not start. Reload and retry.",
          ),
        );
      }
      pending.clear();
      loading = null;
      ready = false;
      worker.terminate();
      worker = null;
    };
  }
  function request(type, payload = {}) {
    ensureWorker();
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const timer = setTimeout(
        () => {
          pending.delete(id);
          reject(
            new Error(
              type === "load"
                ? "Voice setup took too long. Check your connection and retry; typing remains available."
                : "Transcription took too long. Try a shorter recording.",
            ),
          );
        },
        type === "load" ? 240000 : 90000,
      );
      pending.set(id, { resolve, reject, timer });
      worker.postMessage({ id, type, ...payload });
    });
  }
  async function prepare() {
    if (ready) return;
    if (!loading) {
      onProgress({ state: "loading", status: "initiate" });
      loading = request("load")
        .then(() => {
          ready = true;
          onProgress({ state: "ready" });
        })
        .catch((error) => {
          loading = null;
          onProgress({ state: "error", message: error.message });
          throw error;
        });
    }
    return loading;
  }
  function prime() {
    if (!context || context.state === "closed") {
      const API = window.AudioContext || window.webkitAudioContext;
      if (!API)
        throw new Error("This browser does not provide audio decoding.");
      context = new API();
    }
    context.resume().catch(() => {});
    return context;
  }
  function release(recording) {
    if (!recording) return;
    clearTimeout(recording.timeout);
    clearInterval(recording.meter);
    recording.source?.disconnect();
    recording.stream?.getTracks().forEach((track) => track.stop());
    onLevel(0);
  }
  async function cancel({ closeAudio = false } = {}) {
    generation++;
    const previous = capture;
    capture = null;
    if (previous) {
      previous.recorder.onstop = previous.recorder.ondataavailable = null;
      if (previous.recorder.state !== "inactive") previous.recorder.stop();
      release(previous);
    }
    if (closeAudio && context) {
      const old = context;
      context = null;
      await old.close().catch(() => {});
    }
  }
  async function transcribe(audio) {
    await prepare();
    return (await request("transcribe", { audio })).text;
  }
  function stopListening() {
    const recording = capture;
    if (!recording) return;
    capture = null;
    clearTimeout(recording.timeout);
    clearInterval(recording.meter);
    onStatus("Transcribing");
    recording.recorder.onstop = async () => {
      release(recording);
      if (disposed || recording.token !== generation) return;
      try {
        if (recording.peak < 0.004)
          throw new Error(
            "No audible speech was captured. Check your microphone input and try again.",
          );
        const encoded = await new Blob(recording.chunks, {
          type: recording.recorder.mimeType,
        }).arrayBuffer();
        const audio = await timeout(
          recording.context.decodeAudioData(encoded),
          15000,
          "The audio recording could not be decoded. Please retry.",
        );
        if (disposed || recording.token !== generation) return;
        const text = await transcribe(
          resampleAudio(audio.getChannelData(0), audio.sampleRate),
        );
        if (disposed || recording.token !== generation) return;
        if (!text || /^\s*(?:\[.*?\]|\(.*?\))\s*$/.test(text))
          throw new Error(
            "I couldn’t make out the words. Please try again or type your request.",
          );
        onStatus("Processing");
        onText(text);
      } catch (error) {
        if (recording.token === generation && !disposed) {
          onStatus("Unavailable");
          onError(error.message);
        }
      }
    };
    if (recording.recorder.state !== "inactive") recording.recorder.stop();
  }
  async function listen() {
    await cancel();
    const token = generation;
    let stream;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Microphone recording requires localhost or HTTPS.");
      if (!window.MediaRecorder)
        throw new Error(
          "This browser cannot record microphone audio. Try Browser recognition or use text.",
        );
      onStatus(ready ? "Connecting" : "Loading voice");
      await prepare();
      if (disposed || token !== generation) return;
      onStatus("Connecting");
      const streamPromise = navigator.mediaDevices
        .getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        })
        .then((value) => {
          if (token !== generation || disposed)
            value.getTracks().forEach((track) => track.stop());
          return value;
        });
      stream = await timeout(
        streamPromise,
        20000,
        "Microphone access is still waiting. Allow it in your browser, then press Start voice again.",
      );
      if (disposed || token !== generation) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const audioContext = prime();
      await timeout(
        audioContext.resume(),
        5000,
        "Audio is paused by your browser. Press Start voice again to unlock it.",
      );
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recorder = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream),
        source = audioContext.createMediaStreamSource(stream),
        analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const recording = {
        token,
        stream,
        recorder,
        source,
        context: audioContext,
        chunks: [],
        peak: 0,
        lastSpeech: 0,
        started: Date.now(),
        voiced: false,
      };
      capture = recording;
      recorder.ondataavailable = (event) => {
        if (event.data.size) recording.chunks.push(event.data);
      };
      recorder.onerror = () => {
        cancel();
        onStatus("Unavailable");
        onError(
          "Microphone recording failed. Please retry or type your request.",
        );
      };
      recorder.start(200);
      const samples = new Float32Array(analyser.fftSize);
      recording.meter = setInterval(() => {
        if (capture !== recording) return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const value of samples) sum += value * value;
        const rms = Math.sqrt(sum / samples.length),
          now = Date.now();
        recording.peak = Math.max(recording.peak, rms);
        onLevel(Math.min(1, rms * 12));
        if (rms > 0.012) {
          recording.voiced = true;
          recording.lastSpeech = now;
        }
        if (
          recording.voiced &&
          now - recording.lastSpeech > 1600 &&
          now - recording.started > 1000
        )
          stopListening();
      }, 80);
      recording.timeout = setTimeout(stopListening, 20000);
      onStatus("Listening");
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      if (token !== generation || disposed) return;
      await cancel();
      onStatus("Unavailable");
      onError(
        error.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access for this site, then retry. Typing is always available."
          : error.name === "NotFoundError"
            ? "No microphone was found. Connect one, or type your request."
            : `Could not start on-device voice: ${error.message}`,
      );
    }
  }
  return {
    prepare,
    prime,
    listen,
    stopListening,
    cancel,
    transcribe,
    get ready() {
      return ready;
    },
    dispose() {
      disposed = true;
      cancel({ closeAudio: true });
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error("Voice service disposed."));
      }
      pending.clear();
      worker?.terminate();
    },
  };
}
