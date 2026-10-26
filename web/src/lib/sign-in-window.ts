// Signing in from setup without leaving the app: the service's page opens in its own window or tab, and this screen
// stays put, shows that it is waiting and then what happened. The window the service sends the person back to (see
// lib/sign-in-return.ts) announces how it went; a window closed with no answer is checked against the sign-in's status.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { problemText } from "./problem";
import { useWords } from "./wording";

export interface SignInAnnounced {
  outcome: string;
  name: string | null;
  error: string;
  detail: string;
}

const CHANNEL = "cockpit.sign-in";
const EVENT = "cockpit:sign-in";

/** Tells every window of the app how a sign-in went. */
export function announceSignIn(message: SignInAnnounced): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Without it the waiting screen finds out when the window closes.
  }
}

function listen(onMessage: (m: SignInAnnounced) => void): () => void {
  const onEvent = (e: Event) => onMessage((e as CustomEvent<SignInAnnounced>).detail);
  window.addEventListener(EVENT, onEvent);
  let channel: BroadcastChannel | undefined;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL);
      channel.onmessage = (e: MessageEvent<SignInAnnounced>) => onMessage(e.data);
    }
  } catch {
    channel = undefined;
  }
  return () => {
    window.removeEventListener(EVENT, onEvent);
    channel?.close();
  };
}

export type SignInPhase = "idle" | "starting" | "waiting" | "done" | "refused" | "closed" | "blocked" | "failed";

const WATCH_MS = 1000;

export function useSignInWindow(name: string): {
  start: () => Promise<void>;
  phase: SignInPhase;
  text: string;
  /** The window is opening or open: the button waits. */
  busy: boolean;
  /** What to show as a problem: the refusal, the closed window, the failure. */
  problem: string;
} {
  const { t } = useWords();
  const [phase, setPhase] = useState<SignInPhase>("idle");
  const [text, setText] = useState("");
  const opened = useRef<Window | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const live = useRef(false);

  const stop = useCallback(() => {
    live.current = false;
    window.clearInterval(timer.current);
  }, []);

  useEffect(() => {
    const off = listen((m) => {
      if (!live.current || (m.name && m.name !== name)) return;
      stop();
      if (m.outcome === "done") {
        setPhase("done");
        setText("");
      } else if (m.outcome === "refused") {
        setPhase("refused");
        setText(
          m.error
            ? m.detail
              ? t("sign_in.return.refused_detail", { error: m.error, detail: m.detail })
              : t("sign_in.return.refused_error", { error: m.error })
            : t("sign_in.return.refused"),
        );
      } else {
        setPhase("failed");
        setText(t(`sign_in.return.${m.outcome === "expired" ? "expired" : "failed"}`));
      }
    });
    return () => {
      off();
      stop();
    };
  }, [name, stop, t]);

  const start = useCallback(async () => {
    stop();
    setText("");
    setPhase("starting");
    // Opened at the click, empty, so the browser lets it through; it is sent to the service's page when that is known.
    const win = window.open("", "_blank");
    if (!win) {
      setPhase("blocked");
      setText(t("sign_in.window.blocked"));
      return;
    }
    opened.current = win;
    try {
      const started = await api.startSignIn(name);
      win.location.href = started.url;
    } catch (err) {
      try {
        win.close();
      } catch {
        // Already gone.
      }
      setPhase("failed");
      setText(problemText(err, t));
      return;
    }
    live.current = true;
    setPhase("waiting");
    timer.current = window.setInterval(() => {
      if (!opened.current?.closed) return;
      stop();
      // Closed without an answer: the sign-in's own status says whether it went through.
      api.signIns().then(
        (all) => {
          const found = all.find((s) => s.name === name);
          if (found?.status === "signed_in") setPhase("done");
          else {
            setPhase("closed");
            setText(t("sign_in.window.closed"));
          }
        },
        () => {
          setPhase("closed");
          setText(t("sign_in.window.closed"));
        },
      );
    }, WATCH_MS);
  }, [name, stop, t]);

  const busy = phase === "starting" || phase === "waiting";
  return { start, phase, text, busy, problem: phase === "done" ? "" : text };
}
