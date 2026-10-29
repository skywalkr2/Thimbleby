// The mail and calendar screen of the walkthrough (design 7.8): the services the person can connect, each in the state it
// is in. One not yet installed is installed and turned on with one button; one installed but off is turned on; then the
// one restart. Where the app can restart itself, one button does all of it (the click is the say-so, and the button says
// the app restarts), then shows "Sign in to {service}", so the sign-in window opens from the person's own click; otherwise
// the visible "Restart to finish connecting" stays, never made on its own. Once a service is connected the step leads with
// the result: what is connected and read, one question for who it is for, the set-aside choice as one line and Continue;
// the services list folds behind "Connect another". The core's own mail folder and calendar address are offered as
// "Add mail, calendar or folder". With no service listed and nothing read yet, the step is one sentence, one button and the way
// out the walkthrough already has (skip it).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { serviceReachLines, waitsForRestart } from "../lib/packs";
import { problemText } from "../lib/problem";
import { useRestart } from "../lib/restart";
import { freshSettings, useAfterSave, useFreshFingerprint } from "../lib/settings-save";
import { useSignInWindow } from "../lib/sign-in-window";
import { useContinue } from "../lib/walkthrough-continue";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { addonOfSignIn } from "./SignIns";
import { Icon } from "../ui/Icon";
import { MailServiceConnect, OTHER_MAILBOX } from "./MailServiceConnect";
import { useSourceSave } from "./Sources";
import { ReadToken } from "./ReadToken";
import { FormBlock } from "../ui/FormBlock";
import { CheckboxGroup } from "../ui/CheckboxGroup";
import { Actions } from "../ui/Actions";
import { RowList } from "../ui/RowList";
import { Row } from "../ui/Row";

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
    <FormBlock data-sorting="">
      <label className="check-line">
        <input type="checkbox" checked={on} disabled={settings.isPending} onChange={(e) => void change(e.target.checked)} />
        <span>{t("walkthrough.mail.sorting")}</span>
      </label>
      <p className="hint">{t("walkthrough.mail.sorting_hint")}</p>
      {problem && (
        <div className="problem-note" role="alert">
          <p>{problem}</p>
          <Button onClick={() => void change(again)}>
            {t("action.try_again")}
          </Button>
        </div>
      )}
    </FormBlock>
  );
}

const SOURCES = "watch.sources";

const listOf = (names: string[]) => new Intl.ListFormat(undefined, { style: "long", type: "conjunction" }).format(names);

/** Which sides of the person's life a mailbox or calendar serves, as tick boxes: Personal and each side. Each tick is saved at
 * once as the source's `sides`, through the settings save (the whole list of sources, read fresh). A tick made while an
 * earlier one is still being saved is queued and saved after it, and the boxes and the line under them show the choices as made,
 * so the last words always match the boxes. The step raises no message for a tick: a tick is undone by unticking it, and one
 * that couldn't be saved names its box and offers Try again. Nothing ticked is allowed: it means not said. With several sources
 * (`group`), one set of boxes is saved to every one of them in the same save, and a box shows ticked when all of them hold it. */
