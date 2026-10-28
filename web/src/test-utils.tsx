// Rendering components against a fake API: routes map "METHOD path" to a handler that returns the JSON body.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { S } from "./lib/api";
import type { ReactNode } from "react";
import { ToastProvider } from "./lib/toasts";
import { WordingProvider } from "./lib/wording";
import { OwnRequestsProvider } from "./components/HandIn";

/** A route's handler gets the request's body and its query. A route written without a query answers the same path with one. */
export type Routes = Record<string, (body: unknown, query?: URLSearchParams) => unknown>;

/** Return this from a route to answer with a refusal, as the server does: a status and its text. */
export class Refuse {
  constructor(
    public status: number,
    public detail: string,
    public headers: Record<string, string> = {},
  ) {}
}

export function fakeApi(routes: Routes) {
  const calls: Array<{ route: string; body: unknown; headers?: HeadersInit }> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace(/^api\//, "");
    const route = `${init?.method ?? "GET"} ${path}`;
    // JSON bodies are parsed for the handler; a file's bytes are passed as they are.
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    calls.push({ route, body, headers: init?.headers });
    const [bare, query] = path.split("?");
    const handler = routes[route] ?? (query !== undefined ? routes[`${init?.method ?? "GET"} ${bare}`] : undefined);
    if (!handler) return new Response(JSON.stringify({ detail: "not found" }), { status: 404 });
    // A handler may answer later (a promise), to stand for a slow server.
    const answer = await handler(body, new URLSearchParams(query ?? ""));
    if (answer instanceof Refuse) return new Response(JSON.stringify({ detail: answer.detail }), { status: answer.status, headers: answer.headers });
    return new Response(JSON.stringify(answer), { status: 200, headers: { "content-type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

export function renderApp(ui: ReactNode, overrides: Record<string, string> = {}, options: { unnamed?: boolean; locale?: string } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rendered = render(
    <WordingProvider overrides={overrides} base={{ assistant: "Helper" }} unnamed={options.unnamed} locale={options.locale}>
      <QueryClientProvider client={client}>
        <ToastProvider seconds={0}>
          <OwnRequestsProvider>{ui}</OwnRequestsProvider>
        </ToastProvider>
      </QueryClientProvider>
    </WordingProvider>,
  );
  // The client is returned too, for a test that makes the app fetch again, as the live stream does.
  return Object.assign(rendered, { client });
}

/** A status answer with nothing wrong, for tests to change a part of. */
export function statusFixture(over: Partial<S["Status"]> = {}, parts: { backup?: Partial<S["BackupStatus"]>; spend?: Partial<S["SpendStatus"]>; ai?: S["AiState"]; assistant?: Partial<S["AssistantStatus"]> } = {}): S["Status"] {
  return {
    backup: { configured: false, last_success: null, age_hours: null, needs_attention: false, last_error: null, encrypted: false, ...parts.backup },
    ai: parts.ai ?? { state: "ok", detail: null },
    assistant: { last_run_at: null, last_run_failed: false, runs_today: [], queued: 0, oldest_queued_since: null, chains: [], paused: [], loop_restarted_at: null, loop_stuck_since: null, ...parts.assistant },
    spend: { today_usd: 0, month_usd: 0, per_day_usd: 2, per_month_usd: 30, warn: false, warn_today: false, warn_month: false, ...parts.spend },
    requests: { queued: 0, running: 0, review: 0, needs_you: 0 },
    version: 1,
    restart_needed: null,
    can_restart: false,
    ...over,
  };
}

/** The runtime configuration a test app starts with. */
export function rcFixture(extra: Partial<S["RuntimeConfig"]> = {}): S["RuntimeConfig"] {
  return {
    api_base: "api",
    assistant_name: "Helper",
    assistant_named: true,
    base_path: "",
    demo: false,
    feedback_to: "feedback@example.com",
    narrow_below_px: 640,
    logo: false,
    theme: "system",
    density: "comfortable",
    language: "en-US",
    pm: null,
    shortcuts: { undo: "u", hand_in: "n", help: "?", ask: "/" },
    toast_seconds: 0,
    version: "9.8.7",
    wording: {},
    workspace_name: "Workspace",
    ...extra,
  };
}

/** The walkthrough screen each core setup step is on, as the server sorts them; any other step is an optional extra. */
const SCREEN_OF: Record<string, S["SetupStepView"]["group"]> = {
  workspace: "you",
  work: "work",
  ai: "ai",
  mail: "mail",
  promises: "promises",
  backup: "backup",
  people: "people",
};

/** A setup step as the server sends it, sorted into its screen the way the server does. */
export function setupStep(id: string, extra: Partial<S["SetupStepView"]> = {}): S["SetupStepView"] {
  return {
    id,
    done: false,
    skipped: false,
    label: "",
    explanation: "",
    action: null,
    plugin: null,
    group: SCREEN_OF[id] ?? "done",
    counted: id in SCREEN_OF,
    place: null,
    reason: null,
    ...extra,
  };
}

/** The setup answer for a list of steps, with the walkthrough closed unless a test says otherwise. */
export function setupView(
  steps: S["SetupStepView"][],
  over: { finished?: boolean; local?: boolean; first_go_waiting?: number; walkthrough?: Partial<S["WalkthroughView"]> } = {},
): S["SetupView"] {
  // The server numbers the counted steps and counts the settled ones; the fixtures do the same.
  let place = 0;
  const numbered = steps.map((s) => (s.counted && s.place == null ? { ...s, place: ++place } : s));
  const counted = numbered.filter((s) => s.counted);
  return {
    steps: numbered,
    finished: over.finished ?? false,
    total: counted.length,
    settled: counted.filter((s) => s.done || s.skipped).length,
    local: over.local ?? true,
    first_go_waiting: over.first_go_waiting ?? 0,
    walkthrough: { open: false, step: "you", closed: false, finished: false, promises_done: false, ...over.walkthrough },
  };
}

/** The window is wide enough (1024px or more) for a list's detail to stand beside it, as the list | detail views lay it out.
 * Stubs the media queries; call `vi.unstubAllGlobals()` after the test (the views' tests do it in `afterEach`). */
export function besidePane(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: /min-width:\s*1024px/.test(query), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
}
