import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createLocalRepository, STORAGE_KEY } from "../data/localRepository";
import { newDialogue, message, replyTo } from "../domain/conversation";
import { greetingFor } from "../domain/config";
import { createSupabaseRepository } from "../data/supabaseRepository";
import { createSpeech } from "../services/speech";
import { createLocalVoice } from "../services/localVoice";
import { createVapiVoice, getVapiCredentials } from "../services/vapiVoice";
import LiveCallModal from "../components/LiveCallModal";

const Context = createContext(null);
export const useApp = () => useContext(Context);

export function AppProvider({ children }) {
  const [repository, setRepository] = useState(() => createLocalRepository()),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [restoring, setRestoring] = useState(true);

  const [conversation, setConversation] = useState(null),
    [dialogue, setDialogue] = useState(newDialogue),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Ready");

  const [voiceMode, setVoiceMode] = useState(false),
    [engine, setEngine] = useState("device"),
    [voiceError, setVoiceError] = useState(""),
    [interim, setInterim] = useState(""),
    [level, setLevel] = useState(0),
    [model, setModel] = useState({ state: "idle" }),
    [spoken, setSpoken] = useState(false);

  // Vapi Voice & Live Call Modal State
  const [vapiStatus, setVapiStatus] = useState("Idle"),
    [vapiActive, setVapiActive] = useState(false),
    [vapiVolume, setVapiVolume] = useState(0),
    [vapiTranscript, setVapiTranscript] = useState([]),
    [vapiError, setVapiError] = useState(""),
    [liveCallOpen, setLiveCallOpen] = useState(false),
    [liveCallMode, setLiveCallMode] = useState("vapi");

  const active = useRef(null),
    machine = useRef(newDialogue()),
    lock = useRef(false),
    speech = useRef(null),
    localVoice = useRef(null),
    vapiVoice = useRef(null),
    sendRef = useRef(null),
    listenRef = useRef(null),
    voiceLoop = useRef(false),
    engineRef = useRef(
      typeof window !== "undefined" &&
        (window.SpeechRecognition || window.webkitSpeechRecognition)
        ? "browser"
        : "device",
    ),
    spokenRef = useRef(false),
    resumeTimer = useRef(null);

  useEffect(() => {
    vapiVoice.current = createVapiVoice();
    return () => {
      vapiVoice.current?.endCall();
    };
  }, []);

  async function reload(repo = repository) {
    const snapshot = await repo.getSnapshot();
    setData(snapshot);
    return snapshot;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem("voicely.storage-mode") === "cloud") {
          const repo = await createSupabaseRepository();
          if (!cancelled) setRepository(repo);
        }
      } catch (e) {
        if (!cancelled)
          setError(
            `Cloud reconnect failed: ${e.message} Local Demo Mode is active; no cloud write was redirected.`,
          );
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (restoring) return;
    let mounted = true;
    repository
      .getSnapshot()
      .then((snapshot) => {
        if (mounted) {
          setData(snapshot);
          if (repository.notice) setToast(repository.notice);
        }
      })
      .catch((e) => setError(e.message));
    const sync = (e) => {
      if (e.key === STORAGE_KEY && repository.mode === "demo")
        reload().catch((e) => setError(e.message));
    };
    window.addEventListener("storage", sync);
    return () => {
      mounted = false;
      window.removeEventListener("storage", sync);
    };
  }, [repository, restoring]);

  useEffect(() => {
    const value = data?.config?.agent?.speak || false;
    setSpoken(value);
    spokenRef.current = value;
  }, [data?.config?.agent?.speak]);

  function voiceProblem(text) {
    voiceLoop.current = false;
    setVoiceMode(false);
    setVoiceError(text);
    setInterim("");
  }

  useEffect(() => {
    speech.current = createSpeech({
      onText: (text) => sendRef.current?.(text),
      onStatus: setStatus,
      onError: voiceProblem,
      onInterim: setInterim,
      onPlaybackError: setVoiceError,
    });
    localVoice.current = createLocalVoice({
      onText: (text) => sendRef.current?.(text),
      onStatus: setStatus,
      onError: voiceProblem,
      onLevel: setLevel,
      onProgress: setModel,
    });
    return () => {
      clearTimeout(resumeTimer.current);
      voiceLoop.current = false;
      speech.current?.dispose();
      localVoice.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  function pauseVoice() {
    voiceLoop.current = false;
    setVoiceMode(false);
    clearTimeout(resumeTimer.current);
    speech.current?.cancel();
    localVoice.current?.cancel({ closeAudio: true });
    setInterim("");
    setStatus("Ready");
  }

  function beginListening() {
    if (!voiceLoop.current || !active.current || lock.current) return;
    if (engineRef.current === "device") localVoice.current.listen();
    else speech.current.listen();
  }
  listenRef.current = beginListening;

  function respond(text, speak = spokenRef.current) {
    speech.current.speak(text, speak, {
      onComplete: () => {
        if (voiceLoop.current)
          resumeTimer.current = setTimeout(() => listenRef.current?.(), 150);
      },
    });
  }

  async function start({ voice = false } = {}) {
    if (active.current) return active.current;
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const c = {
        id: crypto.randomUUID(),
        businessId: data?.config?.id || "biz-1",
        startedAt: new Date().toISOString(),
        endedAt: null,
        caller: "Demo User",
        source: voice ? "demo_voice" : "text",
        messages: [message("assistant", greetingFor(data.config))],
        outcome: "inquiry",
        summary: "Conversation started.",
        appointmentIds: [],
        leadId: null,
        sample: false,
      };
      await repository.startConversation(c);
      active.current = c;
      machine.current = newDialogue();
      setDialogue(machine.current);
      setConversation(c);
      await reload();
      respond(c.messages[0].text, voice);
      return c;
    } catch (e) {
      setError(e.message);
      pauseVoice();
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function startVoice() {
    if (lock.current) return;
    setVoiceError("");
    voiceLoop.current = true;
    setVoiceMode(true);
    setSpoken(true);
    spokenRef.current = true;
    try {
      if (engineRef.current === "device") {
        localVoice.current.prime();
        setStatus("Loading voice");
        await localVoice.current.prepare();
        if (!voiceLoop.current) return;
      }
      if (active.current) {
        respond("I’m ready. How can I help?", true);
      } else await start({ voice: true });
    } catch (e) {
      setStatus("Unavailable");
      voiceProblem(
        `Could not load on-device voice: ${e.message}. You can use Browser recognition or continue typing.`,
      );
    }
  }

  function toggleListening() {
    setVoiceError("");
    if (status === "Listening") {
      if (engineRef.current === "device") localVoice.current.stopListening();
      else speech.current.stopListening();
    } else if (
      ["Connecting", "Loading voice", "Transcribing", "Processing"].includes(
        status,
      )
    )
      pauseVoice();
    else startVoice();
  }

  function toggleSpoken() {
    const enabled = !spokenRef.current;
    spokenRef.current = enabled;
    setSpoken(enabled);
    if (!enabled) {
      speech.current.cancel();
      if (voiceLoop.current)
        resumeTimer.current = setTimeout(() => listenRef.current?.(), 150);
    }
  }

  function chooseEngine(value) {
    pauseVoice();
    engineRef.current = value;
    setEngine(value);
    setVoiceError("");
  }

  function replay() {
    const last = conversation?.messages
      .filter((m) => m.role === "assistant")
      .at(-1);
    if (last) {
      pauseVoice();
      speech.current.speak(last.text, true);
    }
  }

  async function end() {
    if (lock.current || !active.current) return;
    pauseVoice();
    lock.current = true;
    setBusy(true);
    try {
      const c = { ...active.current, endedAt: new Date().toISOString() };
      await repository.saveConversation(c);
      active.current = null;
      setConversation(c);
      machine.current = newDialogue();
      setDialogue(machine.current);
      await reload();
      setToast("Conversation saved in Call Logs.");
    } catch (e) {
      setError(`Could not end the conversation: ${e.message}`);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function send(text) {
    if (lock.current || !text.trim()) return;
    if (!active.current) {
      const c = await start();
      if (!c) return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setInterim("");
    speech.current?.cancel();
    await localVoice.current?.cancel();
    let actionAttempted = false;
    try {
      const c = {
        ...active.current,
        messages: [
          ...active.current.messages,
          message("customer", text.trim()),
        ],
        summary: `Customer: ${text.trim().slice(0, 180)}`,
      };
      await repository.saveConversation(c);
      active.current = c;
      setConversation(c);
      const result = await replyTo(text, machine.current, repository, c.id);
      actionAttempted = true;
      machine.current = result.dialogue;
      setDialogue(result.dialogue);
      const finished = result.dialogue.phase === "ended";
      const next = {
        ...c,
        messages: [...c.messages, message("assistant", result.reply)],
        ...(finished ? { endedAt: new Date().toISOString() } : {}),
      };
      await repository.saveConversation(next);
      active.current = finished ? null : next;
      setConversation(next);
      await reload();
      if (finished) {
        voiceLoop.current = false;
        setVoiceMode(false);
      }
      respond(result.reply, voiceLoop.current);
    } catch (e) {
      pauseVoice();
      setError(
        `${actionAttempted ? "An action may already be saved. Check Appointments before retrying. Transcript update failed: " : ""}${e.message}`,
      );
      await reload().catch(() => {});
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  sendRef.current = send;

  // Vapi Voice Integration Functions
  async function startVapiCall() {
    if (!data) return;
    const creds = getVapiCredentials(data.config);
    setVapiError("");
    setVapiTranscript([]);
    setLiveCallOpen(true);

    if (!creds.isConfigured) {
      setLiveCallMode("demo");
      setVapiStatus("Interactive Ready");
      setToast(
        creds.isPrivateSecretMisplaced
          ? "Please enter your Vapi Public Client Key (not secret) in Settings."
          : "Vapi keys not configured. Launching Voicely Interactive Voice Agent."
      );
      await startVoice();
      return;
    }

    setLiveCallMode("vapi");
    setVapiActive(true);
    setVapiStatus("Connecting");

    try {
      await vapiVoice.current.startCall({
        config: data.config,
        onStatus: (s) => {
          setVapiStatus(s);
          if (s === "Connected" || s === "Speaking" || s === "Listening") {
            setVapiActive(true);
          } else if (s === "Error" || s === "Ended") {
            setVapiActive(false);
          }
        },
        onTranscript: (item, fullList) => {
          setVapiTranscript([...fullList]);
        },
        onVolume: (v) => setVapiVolume(v),
        onError: (err) => {
          setVapiActive(false);
          setVapiStatus("Error");
          setVapiError(err);
          setError(err);
        },
        onToolCall: async (name, args) => {
          if (name === "check_availability") {
            return repository.checkAvailability?.(args);
          } else if (name === "create_appointment") {
            const res = await repository.book({ ...args, source: "ai_voice" });
            await reload();
            setToast(`Appointment booked for ${res.customer}!`);
            return res;
          } else if (name === "create_lead") {
            const res = await repository.createLead?.({ ...args, source: "ai_voice" });
            await reload();
            setToast(`Lead captured for ${res.name}!`);
            return res;
          } else if (name === "reschedule_appointment") {
            const res = await repository.reschedule?.(args.appointmentId, args.newDate, args.newTime);
            await reload();
            setToast("Appointment rescheduled!");
            return res;
          } else if (name === "cancel_appointment") {
            const res = await repository.cancel?.(args.appointmentId, args.reason);
            await reload();
            setToast("Appointment cancelled.");
            return res;
          }
        },
        onCallEnd: async ({ messages }) => {
          setVapiActive(false);
          setVapiStatus("Ended");
          if (messages.length > 0) {
            const caller =
              messages.find((m) => m.role === "customer")?.text.slice(0, 30) ||
              "Website Voice Caller";
            await repository.saveCallSummary?.({
              caller,
              summary: `Vapi voice conversation with ${messages.length} messages.`,
              transcript: messages,
              source: "vapi_voice",
              outcome: messages.some(
                (m) =>
                  m.text.toLowerCase().includes("confirmed") ||
                  m.text.toLowerCase().includes("reference"),
              )
                ? "booked"
                : "inquiry",
            });
            await reload();
            setToast("Vapi call summary saved in Call Logs.");
          }
        },
      });
    } catch (err) {
      setVapiActive(false);
      setVapiStatus("Error");
      setVapiError(err.message || "Failed to start Vapi call");
    }
  }

  function endVapiCall() {
    if (liveCallMode === "vapi") {
      vapiVoice.current?.endCall();
      setVapiActive(false);
      setVapiStatus("Ended");
    } else {
      end();
    }
  }

  async function switchToInteractiveVoice() {
    if (vapiVoice.current?.isActive()) {
      vapiVoice.current.endCall();
    }
    setVapiActive(false);
    setVapiError("");
    setLiveCallMode("demo");
    setLiveCallOpen(true);
    setVapiStatus("Interactive Active");
    setToast("Switched to Voicely Interactive Voice Receptionist.");
    await startVoice();
  }

  function openLiveCall(preferredMode) {
    if (preferredMode === "demo" || preferredMode === "interactive") {
      switchToInteractiveVoice();
      return;
    }
    startVapiCall();
  }

  function closeLiveCall() {
    if (vapiActive || active.current) {
      endVapiCall();
    }
    setLiveCallOpen(false);
  }

  // Leads & Multi-Tenant Actions
  async function createLead(leadInput) {
    return perform(
      (r) => r.createLead(leadInput),
      `Lead created for ${leadInput.name}!`,
    );
  }

  async function updateLead(id, updates) {
    return perform(
      (r) => r.updateLead(id, updates),
      "Lead updated successfully.",
    );
  }

  async function convertLeadToAppointment(leadId, appointmentInput) {
    return perform(
      (r) => r.convertLeadToAppointment(leadId, appointmentInput),
      "Lead converted to confirmed appointment!",
    );
  }

  async function rescheduleAppointment(appointmentId, newDate, newTime) {
    return perform(
      (r) => r.reschedule(appointmentId, newDate, newTime),
      "Appointment rescheduled successfully.",
    );
  }

  async function createBusiness(businessData) {
    return perform(
      (r) => r.createBusiness(businessData),
      `Workspace created for ${businessData.name}!`,
    );
  }

  async function switchBusiness(businessId) {
    return perform(
      (r) => r.switchBusiness(businessId),
      "Switched business workspace.",
    );
  }

  async function setUserRole(role) {
    return perform(
      (r) => r.setCurrentUserRole(role),
      `Switched testing role to ${role}.`,
    );
  }

  async function addMember(memberData) {
    return perform(
      (r) => r.addMember(memberData),
      `Team member ${memberData.name} added.`,
    );
  }

  async function perform(action, success) {
    setError("");
    try {
      const result = await action(repository);
      await reload();
      if (success) setToast(success);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }

  async function switchRepository(repo) {
    if (active.current)
      throw new Error("End the current conversation before switching storage.");
    const snapshot = await repo.getSnapshot();
    localStorage.setItem("voicely.storage-mode", repo.mode);
    setRepository(repo);
    setData(snapshot);
    setConversation(null);
    setToast(
      repo.mode === "cloud"
        ? "Connected to Supabase. Saves now use the cloud database."
        : "Demo Mode is active. Saves use this browser.",
    );
  }

  return (
    <Context.Provider
      value={{
        data,
        repository,
        error,
        setError,
        toast,
        setToast,
        reload,
        perform,
        switchRepository,
        conversation,
        dialogue,
        busy,
        status,
        start,
        end,
        send,
        active: !!active.current,
        speech,
        localVoice,
        voiceMode,
        engine,
        voiceError,
        setVoiceError,
        interim,
        level,
        model,
        spoken,
        startVoice,
        toggleListening,
        pauseVoice,
        toggleSpoken,
        chooseEngine,
        replay,
        // Vapi & Live Call
        vapiStatus,
        vapiActive,
        vapiVolume,
        vapiTranscript,
        vapiError,
        liveCallOpen,
        liveCallMode,
        startVapiCall,
        endVapiCall,
        openLiveCall,
        closeLiveCall,
        switchToInteractiveVoice,
        // Leads & Multi-tenancy
        createLead,
        updateLead,
        convertLeadToAppointment,
        rescheduleAppointment,
        createBusiness,
        switchBusiness,
        setUserRole,
        addMember,
      }}
    >
      {children}
      {data && <LiveCallModal />}
    </Context.Provider>
  );
}

