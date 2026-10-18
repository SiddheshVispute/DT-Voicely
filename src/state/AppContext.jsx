import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createLocalRepository, STORAGE_KEY } from "../data/localRepository";
import { newDialogue, message, replyTo } from "../domain/conversation";
import { createSpeech } from "../services/speech";
import { greetingFor } from "../domain/config";
import { createSupabaseRepository } from "../data/supabaseRepository";
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
  const active = useRef(null),
    machine = useRef(newDialogue()),
    lock = useRef(false),
    speech = useRef(null),
    sendRef = useRef(null);
  async function reload(repo = repository) {
    const s = await repo.getSnapshot();
    setData(s);
    return s;
  }
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        if (localStorage.getItem("voicely.storage-mode") === "cloud") {
          const repo = await createSupabaseRepository();
          if (!cancelled) setRepository(repo);
        }
      } catch (e) {
        if (!cancelled)
          setError(
            `Cloud reconnect failed: ${e.message} Local Demo Mode is active; no cloud operation was saved locally.`,
          );
      } finally {
        if (!cancelled) setRestoring(false);
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (restoring) return;
    reload()
      .then(() => {
        if (repository.notice) setToast(repository.notice);
      })
      .catch((e) => setError(e.message));
    const sync = (e) => {
      if (e.key === STORAGE_KEY) reload().catch((e) => setError(e.message));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [repository, restoring]);
  useEffect(() => {
    speech.current = createSpeech({
      onText: (text) => sendRef.current?.(text),
      onStatus: setStatus,
      onError: setError,
    });
    return () => speech.current.dispose();
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function start() {
    if (lock.current || active.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const c = {
        id: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
        endedAt: null,
        messages: [message("assistant", greetingFor(data.config))],
        outcome: "inquiry",
        summary: "Conversation started.",
        appointmentIds: [],
        sample: false,
      };
      await repository.startConversation(c);
      active.current = c;
      machine.current = newDialogue();
      setDialogue(machine.current);
      setConversation(c);
      await reload();
      speech.current.speak(c.messages[0].text, data.config.agent.speak);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function end() {
    if (lock.current || !active.current) return;
    lock.current = true;
    setBusy(true);
    speech.current.cancel();
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
    if (lock.current || !active.current || !text.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    speech.current.cancel();
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
      speech.current.speak(result.reply, data.config.agent.speak);
    } catch (e) {
      setError(
        `${actionAttempted ? "The action may already be saved. Check Appointments before retrying. Transcript update failed: " : ""}${e.message}`,
      );
      await reload().catch(() => {});
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  sendRef.current = send;
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
    const s = await repo.getSnapshot();
    try {
      localStorage.setItem("voicely.storage-mode", repo.mode);
    } catch {
      throw new Error(
        "Could not remember the storage selection. Allow browser storage before switching modes.",
      );
    }
    setRepository(repo);
    setData(s);
    setConversation(null);
    setToast(
      repo.mode === "cloud"
        ? "Connected to Supabase. All saves now use the cloud database."
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
      }}
    >
      {children}
    </Context.Provider>
  );
}