function SourceSides(props: { sources: Source[]; group?: boolean; what?: string; personal: string | null; sides: S["SideView"][] }) {
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
  const heldBy = (id: string) => new Set(stored.find((s) => s.id === id)?.sides ?? []);
  const ticked = (side: string) => wanted[side] ?? props.sources.every((src) => heldBy(src.id).has(side));
  const mine = props.sources.map((src) => src.id);
  const label = props.sources[0]?.label ?? "";
  const many = props.sources.length > 1;

  const save = async ({ side, on }: Tick) => {
    // The settings as they are now, so a change made meanwhile is noticed rather than overwritten.
    const current = await freshSettings(client);
    const list = (current.items.find((i) => i.key === SOURCES)?.value ?? []) as Array<Record<string, unknown> & { id: string; sides?: string[] }>;
    const withTick = (had: string[] | undefined): string[] => {
      const now = new Set(had ?? []);
      if (on) now.add(side);
      else now.delete(side);
      // In the order of the choices, then any side the source names that isn't offered, which a tick leaves as it was.
      return [...options.map((o) => o.id).filter((id) => now.has(id)), ...[...now].filter((id) => !options.some((o) => o.id === id))];
    };
    const changes = { [SOURCES]: list.map((s) => (mine.includes(s.id) ? { ...s, sides: withTick(s.sides) } : s)) };
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
    await freshSettings(client).catch(() => undefined);
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

  const id = `source-sides-${mine.join("-").replace(/[^A-Za-z0-9_-]/g, "-")}`;
  const list = listOf;
  const count = many ? "other" : "one";
  const serving = options.filter((o) => ticked(o.id)).map((o) => o.name);
  const nameOf = (side: string) => options.find((o) => o.id === side)?.name ?? side;
  return (
    <CheckboxGroup legend={props.group ? t(`walkthrough.mail.sides.group.legend_${count}`) : t("walkthrough.mail.sides.legend", { label: label })} data-source-sides={props.group ? undefined : mine[0]} data-sign-in-sides={props.group ? "" : undefined} aria-describedby={`${id}-hint`}>
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
        <p className="hint" role="status" data-sides-state="">
          {props.group
            ? serving.length > 0
              ? t(`walkthrough.mail.sides.group.state_${count}`, { sides: list(serving) })
              : t(`walkthrough.mail.sides.group.none_${count}${options.length === 2 ? "_two" : ""}`)
            : serving.length > 0
              ? t("walkthrough.mail.sides.state", { label, sides: list(serving) })
              : t(options.length === 2 ? "walkthrough.mail.sides.none_two" : "walkthrough.mail.sides.none", { label })}
        </p>
      )}
      {failed.length > 0 && (
        <div className="problem-note" role="alert">
          <p>
            {t("walkthrough.mail.sides.failed", {
              sides: list([...new Set(failed.map((x) => nameOf(x.side)))]),
              label: props.group ? (props.what ?? "") : label,
            })}
            {failed[0].detail ? ` ${failed[0].detail}` : ""}
          </p>
          <Button onClick={retry}>
            {t("action.try_again")}
          </Button>
        </div>
      )}
    </CheckboxGroup>
  );
}

/** The sides question for what one sign-in reads: one set of boxes for all of its sources, with a quiet way to set them
 * separately. Where the sources already serve different sides, each is asked on its own, and once asked that way it stays so. */
function SignInSides(props: { sources: Source[]; what: string; personal: string | null; sides: S["SideView"][] }) {
  const { t } = useWords();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [apart, setApart] = useState(false);
  const latched = useRef(false);
  const stored = (settings.data?.items.find((i) => i.key === SOURCES)?.value ?? []) as Array<{ id: string; sides?: string[] }>;
  const held = props.sources.map((src) => [...(stored.find((s) => s.id === src.id)?.sides ?? [])].sort().join("|"));
  if (props.sources.length > 1 && new Set(held).size > 1) latched.current = true;
  if (props.sources.length > 1 && (apart || latched.current)) {
    return (
      <>
        {props.sources.map((source) => (
          <SourceSides key={source.id} sources={[source]} personal={props.personal} sides={props.sides} />
        ))}
      </>
    );
  }
  return (
    <>
      <SourceSides sources={props.sources} group what={props.what} personal={props.personal} sides={props.sides} />
      {props.sources.length > 1 && (
        <div>
          <Button variant="quiet" onClick={() => setApart(true)}>
            {t("walkthrough.mail.sides.separately")}
          </Button>
        </div>
      )}
    </>
  );
}

/** One line saying whether newsletters, sales and mailing lists are set aside, with Change opening the switch in place. */
function SetAsideLine() {
  const { t } = useWords();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [open, setOpen] = useState(false);
  const on = settings.data?.items.find((i) => i.key === SORTING)?.value !== "rules";
  return (
    <FormBlock data-set-aside-line="">
      <p className="hint">
        {t(on ? "walkthrough.mail.aside.on" : "walkthrough.mail.aside.off")} <span aria-hidden="true">·</span>{" "}
        <Button variant="quiet" aria-expanded={open} onClick={() => setOpen((x) => !x)}>
          {t("walkthrough.mail.aside.change")}
        </Button>
      </p>
      {open && <SortingSwitch />}
    </FormBlock>
  );
}

