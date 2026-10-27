// The mail and calendar screen of the walkthrough (design 7.8): the services the person can connect, each in the state it
// is in. One not yet installed is installed and turned on with one button; one installed but off is turned on; then the
// one restart. Where the app can restart itself, one button does all of it (the click is the say-so, and the button says
// the app restarts), then opens the sign-in in its own window; otherwise the visible "Restart to finish connecting" stays,
// never made on its own. Once signed in the screen says what is read now
// and that the last day's mail waits for the first Go. The core's own mail folder and calendar address are offered as
// "Another mail or calendar". With no service listed and nothing read yet, the step is one sentence, one button and the way
// out the walkthrough already has (skip it).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { serviceReachLines, waitsForRestart } from "../lib/packs";
import { problemText } from "../lib/problem";
import { useRestart } from "../lib/restart";
import { useAfterSave, useFreshFingerprint } from "../lib/settings-save";
import { useSignInWindow } from "../lib/sign-in-window";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import { addonOfSignIn } from "./SignIns";
import { Icon } from "../ui/Icon";
import { MailServiceConnect, OTHER_MAILBOX } from "./MailServiceConnect";
import { ReadToken } from "./ReadToken";

type Pack = S["PackView"];
type Installed = S["InstalledPackView"];
type SignIn = S["SignInView"];
type Source = S["WatchSourceView"];

/** Where a service stands on the way to being read. */
export type ServiceState = "not_installed" | "off" | "restart" | "problem" | "ready";

export interface Service {
  id: string;
  name: string;
  summary: string;
  /** Who made it, when the catalog says; empty for an add-on that is here but not listed. */
  publisher: string;
  reads: Array<"mail" | "calendar">;
  state: ServiceState;
  /** Why an add-on that is on isn't running, in the app's words. */
  reason: string;
  /** The app can install it from here (the add-on is listed with a release it understands). */
  installable: boolean;
  /** Where its download is kept, when the catalog says: a private one needs an access key for it. */
  releaseHost: string | null;
  what: S["PackSummary"];
}

/** A service is an add-on that signs in to something and reads mail or a calendar. */
const connects = (what: S["PackSummary"]) => (what.reads ?? []).length > 0 && what.reaches.sign_ins.length > 0;

/** The services to offer: the catalogs' entries, then add-ons already here that the catalogs don't list. */
export function servicesFrom(available: Pack[], installed: Installed[]): Service[] {
  const running = new Map(installed.map((i) => [i.name, i]));
  const found = new Map<string, Service>();
  const stateOf = (here: Installed | undefined): { state: ServiceState; reason: string } => {
    if (!here) return { state: "not_installed", reason: "" };
    if (!here.enabled) return { state: "off", reason: "" };
    if (waitsForRestart(here)) return { state: "restart", reason: "" };
    if (here.state === "enabled") return { state: "ready", reason: "" };
    return { state: "problem", reason: here.reason ?? "" };
  };
  for (const pack of available) {
    if (!connects(pack.what) || found.has(pack.id)) continue;
    const here = pack.installed_version != null ? running.get(pack.id) : undefined;
    found.set(pack.id, {
      id: pack.id,
      name: pack.name,
      summary: pack.summary,
      publisher: pack.publisher,
      reads: pack.what.reads ?? [],
      ...stateOf(here),
      installable: !!pack.installable,
      releaseHost: pack.release_host ?? null,
      what: pack.what,
    });
  }
  for (const item of installed) {
    if (!connects(item.what) || found.has(item.name)) continue;
    found.set(item.name, {
      id: item.name,
      name: item.name,
      summary: item.description,
      publisher: "",
      reads: item.what.reads ?? [],
      ...stateOf(item),
      installable: false,
      releaseHost: null,
      what: item.what,
    });
  }
  return [...found.values()];
}

/** The setting that decides whether the assistant sorts the mail the rules can't place; it is on unless set to rules. */
const SORTING = "watch.sorting";

/** Whether the assistant sorts what the rules can't, from sender, subject and category only: a setting the running app
 *  takes in at once, saved like any other, with its read-back and Undo. */
