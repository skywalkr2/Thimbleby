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
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { addonOfSignIn } from "./SignIns";
import { Icon } from "../ui/Icon";
import { SetupAccountRow } from "./SetupAccountRow";
import { accountStates } from "../lib/connections";
import { MailServiceConnect, OTHER_MAILBOX } from "./MailServiceConnect";
import { useSourceSave } from "./Sources";
import { ReadToken } from "./ReadToken";
import { FormBlock } from "../ui/FormBlock";
import { useContinue } from "../lib/walkthrough-continue";
import { Actions } from "../ui/Actions";
import { RowList } from "../ui/RowList";
import { SOURCES, SourceSides, listOf } from "./SourceSides";
import styles from "./WalkthroughMail.module.css";
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

/** A source's name inside a sentence after the first: a capital that only starts the name ("Your calendar") is lower-cased. */
const midSentence = (name: string, at: number) => (at > 0 && /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name);

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

/** The sides question for what one sign-in (or, with several accounts of a service, one account) reads: one set of boxes for all
 * of its sources, with a quiet way to set them separately. Where the sources already serve different sides, each is asked on its own, and once asked that way it stays so. */
function SignInSides(props: { sources: Source[]; what: string; account?: string; labelOf: (source: Source) => string; personal: string | null; sides: S["SideView"][]; compact?: boolean; hintId?: string }) {
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
          <SourceSides key={source.id} sources={[source]} label={props.labelOf(source)} personal={props.personal} sides={props.sides} compact={props.compact} hintId={props.hintId} />
        ))}
      </>
    );
  }
  return (
    <>
      <SourceSides sources={props.sources} group what={props.what} account={props.account} personal={props.personal} sides={props.sides} compact={props.compact} hintId={props.hintId} />
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
  const [mailbox, setMailbox] = useState(false);
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
  // A service with more than one account: each source's label is followed by its account, so two inboxes can be told apart.
  const accountsOf = (addon: string | null) => [...new Set(read.filter((s) => addonOfSignIn(s.connector) === addon).flatMap((s) => (s.account ? [s.account] : [])))];
  const labelOf = (source: Source) =>
    source.account && accountsOf(addonOfSignIn(source.connector)).length > 1 && !source.label.includes(source.account)
      ? t("walkthrough.mail.source_with_account", { source: source.label, account: source.account })
      : source.label;
  // A source's name without its account, for the row of that account: the app names a source of several accounts by its account.
  const shortOf = (source: Source) => (source.account && source.label.endsWith(`, ${source.account}`) ? source.label.slice(0, -(source.account.length + 2)) : source.label);
  // The service as the person knows it: the catalog's name, or for an add-on no catalog lists, its sign-in's own label.
  const displayName = (service: Service) =>
    service.name !== service.id ? service.name : ((signIns.data ?? []).find((s) => addonOfSignIn(s.name) === service.id)?.label ?? service.name);
  const covered = new Set(connected.flatMap((c) => c.reads.map((s) => s.id)));
  const others = read.filter((s) => !covered.has(s.id));
  const hasResult = connected.length > 0;

  // Continue is the walkthrough's own, in the footer on the column's edge like every other step's: it comes once something is
  // connected (or the step was done or left for later), so this step draws none of its own and only says that it can be pressed.
  useContinue(hasResult ? { run: async () => true } : null);
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
  const firstCard = !folded && !hasResult && services.length > 0;
  const hasSides = (business.data?.sides ?? []).length > 0;

  return (
    <div className="mail-step">
      {hasResult && (
        <div ref={result} data-mail-result="">
          {connected.map(({ service, title, reads }) => {
            const what = listOf(reads.map(labelOf));
            // With several accounts the question is asked of each account's sources, in the order the accounts first appear.
            const several = accountsOf(service.id).length > 1;
            const groups = several ? [...new Set(reads.map((s) => s.account ?? ""))] : [null];
            const hintId = `sides-hint-${service.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;
            return (
              <FormBlock as="section" key={service.id}  data-reading="" data-connected={service.id}>
                <p className="what">
                  <strong>{t("walkthrough.mail.result.connected", { service: title })}</strong>
                  {reads.length > 0 && <> {several ? t("walkthrough.mail.result.accounts", { n: groups.length }) : t("walkthrough.mail.result.reading", { what })}</>}
                </p>
                {reads.length > 0 && <p className="hint">{t("walkthrough.mail.first_go")}</p>}
                {reads.length > 0 && hasSides && several && (
                  <p className="hint" id={hintId}>
                    {t("walkthrough.mail.sides.hint")}
                  </p>
                )}
                {several ? (
                  // One compact row for each account: its address, what is read there, and who it is for.
                  <ul className="account-rows" aria-label={t("walkthrough.mail.accounts_label")} data-account-rows="">
                    {groups.map((account) => {
                      const mine = reads.filter((s) => (s.account ?? "") === account);
                      // An account the service no longer lets in says since when and offers Sign in again, in the same row.
                      const needing = accountStates(mine).find((a) => a.need !== null);
                      return (
                        <SetupAccountRow
                          key={account ?? ""}
                          address={account ?? ""}
                          service={title}
                          reads={listOf(mine.map(shortOf).map((n, i) => midSentence(n, i)))}
                          sources={mine}
                          need={needing}
                          sidesEditor={
                            hasSides ? (
                              <SignInSides
                                sources={mine}
                                what={listOf(mine.map(labelOf))}
                                account={account || undefined}
                                labelOf={labelOf}
                                personal={business.data?.personal ?? null}
                                sides={business.data?.sides ?? []}
                                compact
                                hintId={hintId}
                              />
                            ) : undefined
                          }
                        />
                      );
                    })}
                  </ul>
                ) : (
                  reads.length > 0 &&
                  hasSides &&
                  groups.map((account) => {
                    const mine = account === null ? reads : reads.filter((s) => (s.account ?? "") === account);
                    return (
                      <SignInSides
                        key={account ?? ""}
                        sources={mine}
                        what={account === null ? what : listOf(mine.map(labelOf))}
                        account={account || undefined}
                        labelOf={labelOf}
                        personal={business.data?.personal ?? null}
                        sides={business.data?.sides ?? []}
                      />
                    );
                  })
                )}
              </FormBlock>
            );
          })}
          <SetAsideLine />
        </div>
      )}
      {folded && (
        <FormBlock>
          <div>
            <Button variant="secondary" size="sm" icon="plus" aria-expanded={false} onClick={() => setRevealed(true)}>
              {t("walkthrough.mail.connect_another")}
            </Button>
          </div>
        </FormBlock>
      )}
      {/* With no account yet the services, the restart note and the plain mailbox are one centred card: the services as rows to sign in
          with, the mailbox the quieter choice under them. */}
      <div className={firstCard ? styles.first : styles.plain} data-first-card={firstCard ? "" : undefined}>
      {!folded && services.length > 0 && (
        <>
          {!hasResult ? (
            <div className={styles.lead} data-first-account="">
              <h3 className={styles.leadTitle} id="mail-services">
                {t("walkthrough.mail.none_title")}
              </h3>
              <p className="hint">{t("walkthrough.mail.first_account")}</p>
            </div>
          ) : (
            <p className="what" id="mail-services">
              {t("walkthrough.mail.services")}
            </p>
          )}
          <RowList aria-labelledby="mail-services">
            {services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                title={displayName(service)}
                plain={!hasResult}
                signIns={(signIns.data ?? []).filter((s) => addonOfSignIn(s.name) === service.id)}
                onOpenAddons={props.onOpenAddons}
                canRestart={canRestart}
                canUseMailbox={hasMailGuide}
                onMailbox={() => setMailbox(true)}
              />
            ))}
          </RowList>
        </>
      )}
      {services.length === 0 && (
        <FormBlock data-mail-none="">
          <EmptyState
            icon="inbox"
            title={packs.isError ? undefined : t("walkthrough.mail.none_title")}
            text={
              <span className={packs.isError ? "problem-note" : undefined} id="mail-none">
                {t(packs.isError ? "walkthrough.mail.load_failed" : "walkthrough.mail.none")}
              </span>
            }
          >
            <Button icon="plus" aria-describedby="mail-none" onClick={() => props.onChooseSource(null)}>
              {t("walkthrough.mail.connect_one")}
            </Button>
          </EmptyState>
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
      {/* The common mail services by name: the steps for an app password, then only an address and that password. With no
          account yet this is the quieter second choice inside the first-account card, folded. */}
      {!folded && !hasResult && services.length > 0 && (
        <details className="more-options" data-mailbox-choice="" open={mailbox} onToggle={(e) => setMailbox(e.currentTarget.open)}>
          <summary>{t("walkthrough.mail.mailbox_instead")}</summary>
          <MailServiceConnect selectId={MAIL_GUIDE_PICK} onPick={(id) => id === OTHER_MAILBOX && props.onChooseSource(null, "mailbox")} />
          <FormBlock>
            <Actions align="end">
              <Button variant="quiet" onClick={() => props.onChooseSource(null)}>
                {t("walkthrough.mail.other")}
              </Button>
            </Actions>
          </FormBlock>
        </details>
      )}
      </div>
      {!folded && (hasResult || services.length === 0) && <MailServiceConnect selectId={MAIL_GUIDE_PICK} onPick={(id) => id === OTHER_MAILBOX && props.onChooseSource(null, "mailbox")} />}
      {!folded && hasResult && services.length > 0 && (
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
            {t(hasResult ? "walkthrough.mail.reading_also" : "walkthrough.mail.reading")}
          </span>
          <ul className="plain-list" aria-labelledby="mail-read">
            {others.map((source) => (
              <li key={source.id}>
                <span>{labelOf(source)}</span>
                <Button variant="quiet"
                  onClick={() => void save((fingerprint) => api.removeSource(source.id, fingerprint), t("sources.removed_toast", { label: source.label }))}
                >
                  {t("sources.remove")} <span className="sr">{labelOf(source)}</span>
                </Button>
              </li>
            ))}
          </ul>
          {!hasResult && <p className="hint">{t("walkthrough.mail.first_go")}</p>}
        </FormBlock>
      )}
      {others.length > 0 && hasSides &&
        others.map((source) => (
          <SourceSides key={source.id} sources={[source]} label={labelOf(source)} personal={business.data?.personal ?? null} sides={business.data?.sides ?? []} />
        ))}
    </div>
  );
}

/** The id of the mail service pick list, which a refused download sends the cursor to. */
const MAIL_GUIDE_PICK = "mail-service-pick";

/** One service: what it reads, where it stands and the one button for the next thing to do. */
function ServiceRow(props: { service: Service; title: string; plain: boolean; onMailbox: () => void; signIns: SignIn[]; onOpenAddons: () => void; canRestart: boolean; canUseMailbox: boolean }) {
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
  const signsInTo = props.title;
  // The publisher and what it reaches are under "What it can access", with the number of keys it needs.
  const reaches = [...(service.publisher ? [t("walkthrough.mail.publisher", { publisher: service.publisher })] : []), ...serviceReachLines(service.what.reaches, t, tn)];
  const oneLine = (state === "not_installed" && service.installable) || state === "off";
  // Once the person has signed in, the row says so and what is read, and offers no Sign in.
  const signedIn = state === "ready" && props.signIns.length > 0 && props.signIns.every((item) => item.status === "signed_in");
  return (
    <Row id={base} data-service={service.id} data-state={state} data-signed-in={signedIn ? "" : undefined} aria-labelledby={`${base}-name`} loop={false} title={props.title} titleId={`${base}-name`} meta={t("walkthrough.mail.reads_line", { reads })} actions={<>{state === "not_installed" && service.installable && (
            <Button variant="primary"
              disabled={busy || after}
              aria-describedby={`${base}-state`}
              onClick={() => void connect()}
            >
              {busy || after ? t("walkthrough.mail.connecting") : t("walkthrough.mail.connect", { name: props.title })}
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
              {busy || after ? t("walkthrough.mail.connecting") : t("walkthrough.mail.connect", { name: props.title })}
            </Button>
          )}</>}>
{service.summary && !props.plain && <p className="pack-summary">{service.summary}</p>}
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
                    onClick={() => {
                      props.onMailbox();
                      window.setTimeout(() => document.getElementById(MAIL_GUIDE_PICK)?.focus(), 0);
                    }}
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
                resumed={after && i === 0 ? props.title : undefined}
                onStarted={() => setAfter(false)}
              />
            ))}
</Row>
  );
}

/** What the screen says while the service's own window is open: where to finish, that this page carries on by itself, and the way
 * to stop waiting. */
function WaitingBanner(props: { onCancel: () => void }) {
  const { t } = useWords();
  return (
    <div className="wait-banner" role="status" data-sign-in-waiting="">
      <Icon name="external" size={16} />
      <p>
        <strong>{t("sign_in.window.waiting_title")}</strong> {t("sign_in.window.waiting_rest")}
      </p>
      <Button size="sm" onClick={props.onCancel}>
        {t("action.cancel")}
      </Button>
    </div>
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
  const { start, cancel, phase, text } = useSignInWindow(item.name);
  const button = useRef<HTMLButtonElement>(null);
  const resumed = props.resumed && item.status !== "signed_in" ? props.resumed : undefined;
  useEffect(() => {
    if (resumed) button.current?.focus();
  }, [resumed]);
  useEffect(() => {
    if (phase === "done") void client.invalidateQueries();
  }, [phase, client]);
  const signedIn = item.status === "signed_in";
  const several = Boolean(item.several);
  const signedAccounts = (item.accounts ?? []).filter((a) => a.status === "signed_in").map((a) => a.address);
  const again = item.status === "expired";
  const busy = phase === "starting" || phase === "waiting";
  const retry = phase === "refused" || phase === "closed" || phase === "failed" || phase === "blocked";
  return (
    <div className="service-sign-in" data-sign-in={item.name}>
      {signedIn ? (
        <>
          {/* A service that names its accounts can be signed in to more than once (a personal and a work mail): each
              account is listed, and Add another account opens the service's own page again. */}
          {(several && signedAccounts.length > 0 ? signedAccounts : [item.account]).map((address, i) => (
            <p className="hint" key={address ?? `account-${i}`}>
              <Icon name="check" size={14} />{" "}
              {address ? t("walkthrough.mail.signed_in_as", { account: address }) : t("walkthrough.mail.signed_in")}
            </p>
          ))}
          {several && (
            <>
              {phase === "waiting" && <WaitingBanner onCancel={cancel} />}
              {text && (
                <p className="problem-note" role="alert">
                  {text}
                </p>
              )}
              <Actions align="end">
                <Button variant="quiet"
                  disabled={busy || !item.ready}
                  aria-label={t("sign_in.add_account_named", { label: item.label })}
                  onClick={() => {
                    props.onStarted?.();
                    void start();
                  }}
                >
                  {busy ? t("sign_in.working") : t("sign_in.add_account")}
                </Button>
              </Actions>
            </>
          )}
        </>
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
          {phase === "waiting" && <WaitingBanner onCancel={cancel} />}
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
          {phase !== "waiting" && (
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
          )}
        </>
      )}
    </div>
  );
}
