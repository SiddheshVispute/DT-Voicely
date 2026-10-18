export const speechSupported = () =>
  typeof window !== "undefined" &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);
export function createSpeech({ onText, onStatus, onError }) {
  let recognition,
    speaking = false,
    disposed = false,
    lastResult = "",
    resultSession = 0,
    speechSession = 0;
  const stopListening = () => {
    resultSession++;
    if (recognition) {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {}
      recognition = null;
    }
    onStatus("Ready");
  };
  const cancel = () => {
    speechSession++;
    stopListening();
    window.speechSynthesis?.cancel();
    speaking = false;
  };
  const listen = () => {
    if (disposed) return;
    cancel();
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      onError(
        "Speech recognition is unavailable in this browser. The text conversation has all the same features.",
      );
      return;
    }
    const session = ++resultSession;
    lastResult = "";
    recognition = new API();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (e) => {
      if (disposed || speaking || session !== resultSession) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (!e.results[i].isFinal) continue;
        const text = e.results[i][0].transcript.trim();
        if (text && text !== lastResult) {
          lastResult = text;
          stopListening();
          onText(text);
          break;
        }
      }
    };
    recognition.onerror = (e) => {
      if (session !== resultSession) return;
      onError(
        e.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access in browser settings or use text."
          : e.error === "network"
            ? "The browser recognition service is offline. Please use text."
            : e.error === "no-speech"
              ? "No speech was detected. Try again or type your request."
              : `Microphone error: ${e.error}. Please use text or try again.`,
      );
      stopListening();
    };
    recognition.onend = () => {
      if (session === resultSession) onStatus("Ready");
    };
    try {
      recognition.start();
      onStatus("Listening");
    } catch (e) {
      onError(`Could not start the microphone: ${e.message}`);
      stopListening();
    }
  };
  const speak = (text, enabled) => {
    const session = ++speechSession;
    stopListening();
    window.speechSynthesis?.cancel();
    speaking = false;
    if (!enabled || !window.speechSynthesis || disposed) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 0.96;
    speaking = true;
    onStatus("Speaking");
    utterance.onend = () => {
      if (session !== speechSession) return;
      speaking = false;
      if (!disposed) onStatus("Ready");
    };
    utterance.onerror = () => {
      if (session !== speechSession) return;
      speaking = false;
      if (!disposed) onStatus("Ready");
    };
    window.speechSynthesis.speak(utterance);
  };
  return {
    listen,
    stopListening,
    speak,
    cancel,
    dispose: () => {
      disposed = true;
      cancel();
    },
  };
}