function SortingSwitch() {
  const { t } = useWords();
  const afterSave = useAfterSave();
  const fresh = useFreshFingerprint();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [problem, setProblem] = useState("");
  // The choice that was being saved, so Try again saves the same one.
  const [again, setAgain] = useState(false);
  const on = settings.data?.items.find((i) => i.key === SORTING)?.value !== "rules";
  const change = async (next: boolean) => {
    setProblem("");
    setAgain(next);
    try {
      const saved = await api.saveSettings({ changes: { [SORTING]: next ? "ai" : "rules" }, reset: [], fingerprint: await fresh() });
      // The tick itself shows the choice: a setup step raises no message for each one.
      await afterSave(saved, { quiet: true });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    }
  };
  return (
    <div className="field" data-sorting="">
      <label className="check-line">
        <input type="checkbox" checked={on} disabled={settings.isPending} onChange={(e) => void change(e.target.checked)} />
        <span>{t("walkthrough.mail.sorting")}</span>
      </label>
      <p className="hint">{t("walkthrough.mail.sorting_hint")}</p>
      {problem && (
        <div className="problem-note" role="alert">
          <p>{problem}</p>
          <button type="button" className="btn" onClick={() => void change(again)}>
            {t("action.try_again")}
          </button>
        </div>
      )}
    </div>
  );
}

const SOURCES = "watch.sources";

/** Which sides of the person's life a mailbox or calendar serves, as tick boxes: Personal and each side. Each tick is saved at
 * once as the source's `sides`, through the settings save (the whole list of sources, read fresh). A tick made while an
 * earlier one is still being saved is queued and saved after it, and the boxes and the line under them show the choices as made,
 * so the last words always match the boxes. The step raises no message for a tick: a tick is undone by unticking it, and one
 * that couldn't be saved names its box and offers Try again. Nothing ticked is allowed: it means not said. */
