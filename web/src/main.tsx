import "./theme/tokens.css";
import "./styles.css";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { api, ApiError, type S } from "./lib/api";
import { ToastProvider } from "./lib/toasts";
import { WordingProvider, useWords } from "./lib/wording";
import { OwnRequestsProvider } from "./components/HandIn";
import { Button } from "./ui/Button";
import { initAppearance } from "./lib/theme";

const client = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 } },
});

function Problem(props: { signedOut: boolean }) {
  const { t } = useWords();
  return (
    <main id="main" className="problem">
      <h1>{t(props.signedOut ? "app.signed_out_title" : "app.unreachable_title")}</h1>
      <p>{t(props.signedOut ? "app.signed_out" : "app.unreachable")}</p>
      {!props.signedOut && (
        <Button variant="primary" icon="refresh" onClick={() => window.location.reload()}>
          {t("action.try_again")}
        </Button>
      )}
    </main>
  );
}

/** The wording with the names the app has now: a renamed assistant or app reads right on every screen, with no reload. */
function LiveWording(props: { rc: S["RuntimeConfig"]; children: ReactNode }) {
  const fresh = useQuery({ queryKey: ["runtime-config"], queryFn: api.runtimeConfig, initialData: props.rc, staleTime: Infinity });
  const rc = fresh.data;
  return (
    <WordingProvider
      overrides={rc.wording}
      base={{ assistant: rc.assistant_name, workspace: rc.workspace_name }}
      unnamed={rc.assistant_named === false}
    >
      {props.children}
    </WordingProvider>
  );
}

function start(rc: S["RuntimeConfig"]) {
  initAppearance(rc);
  // The phone layout applies from the first paint, not after the first render.
  if (typeof window.matchMedia === "function") {
    document.documentElement.toggleAttribute("data-narrow", window.matchMedia(`(max-width: ${rc.narrow_below_px - 1}px)`).matches);
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <LiveWording rc={rc}>
          <ToastProvider seconds={rc.toast_seconds}>
            <OwnRequestsProvider>
              <App rc={rc} />
            </OwnRequestsProvider>
          </ToastProvider>
        </LiveWording>
      </QueryClientProvider>
    </StrictMode>,
  );
}

api.runtimeConfig().then(start, (err: unknown) => {
  createRoot(document.getElementById("root")!).render(
    <WordingProvider>
      <Problem signedOut={err instanceof ApiError && err.status === 401} />
    </WordingProvider>,
  );
});