export function WalkthroughMail(props: {
  onChooseSource: (plugin: string | null, kind?: string) => void;
  onOpenAddons: () => void;
  /** Moves on to the next screen. With it, the step draws its Continue under the result of a connection. */
  onContinue?: () => void;
  /** The move on is being made. */
  continuing?: boolean;
}) {
  const { t } = useWords();
  const client = useQueryClient();
  const save = useSourceSave();
  const restart = useRestart();
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const signIns = useQuery({ queryKey: ["sign-ins"], queryFn: api.signIns });
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });
  const sources = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const business = useQuery({ queryKey: ["business"], queryFn: api.business });
  const mailServices = useQuery({ queryKey: ["mail-services"], queryFn: api.mailServices });
  const hasMailGuide = (mailServices.data?.length ?? 0) > 0;
  // The services list is folded behind "Connect another" once a service is connected; pressing it shows the list.
  const [revealed, setRevealed] = useState(false);
  const result = useRef<HTMLDivElement>(null);
  const shown = useRef<boolean | null>(null);

  // After the app comes back the add-ons that were waiting for it are running: read their state again.
  useEffect(() => {
    if (restart.phase === "done") void client.invalidateQueries();
  }, [restart.phase, client]);

  const services = packs.data ? servicesFrom(packs.data.available, packs.data.installed) : [];
  const read = (sources.data ?? []).filter((s) => s.enabled && (s.reads ?? []).length > 0);
  // A connected service: running, with every sign-in of it signed in. What it reads is the sources of its add-on.
  const connected = services
    .filter((service) => {
      const mine = (signIns.data ?? []).filter((s) => addonOfSignIn(s.name) === service.id);
      return service.state === "ready" && mine.length > 0 && mine.every((s) => s.status === "signed_in");
    })
    .map((service) => {
      // The service as the person knows it: the catalog's name, or for an add-on no catalog lists, its sign-in's own label.
      const mine = (signIns.data ?? []).filter((s) => addonOfSignIn(s.name) === service.id);
      const title = service.name !== service.id ? service.name : (mine[0]?.label ?? service.name);
      return { service, title, reads: read.filter((s) => addonOfSignIn(s.connector) === service.id) };
    });
  const covered = new Set(connected.flatMap((c) => c.reads.map((s) => s.id)));
  const others = read.filter((s) => !covered.has(s.id));
  const hasResult = connected.length > 0;

  // The step's own Continue is drawn under the result, so the walkthrough leaves its own out.
  useContinue(hasResult && props.onContinue ? { run: async () => true, inline: true } : null);
  // A result that appears while the screen is open (the sign-in just finished) takes the cursor to its first field.
  useEffect(() => {
    const was = shown.current;
    shown.current = hasResult;
    if (was === false && hasResult) {
      const first = result.current?.querySelector<HTMLElement>("input[type=checkbox], button");
      first?.focus();
    }
  }, [hasResult]);

  if (packs.isPending) return <Skeleton />;
  const waiting = services.some((s) => s.state === "restart");
  const canRestart = !!status.data?.can_restart;
  // Nothing to sign in to and nothing read: the step says so once, with one button for what can be connected now.
  const nothingYet = services.length === 0 && read.length === 0;
  const folded = hasResult && !revealed;
  const hasSides = (business.data?.sides ?? []).length > 0;

  return (
    <div className="mail-step">
      {hasResult && (
        <div ref={result} data-mail-result="">
          {connected.map(({ service, title, reads }) => {
            const what = listOf(reads.map((s) => s.label));
            return (
              <FormBlock as="section" key={service.id}  data-reading="" data-connected={service.id}>
                <p className="what">
                  <strong>{t("walkthrough.mail.result.connected", { service: title })}</strong>
                  {reads.length > 0 && <> {t("walkthrough.mail.result.reading", { what })}</>}
                </p>
                {reads.length > 0 && <p className="hint">{t("walkthrough.mail.first_go")}</p>}
                {reads.length > 0 && hasSides && (
                  <SignInSides sources={reads} what={what} personal={business.data?.personal ?? null} sides={business.data?.sides ?? []} />
                )}
              </FormBlock>
            );
          })}
          <SetAsideLine />
          {props.onContinue && (
            <Actions align="end">
              <Button variant="primary" loading={props.continuing} onClick={props.onContinue}>
                {t("walkthrough.next")}
              </Button>
            </Actions>
          )}
        </div>
      )}
      {folded && (
        <FormBlock>
          <Button variant="quiet" aria-expanded={false} onClick={() => setRevealed(true)}>
            {t("walkthrough.mail.connect_another")}
          </Button>
        </FormBlock>
      )}
      {!folded && services.length > 0 && (
        <>
          <p className="what" id="mail-services">
            {t("walkthrough.mail.services")}
          </p>
          <RowList aria-labelledby="mail-services">
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
          </RowList>
        </>
      )}
      {services.length === 0 && (
        <FormBlock data-mail-none="">
          <p className={packs.isError ? "problem-note" : "hint"} id="mail-none">
            {t(packs.isError ? "walkthrough.mail.load_failed" : "walkthrough.mail.none")}
          </p>
          <Actions align="end">
            <Button aria-describedby="mail-none" onClick={() => props.onChooseSource(null)}>
              {t("walkthrough.mail.connect_one")}
            </Button>
          </Actions>
        </FormBlock>
      )}
      {waiting && (
        <div className="restart-step" role="status">
          <p>{t(canRestart ? "walkthrough.mail.restart_why" : "walkthrough.mail.restart_manual")}</p>
          {canRestart && (
            <Actions align="end">
              <Button variant="primary"
                disabled={restart.busy || restart.waiting}
                onClick={() => void restart.now()}
              >
                {restart.waiting ? t("walkthrough.mail.restarting") : t("walkthrough.mail.restart")}
              </Button>
            </Actions>
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
      {!folded && <MailServiceConnect selectId={MAIL_GUIDE_PICK} onPick={(id) => id === OTHER_MAILBOX && props.onChooseSource(null, "mailbox")} />}
      {!folded && services.length > 0 && (
        <FormBlock>
          <Actions align="end">
            <Button onClick={() => props.onChooseSource(null)}>
              {t("walkthrough.mail.other")}
            </Button>
          </Actions>
        </FormBlock>
      )}
      {!nothingYet && !hasResult && (
        <>
          <p className="hint" data-set-aside="">
            {t("walkthrough.mail.set_aside")}
          </p>
          <SortingSwitch />
        </>
      )}
      {others.length > 0 && (
        <FormBlock data-reading="">
          <span className="what" id="mail-read">
            {t("walkthrough.mail.reading")}
          </span>
          <ul className="plain-list" aria-labelledby="mail-read">
            {others.map((source) => (
              <li key={source.id}>
                <span>{source.label}</span>
                <Button variant="quiet"
                  onClick={() => void save((fingerprint) => api.removeSource(source.id, fingerprint), t("sources.removed_toast", { label: source.label }))}
                >
                  {t("sources.remove")} <span className="sr">{source.label}</span>
                </Button>
              </li>
            ))}
          </ul>
          {!hasResult && <p className="hint">{t("walkthrough.mail.first_go")}</p>}
        </FormBlock>
      )}
      {others.length > 0 && hasSides &&
        others.map((source) => (
          <SourceSides key={source.id} sources={[source]} personal={business.data?.personal ?? null} sides={business.data?.sides ?? []} />
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
  // The person's click on the one button is the say-so for the restart; after it the sign-in waits for their own click on
  // "Sign in to {service}", which opens its window (a window opened by the app itself is blocked as a pop-up).
  const [after, setAfter] = useState(false);
  const base = `service-${service.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;
  // Installing and turning on are one button; a row that has just done them says so until the restart.
  const state: ServiceState = done && (service.state === "not_installed" || service.state === "off") ? "restart" : service.state;

  // With a restart the app can make itself, one button adds the add-on and restarts; the sign-in is the next click.
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
      const current = await freshSettings(client);
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
    <Row id={base} data-service={service.id} data-state={state} data-signed-in={signedIn ? "" : undefined} aria-labelledby={`${base}-name`} loop={false} title={service.name} titleId={`${base}-name`} meta={t("walkthrough.mail.reads_line", { reads })} actions={<>{state === "not_installed" && service.installable && (
            <Button variant="primary"
              disabled={busy || after}
              aria-describedby={`${base}-state`}
              onClick={() => void connect()}
            >
              {busy || after ? t("walkthrough.mail.connecting") : t("walkthrough.mail.connect", { name: service.name })}
            </Button>
          )}
          {state === "not_installed" && !service.installable && (
            <Button onClick={props.onOpenAddons}>
              {t("walkthrough.mail.get_it")}
            </Button>
          )}
          {state === "off" && (
            <Button variant="primary"
              disabled={busy || after}
              aria-describedby={`${base}-state`}
              onClick={() => void connect()}
            >
              {busy || after ? t("walkthrough.mail.connecting") : t("walkthrough.mail.connect", { name: service.name })}
            </Button>
          )}</>}>
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
            <p className="hint" id={`${base}-state`}>
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
                  <Button variant="quiet"
                    onClick={() => document.getElementById(MAIL_GUIDE_PICK)?.focus()}
                  >
                    {t("walkthrough.mail.or_mailbox")}
                  </Button>
                </div>
              )}
            </>
          )}
{keySaved && (
            <div role="status">
              <p className="hint">{t("walkthrough.mail.key_saved")}</p>
              <Button variant="primary" disabled={busy} onClick={() => void connect()}>
                {t("action.try_again")}
              </Button>
            </div>
          )}
{state === "ready" &&
            props.signIns.map((item, i) => (
              <ServiceSignIn
                key={item.name}
                item={item}
                resumed={after && i === 0 ? service.name : undefined}
                onStarted={() => setAfter(false)}
              />
            ))}
</Row>
  );
}

/** A sign-in of a running service: where it stands, and the button that opens the service's own page in its own window.
 *  The screen says it is waiting, then how it went; a refusal shows the service's reason and Try again. Right after the
 *  restart a connection needed (`resumed`, the service's name), the button reads "Sign in to {service}" and holds the cursor:
 *  the window opens from the person's click. */
function ServiceSignIn(props: { item: SignIn; resumed?: string; onStarted?: () => void }) {
  const { t } = useWords();
  const client = useQueryClient();
  const { item } = props;
  const { start, phase, text } = useSignInWindow(item.name);
  const button = useRef<HTMLButtonElement>(null);
  const resumed = props.resumed && item.status !== "signed_in" ? props.resumed : undefined;
  useEffect(() => {
    if (resumed) button.current?.focus();
  }, [resumed]);
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
        <p className="hint">
          <Icon name="check" size={14} />{" "}
          {item.account ? t("walkthrough.mail.signed_in_as", { account: item.account }) : t("walkthrough.mail.signed_in")}
        </p>
      ) : (
        <>
          {(item.allows ?? []).length > 0 && (
            <p className="hint">{t("walkthrough.mail.allows", { allows: (item.allows ?? []).join("; ") })}</p>
          )}
          {resumed && phase === "idle" && (
            <p className="hint" role="status">
              {t("walkthrough.mail.resumed", { service: resumed })}
            </p>
          )}
          {phase === "waiting" && (
            <p className="hint" role="status">
              {t("sign_in.window.waiting")}
            </p>
          )}
          {phase === "done" && (
            <p className="hint" role="status">
              {t("sign_in.window.done")}
            </p>
          )}
          {text && (
            <p className="problem-note" role="alert">
              {text}
            </p>
          )}
          <Actions align="end">
            <Button variant="primary"
              ref={button}
              disabled={busy}
              aria-label={resumed ? undefined : t(again ? "sign_in.sign_in_again_named" : "sign_in.sign_in_named", { label: item.label })}
              onClick={() => {
                props.onStarted?.();
                void start();
              }}
            >
              {busy
                ? t("sign_in.working")
                : retry
                  ? t("sign_in.window.try_again")
                  : resumed
                    ? t("walkthrough.mail.sign_in_to", { service: resumed })
                    : t(again ? "sign_in.sign_in_again" : "sign_in.sign_in")}
            </Button>
          </Actions>
        </>
      )}
    </div>
  );
}