function SourceSides(props: { source: Source; personal: string | null; sides: S["SideView"][] }) {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  type Tick = { side: string; on: boolean };
  // What the person ticked that isn't settled yet (shown as made), the ticks waiting their turn, and what couldn't be saved.
  const [wanted, setWanted] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Array<Tick & { detail: string }>>([]);
  const [touched, setTouched] = useState(false);
  const waiting = useRef<Tick[]>([]);
  const running = useRef(false);
  const options = [
    ...(props.personal ? [{ id: props.personal, name: t("sides.filter.personal") }] : []),
    ...props.sides.map((s) => ({ id: s.project, name: s.name })),
  ];
  const stored = (settings.data?.items.find((i) => i.key === SOURCES)?.value ?? []) as Array<{ id: string; sides?: string[] }>;
  const held = new Set(stored.find((s) => s.id === props.source.id)?.sides ?? []);
  const ticked = (side: string) => wanted[side] ?? held.has(side);

  const save = async ({ side, on }: Tick) => {
    // The settings as they are now, so a change made meanwhile is noticed rather than overwritten.
    const current = await client.fetchQuery({ queryKey: ["settings"], queryFn: api.settings, staleTime: 0 });
    const list = (current.items.find((i) => i.key === SOURCES)?.value ?? []) as Array<Record<string, unknown> & { id: string; sides?: string[] }>;
    const mine = new Set(list.find((s) => s.id === props.source.id)?.sides ?? []);
    if (on) mine.add(side);
    else mine.delete(side);
    // In the order of the choices, then any side the source names that isn't offered, which a tick leaves as it was.
    const next = [...options.map((o) => o.id).filter((id) => mine.has(id)), ...[...mine].filter((id) => !options.some((o) => o.id === id))];
    const changes = { [SOURCES]: list.map((s) => (s.id === props.source.id ? { ...s, sides: next } : s)) };
    const saved = await api.saveSettings({ changes, reset: [], fingerprint: current.fingerprint });
    await afterSave(saved, { quiet: true });
  };

  // One save at a time, in the order the ticks were made.
  const drain = async () => {
    if (running.current) return;
    running.current = true;
    const missed: Array<Tick & { detail: string }> = [];
    try {
      while (waiting.current.length > 0) {
        const tick = waiting.current.shift() as Tick;
        try {
          await save(tick);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) void client.invalidateQueries({ queryKey: ["settings"] });
          missed.push({ ...tick, detail: err instanceof ApiError && err.detail && err.status < 500 ? err.detail : "" });
          // The box goes back to what is stored.
          setWanted((now) => Object.fromEntries(Object.entries(now).filter(([side]) => side !== tick.side)));
        }
      }
    } finally {
      running.current = false;
    }
    if (missed.length > 0) setFailed(missed);
    // Every tick is saved now: the boxes read from the settings again, unless another tick has been made since.
    await client.fetchQuery({ queryKey: ["settings"], queryFn: api.settings, staleTime: 0 }).catch(() => undefined);
    if (!running.current && waiting.current.length === 0) setWanted({});
  };

  const change = (side: string, on: boolean) => {
    setFailed([]);
    setTouched(true);
    setWanted((now) => ({ ...now, [side]: on }));
    waiting.current.push({ side, on });
    void drain();
  };
  const retry = () => {
    const again = failed;
    setFailed([]);
    setWanted((now) => ({ ...now, ...Object.fromEntries(again.map((x) => [x.side, x.on])) }));
    waiting.current.push(...again.map(({ side, on }) => ({ side, on })));
    void drain();
  };

  const id = `source-sides-${props.source.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;
  const list = (names: string[]) => new Intl.ListFormat(undefined, { style: "long", type: "conjunction" }).format(names);
  const serving = options.filter((o) => ticked(o.id)).map((o) => o.name);
  const nameOf = (side: string) => options.find((o) => o.id === side)?.name ?? side;
  return (
    <fieldset className="field" data-source-sides={props.source.id} aria-describedby={`${id}-hint`}>
      <legend>{t("walkthrough.mail.sides.legend", { label: props.source.label })}</legend>
      {options.map((o) => (
        <label key={o.id} className="check-line">
          <input type="checkbox" checked={ticked(o.id)} disabled={settings.isPending} onChange={(e) => change(o.id, e.target.checked)} />
          <span>{o.name}</span>
        </label>
      ))}
      <p className="hint" id={`${id}-hint`}>
        {t("walkthrough.mail.sides.hint")}
      </p>
      {(serving.length > 0 || touched) && (
        <p className="sub" role="status" data-sides-state="">
          {serving.length > 0
            ? t("walkthrough.mail.sides.state", { label: props.source.label, sides: list(serving) })
            : t(options.length === 2 ? "walkthrough.mail.sides.none_two" : "walkthrough.mail.sides.none", { label: props.source.label })}
        </p>
      )}
      {failed.length > 0 && (
        <div className="problem-note" role="alert">
          <p>
            {t("walkthrough.mail.sides.failed", { sides: list([...new Set(failed.map((x) => nameOf(x.side)))]), label: props.source.label })}
            {failed[0].detail ? ` ${failed[0].detail}` : ""}
          </p>
          <button type="button" className="btn" onClick={retry}>
            {t("action.try_again")}
          </button>
        </div>
      )}
    </fieldset>
  );
}

export function WalkthroughMail(props: { onChooseSource: (plugin: string | null) => void; onOpenAddons: () => void }) {
  const { t } = useWords();
  const client = useQueryClient();
  const restart = useRestart();
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const signIns = useQuery({ queryKey: ["sign-ins"], queryFn: api.signIns });
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });
  const sources = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const business = useQuery({ queryKey: ["business"], queryFn: api.business });
  const mailServices = useQuery({ queryKey: ["mail-services"], queryFn: api.mailServices });
  const hasMailGuide = (mailServices.data?.length ?? 0) > 0;

  // After the app comes back the add-ons that were waiting for it are running: read their state again.
  useEffect(() => {
    if (restart.phase === "done") void client.invalidateQueries();
  }, [restart.phase, client]);

  if (packs.isPending) return <Skeleton />;
  const services = packs.data ? servicesFrom(packs.data.available, packs.data.installed) : [];
  const waiting = services.some((s) => s.state === "restart");
  const canRestart = !!status.data?.can_restart;
  const read = (sources.data ?? []).filter((s) => s.enabled && (s.reads ?? []).length > 0);
  // Nothing to sign in to and nothing read: the step says so once, with one button for what can be connected now.
  const nothingYet = services.length === 0 && read.length === 0;

  return (
    <div className="mail-step">
      {services.length > 0 ? (
        <>
          <p className="what" id="mail-services">
            {t("walkthrough.mail.services")}
          </p>
          <ul className="queue" aria-labelledby="mail-services">
            {services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                signIns={(signIns.data ?? []).filter((s) => addonOfSignIn(s.name) === service.id)}
                onOpenAddons={props.onOpenAddons}
                canRestart={canRestart}
                canUseMailbox={hasMailGuide}
              />
            ))}
          </ul>
        </>
      ) : (
        <div className="field" data-mail-none="">
          <p className={packs.isError ? "problem-note" : "hint"} id="mail-none">
            {t(packs.isError ? "walkthrough.mail.load_failed" : "walkthrough.mail.none")}
          </p>
          <div className="row-end">
            <button type="button" className="btn" aria-describedby="mail-none" onClick={() => props.onChooseSource(null)}>
              {t("walkthrough.mail.connect_one")}
            </button>
          </div>
        </div>
      )}
      {waiting && (
        <div className="restart-step" role="status">
          <p>{t(canRestart ? "walkthrough.mail.restart_why" : "walkthrough.mail.restart_manual")}</p>
          {canRestart && (
            <div className="row-end">
              <button
                type="button"
                className="btn primary"
                disabled={restart.busy || restart.waiting}
                onClick={() => void restart.now()}
              >
                {restart.waiting ? t("walkthrough.mail.restarting") : t("walkthrough.mail.restart")}
              </button>
            </div>
          )}
          {restart.phase === "refused" && restart.problem && (
            <p className="problem-note" role="alert">
              {restart.problem}
            </p>
          )}
          {restart.phase === "stuck" && (
            <p className="problem-note" role="alert">
              {t("restart.stuck")}
            </p>
          )}
        </div>
      )}
      {/* The common mail services by name: the steps for an app password, then only an address and that password. */}
      <MailServiceConnect selectId={MAIL_GUIDE_PICK} onPick={(id) => id === OTHER_MAILBOX && props.onChooseSource(null)} />
      {services.length > 0 && (
        <div className="field">
          <div className="row-end">
            <button type="button" className="btn" onClick={() => props.onChooseSource(null)}>
              {t("walkthrough.mail.other")}
            </button>
          </div>
        </div>
      )}
      {!nothingYet && (
        <>
          <p className="hint" data-set-aside="">
            {t("walkthrough.mail.set_aside")}
          </p>
          <SortingSwitch />
        </>
      )}
      {read.length > 0 && (
        <div className="field" data-reading="">
          <span className="what" id="mail-read">
            {t("walkthrough.mail.reading")}
          </span>
          <ul className="plain-list" aria-labelledby="mail-read">
            {read.map((source) => (
              <li key={source.id}>{source.label}</li>
            ))}
          </ul>
          <p className="hint">{t("walkthrough.mail.first_go")}</p>
        </div>
      )}
      {read.length > 0 && (business.data?.sides ?? []).length > 0 &&
        read.map((source) => (
          <SourceSides key={source.id} source={source} personal={business.data?.personal ?? null} sides={business.data?.sides ?? []} />
        ))}
    </div>
  );
}

/** The id of the mail service pick list, which a refused download sends the cursor to. */
const MAIL_GUIDE_PICK = "mail-service-pick";

/** One service: what it reads, where it stands and the one button for the next thing to do. */
function ServiceRow(props: { service: Service; signIns: SignIn[]; onOpenAddons: () => void; canRestart: boolean; canUseMailbox: boolean }) {
  const { t, tn } = useWords();
  const client = useQueryClient();
  const restart = useRestart();
  const { service } = props;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [done, setDone] = useState(false);
  // A private download: its refusal says an access key would fix it, so the key is asked for here; once kept, Try again.
  const [needsKey, setNeedsKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  // The person's click on the one button is the say-so for the restart; after it the sign-in opens by itself.
  const [after, setAfter] = useState(false);
  const base = `service-${service.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;
  // Installing and turning on are one button; a row that has just done them says so until the restart.
  const state: ServiceState = done && (service.state === "not_installed" || service.state === "off") ? "restart" : service.state;

  // With a restart the app can make itself, one button adds the add-on, restarts and signs in.
  const oneClick = props.canRestart;
  useEffect(() => {
    if (after && (restart.phase === "refused" || restart.phase === "stuck")) setAfter(false);
  }, [after, restart.phase]);

  const connect = async () => {
    setBusy(true);
    setProblem("");
    setNeedsKey(false);
    setKeySaved(false);
    try {
      if (service.state === "not_installed") await api.installPack(service.id);
      // The settings as they are now, so a change made meanwhile is noticed rather than overwritten.
      const current = await client.fetchQuery({ queryKey: ["settings"], queryFn: api.settings, staleTime: 0 });
      const saved = await api.packOn(service.id, current.fingerprint);
      if (saved.needs_restart && props.canRestart && oneClick) {
        setAfter(true);
        setDone(true);
        void restart.now();
      } else if (saved.needs_restart) restart.offer();
      setDone(true);
      await client.invalidateQueries();
    } catch (err) {
      setAfter(false);
      if (err instanceof ApiError && err.status === 409) void client.invalidateQueries({ queryKey: ["settings"] });
      if (err instanceof ApiError && err.needs === "read-token" && service.releaseHost) {
        // In plain words, with the key asked for here; the server's own sentence isn't shown.
        setNeedsKey(true);
        setProblem(t("walkthrough.mail.private"));
      } else setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };

  const reads = service.reads.map((kind) => t(`walkthrough.mail.reads.${kind}`)).join(t("walkthrough.mail.reads_join"));
  // Who it signs in to is the service as the person knows it: the add-on's display name, never a sign-in's id.
  const signsInTo = service.name;
  // The publisher and what it reaches are under "What it can access", with the number of keys it needs.
  const reaches = [...(service.publisher ? [t("walkthrough.mail.publisher", { publisher: service.publisher })] : []), ...serviceReachLines(service.what.reaches, t, tn)];
  const oneLine = (state === "not_installed" && service.installable) || state === "off";
  // Once the person has signed in, the row says so and what is read, and offers no Sign in.
  const signedIn = state === "ready" && props.signIns.length > 0 && props.signIns.every((item) => item.status === "signed_in");
  return (
    <li
      className="line"
      id={base}
      data-service={service.id}
      data-state={state}
      data-signed-in={signedIn ? "" : undefined}
      aria-labelledby={`${base}-name`}
    >
      <div className="row pair">
        <div className="text pack">
          <strong id={`${base}-name`}>{service.name}</strong>
          <span className="sub">{t("walkthrough.mail.reads_line", { reads })}</span>
          {service.summary && <p className="pack-summary">{service.summary}</p>}
          <details className="more-options">
            <summary>{t("walkthrough.mail.reaches")}</summary>
            <ul className="plain-list">
              {reaches.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
          {/* Installing or turning on is one line and one button; the other states say where the service stands. */}
          {oneLine ? (
            <p className="hint" id={`${base}-state`} data-needs-addon="">
              {t(oneClick ? "walkthrough.mail.signs_in" : "walkthrough.mail.signs_in_manual", { service: signsInTo })}
            </p>
          ) : (
            <p className="sub" id={`${base}-state`}>
              {state === "problem" && service.reason
                ? t("walkthrough.mail.state.problem", { reason: service.reason })
                : signedIn
                  ? t("walkthrough.mail.state.signed_in", { reads })
                  : t(`walkthrough.mail.state.${state}`)}
            </p>
          )}
          {problem && (
            <p className="problem-note" role="alert">
              {problem}
            </p>
          )}
          {needsKey && service.releaseHost && (
            <>
              <ReadToken
                plain
                pack={{ id: service.id, name: service.name }}
                base={base}
                host={service.releaseHost}
                onSaved={() => {
                  setNeedsKey(false);
                  setProblem("");
                  setKeySaved(true);
                }}
              />
              {props.canUseMailbox && (
                <div>
                  <button
                    type="button"
                    className="btn quiet"
                    onClick={() => document.getElementById(MAIL_GUIDE_PICK)?.focus()}
                  >
                    {t("walkthrough.mail.or_mailbox")}
                  </button>
                </div>
              )}
            </>
          )}
          {keySaved && (
            <div role="status">
              <p className="sub">{t("walkthrough.mail.key_saved")}</p>
              <button type="button" className="btn primary" disabled={busy} onClick={() => void connect()}>
                {t("action.try_again")}
              </button>
            </div>
          )}
          {state === "ready" &&
            props.signIns.map((item, i) => (
              <ServiceSignIn
                key={item.name}
                item={item}
                autostart={after && i === 0}
                onStarted={() => setAfter(false)}
              />
            ))}
        </div>
        <div className="acts">
          {state === "not_installed" && service.installable && (
            <button
              type="button"
              className="btn primary"
              disabled={busy || after}
              aria-describedby={`${base}-state`}
              onClick={() => void connect()}
            >
              {busy || after ? t("walkthrough.mail.connecting") : t("walkthrough.mail.connect", { name: service.name })}
            </button>
          )}
          {state === "not_installed" && !service.installable && (
            <button type="button" className="btn" onClick={props.onOpenAddons}>
              {t("walkthrough.mail.get_it")}
            </button>
          )}
          {state === "off" && (
            <button
              type="button"
              className="btn primary"
              disabled={busy || after}
              aria-describedby={`${base}-state`}
              onClick={() => void connect()}
            >
              {busy || after ? t("walkthrough.mail.connecting") : t("walkthrough.mail.connect", { name: service.name })}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** A sign-in of a running service: where it stands, and the button that opens the service's own page in its own window.
 *  The screen says it is waiting, then how it went; a refusal shows the service's reason and Try again. */
function ServiceSignIn(props: { item: SignIn; autostart?: boolean; onStarted?: () => void }) {
  const { t } = useWords();
  const client = useQueryClient();
  const { item } = props;
  const { start, phase, text } = useSignInWindow(item.name);
  const tried = useRef(false);
  useEffect(() => {
    if (!props.autostart || tried.current) return;
    tried.current = true;
    props.onStarted?.();
    void start();
  }, [props.autostart]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase === "done") void client.invalidateQueries();
  }, [phase, client]);
  const signedIn = item.status === "signed_in";
  const again = item.status === "expired";
  const busy = phase === "starting" || phase === "waiting";
  const retry = phase === "refused" || phase === "closed" || phase === "failed" || phase === "blocked";
  return (
    <div className="service-sign-in" data-sign-in={item.name}>
      {signedIn ? (
        <p className="sub">
          <Icon name="check" size={14} />{" "}
          {item.account ? t("walkthrough.mail.signed_in_as", { account: item.account }) : t("walkthrough.mail.signed_in")}
        </p>
      ) : (
        <>
          {(item.allows ?? []).length > 0 && (
            <p className="sub">{t("walkthrough.mail.allows", { allows: (item.allows ?? []).join("; ") })}</p>
          )}
          {phase === "waiting" && (
            <p className="sub" role="status">
              {t("sign_in.window.waiting")}
            </p>
          )}
          {phase === "done" && (
            <p className="sub" role="status">
              {t("sign_in.window.done")}
            </p>
          )}
          {text && (
            <p className="problem-note" role="alert">
              {text}
            </p>
          )}
          <div className="row-end">
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              aria-label={t(again ? "sign_in.sign_in_again_named" : "sign_in.sign_in_named", { label: item.label })}
              onClick={() => void start()}
            >
              {busy ? t("sign_in.working") : retry ? t("sign_in.window.try_again") : t(again ? "sign_in.sign_in_again" : "sign_in.sign_in")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
