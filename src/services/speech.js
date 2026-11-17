export const speechSupported = () =>
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export function createSpeech({
  onText,
  onStatus,
  onError,
  onInterim = () => {},
  onPlaybackError = onError,
  onLevel = () => {},
}) {
  let recognition = null;
  let disposed = false;
  let recognitionSession = 0;
  let speechSession = 0;
  let connectTimer = null;
  let turnTimer = null;
  let speechTimer = null;
  let meterInterval = null;
  let micStream = null;
  let audioContext = null;

  const clearTimers = () => {
    clearTimeout(connectTimer);
    clearTimeout(turnTimer);
  };

  function stopVolumeMeter() {
    if (meterInterval) {
      clearInterval(meterInterval);
      meterInterval = null;
    }
    if (micStream) {
      try {
        micStream.getTracks().forEach((track) => track.stop());
      } catch {}
      micStream = null;
    }
    if (audioContext && audioContext.state !== "closed") {
      try {
        audioContext.close();
      } catch {}
      audioContext = null;
    }
    onLevel(0);
  }

  function startVolumeMeter() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    stopVolumeMeter();

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        if (disposed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStream = stream;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        audioContext = new AudioCtx();
        if (audioContext.state === "suspended") {
          audioContext.resume().catch(() => {});
        }

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        meterInterval = setInterval(() => {
          if (disposed || !recognition) {
            stopVolumeMeter();
            return;
          }
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          onLevel(Math.min(1, Math.max(0, avg / 100)));
        }, 80);
      })
      .catch(() => {});
  }

  function abortRecognition() {
    recognitionSession++;
    clearTimers();
    onInterim("");
    stopVolumeMeter();

    if (recognition) {
      recognition.onstart =
        recognition.onresult =
        recognition.onend =
        recognition.onerror =
          null;
      try {
        recognition.abort();
      } catch {}
      recognition = null;
    }
  }

  function cancel() {
    speechSession++;
    clearTimeout(speechTimer);
    abortRecognition();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (!disposed) onStatus("Ready");
  }

  function listen() {
    if (disposed) return;
    cancel();

    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      onStatus("Unavailable");
      onError(
        "This browser does not provide speech recognition. Choose On-device voice below, or type your message.",
      );
      return;
    }

    const session = ++recognitionSession;
    let received = false;

    recognition = new API();
    recognition.lang =
      (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage)) ||
      "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    const fail = (text) => {
      if (session !== recognitionSession || disposed) return;
      abortRecognition();
      onStatus("Unavailable");
      onError(text);
    };

    recognition.onstart = () => {
      if (session !== recognitionSession) return;
      clearTimeout(connectTimer);
      onStatus("Listening");
      startVolumeMeter();

      turnTimer = setTimeout(
        () =>
          fail(
            "No speech result arrived. The browser recognition service may be unavailable. Try On-device voice or type instead.",
          ),
        18000,
      );
    };

    recognition.onresult = (e) => {
      if (disposed || session !== recognitionSession || received) return;

      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0]?.transcript?.trim() || "";
        if (e.results[i].isFinal && text) {
          received = true;
          abortRecognition();
          onStatus("Processing");
          onText(text);
          return;
        }
        interim += text + " ";
      }
      onInterim(interim.trim());
    };

    recognition.onerror = (e) => {
      if (e.error === "aborted") return;

      // When browser detects silence during continuous listening, ignore and keep listening
      if (e.error === "no-speech") {
        onInterim("");
        return;
      }

      fail(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone permission was denied or this browser blocks its recognition service. Allow the microphone for this site, or choose On-device voice."
          : e.error === "network"
            ? "The browser recognition service is offline. On-device voice processes your speech locally and does not need that service."
            : e.error === "audio-capture"
              ? "No working microphone was found. Connect a microphone and retry, or type your request."
              : `Browser recognition failed (${e.error}). Try On-device voice or type instead.`,
      );
    };

    recognition.onend = () => {
      if (session !== recognitionSession || disposed) return;
      clearTimers();
      onInterim("");

      if (received) {
        onStatus("Processing");
        return;
      }

      // If speech recognition cycled due to silence in continuous mode, restart so the mic stays listening
      try {
        if (!disposed && session === recognitionSession && recognition) {
          recognition.start();
          return;
        }
      } catch {}

      onStatus("Ready");
      stopVolumeMeter();
    };

    onStatus("Connecting");
    connectTimer = setTimeout(
      () =>
        fail(
          "The browser recognizer did not start. This can happen in embedded browsers. Choose On-device voice to use your microphone without the browser recognition service.",
        ),
      8000,
    );

    try {
      recognition.start();
    } catch (e) {
      fail(`Could not start recognition: ${e.message}. Try On-device voice or use text.`);
    }
  }

  function stopListening() {
    if (recognition) {
      try {
        recognition.stop();
        onStatus("Processing");
        clearTimeout(turnTimer);
        turnTimer = setTimeout(() => {
          abortRecognition();
          onStatus("Ready");
          onError("No transcript was returned. Please retry or choose On-device voice.");
        }, 4000);
      } catch {
        abortRecognition();
        onStatus("Ready");
      }
    }
  }

  function speak(text, enabled, { onComplete = () => {} } = {}) {
    cancel();
    const session = ++speechSession;
    let finished = false;

    const finish = () => {
      if (finished || disposed || session !== speechSession) return;
      finished = true;
      clearTimeout(speechTimer);
      onStatus("Ready");
      onComplete();
    };

    if (!enabled || typeof window === "undefined" || !window.speechSynthesis || disposed) {
      finish();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang =
      (typeof navigator !== "undefined" && (navigator.language || navigator.userLanguage)) ||
      "en-US";
    utterance.rate = 1;

    const voices = window.speechSynthesis.getVoices?.() || [];
    const voice =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find((v) => v.lang.startsWith("en"));
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      if (session === speechSession) onStatus("Speaking");
    };

    utterance.onend = finish;
    utterance.onerror = (e) => {
      if (
        session === speechSession &&
        e.error !== "canceled" &&
        e.error !== "interrupted"
      ) {
        onPlaybackError(
          "Audio playback was blocked. Use “Play reply” to hear the response, or continue with the transcript.",
        );
      }
      finish();
    };

    onStatus("Speaking");
    speechTimer = setTimeout(
      () => {
        if (session === speechSession) {
          try {
            window.speechSynthesis.cancel();
          } catch {}
          finish();
        }
      },
      Math.max(12000, text.length * 90),
    );

    try {
      window.speechSynthesis.resume?.();
      window.speechSynthesis.speak(utterance);
    } catch {
      finish();
      onPlaybackError(
        "Speech playback is unavailable. Your full response is visible in the conversation.",
      );
    }
  }

  return {
    listen,
    stopListening,
    speak,
    cancel,
    dispose() {
      cancel();
      disposed = true;
    },
  };
}
