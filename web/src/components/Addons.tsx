// Add-ons: where packs are found and what the ones already here do. Available lists packs the configured catalogs
// offer, each with what it does, what it adds, reaches and keeps, what its AI work would cost on the person's own
// accounts, and how to get it; Installed lists the packs this copy of the app has. Everything a catalog says is shown
// as text, and the only address that can be opened is a pack's own page, with its real domain beside it. A listed pack
// with a release the app can install has an Install button; one the app installed can be removed once it is off. Both
// need a restart before the app uses the change, and neither turns anything on.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Heading, Tab, TabList, TabPanel, Tabs } from "react-aria-components";
import { api, ApiError, type S } from "../lib/api";

import { copyPlain } from "../lib/copy";
import { day, whenText as when } from "../lib/dates";
import { usePrice, useSmallMoney } from "../lib/money";
import {
  SAFE_ID,
  addsLines,
  costText,
  groupByFile,
  keepsText,
  listOf,
  priceText,
  reachesLines,
  updateOffered,
  waitsForRestart,
  type Summary,
} from "../lib/packs";
import { problemText } from "../lib/problem";
import { useRestart } from "../lib/restart";
import { freshSettings, inOrder, useAfterSave, useFreshFingerprint } from "../lib/settings-save";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { ModalPanel, restoreFocus, DialogFooter } from "./ModalPanel";
import { domainOf } from "./SafeText";
import { ReadToken } from "./ReadToken";
import { AddonSecrets } from "./KeptSecrets";
import { RowMenu, type MenuAction } from "./RowMenu";
import { Skeleton } from "../ui/Skeleton";
import { DeveloperSettings } from "./DeveloperSettings";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { Actions } from "../ui/Actions";
import { RowList } from "../ui/RowList";
import { Row } from "../ui/Row";
type Pack = S["PackView"];
type Feed = S["PackFeedView"];
type Installed = S["InstalledPackView"];

/** `onBack` is for a screen that opens Add-ons away from Settings; as a section of Settings it has none. */
export function Addons(props: { onBack?: () => void }) {
  const { t } = useWords();
  const { restarts } = useRestart();
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const [tab, setTab] = useState("available");
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  useEffect(() => setRemoved(new Set()), [restarts]);
  const hideRemoved = (id: string) => setRemoved((current) => new Set(current).add(id));
  return (
    <section className="panel-section" aria-labelledby="addons-title">
      <div className="heading">
        <h2 id="addons-title" tabIndex={-1} data-section-heading="">
          {t("addons.title")}
        </h2>
        {props.onBack && (
          <Button onClick={props.onBack}>
            {t("addons.back")}
          </Button>
        )}
      </div>
      <p className="hint">{t("addons.intro")}</p>
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))} className="addon-tabs">
        <TabList aria-label={t("addons.tabs")} className="tablist">
          <Tab id="available" className="tab">
            {t("addons.tab.available")}
          </Tab>
          <Tab id="installed" className="tab">
            {t("addons.tab.installed")}
          </Tab>
        </TabList>
        <TabPanel id="available" className="tab-panel">
          <Loaded query={packs}>{(view) => <Available view={view} removed={removed} onRemove={hideRemoved} />}</Loaded>
        </TabPanel>
        <TabPanel id="installed" className="tab-panel">
          <Loaded query={packs}>{(view) => <InstalledList items={view.installed} removed={removed} onRemove={hideRemoved} />}</Loaded>
        </TabPanel>
      </Tabs>
      <DeveloperSettings />
    </section>
  );
}

/** Turning an add-on on or off: acts at once and reads back with Undo, then the restart question if one is needed (never a
 * restart by itself). A refusal is kept for the row to show in the server's own words. */
function useSwitch(name: string, label: string) {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const run = async (on: boolean) => {
    setBusy(true);
    setProblem("");
    try {
      // The settings as they are now, so a change made meanwhile is noticed rather than overwritten.
      const current = await freshSettings(client);
      const saved = await (on ? api.packOn : api.packOff)(name, current.fingerprint);
      await afterSave(saved, { message: t(on ? "addons.switched_on" : "addons.switched_off", { name: label }) });
      // The list reads which add-ons are on from the saved settings: read it again so the row says what was just saved.
      await client.refetchQueries({ queryKey: ["packs"] });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) void client.invalidateQueries({ queryKey: ["settings"] });
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };
  return { busy, problem, run };
}

/** Installing, updating or removing an add-on from the screen: acts at once, then the row says a restart is needed until
 * the app has restarted. A refusal is kept for the row to show in the server's own words; `note` is what the row says
 * after a success. */
export function usePackChange(
  packId: string,
  name: string,
  focusRow: () => void,
  nameOf: (id: string) => string = (id) => id,
  onRemoved?: () => void,
) {
  const { t } = useWords();
  const client = useQueryClient();
  const { push } = useToasts();
  const [busy, setBusy] = useState<"install" | "remove" | null>(null);
  const [problem, setProblem] = useState("");
  // The refusal says a read token for the release's host would fix it: the row asks for one in place.
  const [needsToken, setNeedsToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);
  const restarts = useRestart().restarts;
  // What was done, and how many restarts had happened by then: once another has, the restart it asked for is over.
  const [last, setLast] = useState<{ what: "installed" | "removed"; at: number } | null>(null);
  const done = last && last.at === restarts ? last.what : null;
  useEffect(() => {
    if (last && last.at !== restarts) {
      setLast(null);
      void client.invalidateQueries({ queryKey: ["packs"] });
      void client.invalidateQueries({ queryKey: ["status"] });
    }
  }, [last, restarts, client]);
  const run = async (what: "install" | "remove") => {
    setBusy(what);
    setProblem("");
    setNeedsToken(false);
    setTokenSaved(false);
    try {
      const result = await (what === "install" ? api.installPack : api.removePack)(packId);
      if (what === "remove") onRemoved?.();
      if (result.file_kept) {
        // Only this add-on went: the file stays while others of the same file use it, and nothing needs a restart.
        push({ message: t("addons.removed_kept_note", { name, others: (result.still_used_by ?? []).map(nameOf).join(", ") }) });
      } else {
        setLast({ what: what === "install" ? "installed" : "removed", at: restarts });
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ["packs"] }),
        client.invalidateQueries({ queryKey: ["status"] }),
      ]);
      focusRow();
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
      setNeedsToken(err instanceof ApiError && err.needs === "read-token");
    } finally {
      setBusy(null);
    }
  };
  return {
    busy,
    problem,
    needsToken,
    tokenSaved,
    /** The token is kept: the refusal is over, and Install can be pressed again. */
    gotToken: () => {
      setNeedsToken(false);
      setProblem("");
      setTokenSaved(true);
    },
    note: done ? t(done === "installed" ? "addons.installed_note" : "addons.removed_note", { name }) : "",
    installed: done === "installed",
    install: () => run("install"),
    remove: () => run("remove"),
  };
}

/** What a row says once an install or removal needs the restart, with the same Restart now the other rows have. */
function RestartLine(props: { text: string }) {
  return (
    <p className="hint pack-restart" role="status">
      {props.text}
      <RestartNowButton />
    </p>
  );
}

/** The row's own Restart now, offered whenever the app can restart itself. Asking is the person's choice: nothing
 * restarts until it is pressed. */
export function RestartNowButton() {
  const { t } = useWords();
  const restart = useRestart();
  const status = useQuery({ queryKey: ["status"], queryFn: api.status });
  if (!status.data?.can_restart) return null;
  return (
    <>
      {" "}
      <Button variant="quiet" size="sm" disabled={restart.busy || restart.waiting} onClick={() => void restart.now()}>
        {t("restart.now")}
      </Button>
    </>
  );
}

/** The row's one primary action for an installed add-on: Turn on when it is off, Turn off when it is on. */
function SwitchButton(props: { on: boolean; label: string; busy: boolean; id?: string; onRun: () => void }) {
  const { t } = useWords();
  return (
    <Button variant="primary"
      id={props.id}
      data-key="primary"
      disabled={props.busy}
      aria-label={t(props.on ? "addons.switch_off_named" : "addons.switch_on_named", { name: props.label })}
      onClick={props.onRun}
    >
      {t(props.on ? "addons.switch_off" : "addons.switch_on")}
    </Button>
  );
}

function Loaded(props: {
  query: { isPending: boolean; isError: boolean; data?: S["PacksView"]; refetch: () => unknown };
  children: (view: S["PacksView"]) => ReactNode;
}) {
  const { t } = useWords();
  const { query } = props;
  if (query.isPending) return <Skeleton />;
  if (query.isError || !query.data) {
    return (
      <EmptyState icon="alert" text={t("addons.load_failed")} action={{ label: t("action.try_again"), onClick: () => void query.refetch() }} />
    );
  }
  return <>{props.children(query.data)}</>;
}

/** Why the list of add-ons to get is empty, in words, or null when it holds some. */
export function emptyReason(view: S["PacksView"], t: (key: string) => string): string | null {
  if (!view.enabled) return t("addons.off");
  if (view.feeds.length === 0) return t("addons.no_catalog");
  if (view.available.length > 0) return null;
  // A catalog that couldn't be read is not an empty one: say so, and the reason is listed below.
  return view.feeds.every((feed) => feed.error) ? t("addons.no_packs_failed") : t("addons.no_packs");
}

function Available(props: { view: S["PacksView"]; removed: ReadonlySet<string>; onRemove: (id: string) => void }) {
  const { t } = useWords();
  const { view } = props;
  const available = view.available.filter((pack) => !props.removed.has(pack.id));
  const [getting, setGetting] = useState<number | null>(null);
  const empty = emptyReason({ ...view, available }, t);
  return (
    <div className="addons-body">
      {empty ? (
        <EmptyState text={empty} />
      ) : (
        <RowList>
          {groupByFile(available).map((slots) =>
            slots.length === 1 ? (
              <PackRow
                key={`${slots[0].item.id}-${slots[0].index}`}
                pack={slots[0].item}
                index={slots[0].index}
                restartNeeded={restartNeeded(slots[0].item, view.installed)}
                onGet={() => setGetting(slots[0].index)}
                onRemoved={() => props.onRemove(slots[0].item.id)}
              />
            ) : (
              <PackGroup
                key={`group-${slots[0].index}`}
                slots={slots.map((slot) => ({ pack: slot.item, index: slot.index }))}
                installed={view.installed}
                nameOf={(id) => available.find((p) => p.id === id)?.name ?? id}
                onGet={(i) => setGetting(i)}
                onRemove={props.onRemove}
              />
            ),
          )}
        </RowList>
      )}
      {view.enabled && view.feeds.length === 0 && <AddCatalog first />}
      {view.enabled && view.feeds.length > 0 && <Catalog feeds={view.feeds} />}
      {getting !== null && available[getting] && (
        <GetIt
          pack={available[getting]}
          onClose={() => {
            const index = getting;
            setGetting(null);
            restoreFocus(() => document.getElementById(`pack-get-${index}`) ?? document.getElementById(`pack-row-${index}`));
          }}
        />
      )}
    </div>
  );
}

/** What a pack adds, reaches and keeps, as three short labelled lists. Used by both tabs. */
function WhatLines(props: { what: Summary; base: string }) {
  const { t, tn } = useWords();
  const adds = addsLines(props.what.adds, t, tn);
  const reaches = reachesLines(props.what.reaches, t);
  const part = (key: string, label: string, body: ReactNode) => (
    <div className="pack-part">
      <p className="what" id={`${props.base}-${key}`}>
        {label}
      </p>
      {body}
    </div>
  );
  const list = (key: string, items: string[]) => (
    <ul className="plain-list" aria-labelledby={`${props.base}-${key}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
  return (
    <div className="pack-what">
      {part("adds", t("addons.adds"), list("adds", adds.length ? adds : [t("addons.adds.nothing")]))}
      {part("reaches", t("addons.reaches"), list("reaches", reaches))}
      {part("keeps", t("addons.keeps"), <p>{keepsText(props.what.keeps, t)}</p>)}
    </div>
  );
}

/** `group` is set when the row is one of several add-ons that come in one file: the group's row says who made it and
 * what it costs, and installs the file, so this row keeps its own state, what it adds, reaches and keeps, and its own
 * switch, and installs only to bring back an add-on removed while the file stayed. */
function PackRow(props: {
  pack: Pack;
  index: number;
  restartNeeded: boolean;
  onGet: () => void;
  onRemoved: () => void;
  group?: { anyInstalled: boolean; nameOf: (id: string) => string };
}) {
  const { t } = useWords();
  const price = usePrice();
  const small = useSmallMoney();
  const { pack, index } = props;
  const base = `pack-${index}`;
  const installed = pack.installed_version != null;
  const update = updateOffered(pack);
  const amount = (value: number, currency: string) => price(value, currency);
  const compat = pack.compatible === true ? t("addons.compatible.yes") : pack.compatible === false ? t("addons.compatible.no") : "";
  const facts = [
    t(pack.maintainers ? "addons.by_maintainers" : "addons.third_party"),
    pack.publisher,
    // A catalog states the date as stored; any other wording it gives is shown as it is.
    pack.updated ? t("addons.updated", { updated: /^\d{4}-\d{2}-\d{2}$/.test(pack.updated) ? day(pack.updated) : pack.updated }) : "",
    compat,
  ].filter(Boolean);
  const safeHomepage = pack.homepage && pack.homepage_domain && domainOf(pack.homepage) ? pack.homepage : null;
  const size = (n: number) => n.toLocaleString();
  const power = useSwitch(pack.id, pack.name);
  const change = usePackChange(
    pack.id,
    pack.name,
    () => restoreFocus(() => document.getElementById(`pack-row-${index}`) ?? document.getElementById("addons-title")),
    props.group?.nameOf,
    props.onRemoved,
  );
  const problem = change.problem || power.problem;
  // In a group, the file is installed from the group's row; this row offers it only once the others are installed.
  const offerInstall = !props.group || props.group.anyInstalled;

  const actions: MenuAction[] = [];
  if (installed && update && pack.installable) {
    actions.push({ id: "update", label: t("addons.update_now"), run: () => void change.install() });
  } else if (installed && update) {
    actions.push({ id: "update", label: t("addons.get_update"), run: props.onGet });
  }
  if (installed && !pack.enabled && pack.removable) {
    actions.push({ id: "remove", danger: true, label: t("addons.remove"), run: () => void change.remove() });
  }
  if (safeHomepage) {
    actions.push({
      id: "homepage",
      label: t("addons.homepage_named", { domain: pack.homepage_domain ?? "" }),
      href: safeHomepage,
    });
  }
  return (
    <Row id={`pack-row-${index}`} aria-labelledby={`${base}-name`} title={pack.name} titleId={`${base}-name`} metaLines={[(!props.group ? <>{facts.join(" · ")}</> : null), (!props.group ? <>{priceText(pack.price, amount, t)}</> : null)]} actions={<>{!installed && pack.installable && !change.installed && offerInstall && (
            <Button variant="primary"
              id={`pack-install-${index}`}
              data-key="primary"
              disabled={change.busy !== null}
              aria-label={t("addons.install_named", { name: pack.name })}
              onClick={() => void change.install()}
            >
              {t(change.busy === "install" ? "addons.installing" : "addons.install")}
            </Button>
          )}
          {!installed && !pack.installable && offerInstall && (
            <Button variant="primary"
              id={`pack-get-${index}`}
              data-key="primary"
              aria-label={t("addons.get_named", { name: pack.name })}
              onClick={props.onGet}
            >
              {t("addons.get")}
            </Button>
          )}
          {installed && !pack.enabled && (
            <SwitchButton on={false} label={pack.name} busy={power.busy} id={`pack-switch-${index}`} onRun={() => void power.run(true)} />
          )}
          <RowMenu label={pack.name} actions={actions} /></>}>
{pack.summary && <p className="pack-summary">{pack.summary}</p>}
<WhatLines what={pack.what} base={base} />
{(pack.libraries ?? []).length > 0 && (
            <div className="pack-part">
              <p className="what" id={`${base}-libraries`}>
                {t("addons.libraries")}
              </p>
              <ul className="plain-list" aria-labelledby={`${base}-libraries`}>
                {(pack.libraries ?? []).map((lib) => (
                  <li key={lib.name}>{t("addons.library_line", { name: lib.name, version: lib.version })}</li>
                ))}
              </ul>
              <p className="hint">{t("addons.libraries_hint")}</p>
            </div>
          )}
{!installed && pack.library_problem && <p className="problem-note">{pack.library_problem}</p>}
{pack.costs.length > 0 && (
            <div className="pack-part">
              <p className="what" id={`${base}-costs`}>
                {t("addons.costs")}
              </p>
              <ul className="plain-list" aria-labelledby={`${base}-costs`}>
                {pack.costs.map((cost, i) => (
                  <li key={`${cost.label}-${i}`}>{costText(cost, t, small, size)}</li>
                ))}
              </ul>
              <p className="hint">{t("addons.costs_hint")}</p>
            </div>
          )}
{installed && (
            <p className="hint" id={`${base}-state`}>
              {t(props.restartNeeded ? "addons.state.restart_version" : pack.enabled ? "addons.state.on_version" : "addons.state.off_version", {
                version: pack.installed_version ?? "",
              })}
              {props.restartNeeded && !change.note && <RestartNowButton />}
            </p>
          )}
{installed && pack.enabled && pack.signed_in != null && (
            <p className="hint">{t(pack.signed_in ? "addons.signed_in" : "addons.not_signed_in")}</p>
          )}
{installed && update && (
            <p className="pack-update">
              {t("addons.update", { from: pack.installed_version ?? "", to: pack.version })}
            </p>
          )}
{change.note && <RestartLine text={change.note} />}
{problem && (
            <p className="problem-note" role="alert">
              {problem}
            </p>
          )}
{change.needsToken && pack.release_host && (
            <ReadToken pack={pack} base={base} host={pack.release_host} onSaved={change.gotToken} />
          )}
{change.tokenSaved && (
            <p className="hint" role="status">
              {t("addons.token.saved_note")}
            </p>
          )}
{safeHomepage && (
            <span className="hint">{t("addons.homepage_line", { domain: pack.homepage_domain ?? "" })}</span>
          )}
</Row>
  );
}

/** Add-ons that come in one file, as one row: who made it and what it costs once, the file installed with one button,
 * and under it each add-on with its own state (installed, on or off, signed in or not), its own switch and its own
 * Remove, which takes only that one away while the others still use the file. */
function PackGroup(props: {
  slots: { pack: Pack; index: number }[];
  installed: Installed[];
  nameOf: (id: string) => string;
  onGet: (index: number) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useWords();
  const price = usePrice();
  const { slots } = props;
  const first = slots[0];
  const names = slots.map((s) => s.pack.name);
  const base = `pack-group-${first.index}`;
  const anyInstalled = slots.some((s) => s.pack.installed_version != null);
  const change = usePackChange(first.pack.id, names.join(", "), () =>
    restoreFocus(() => document.getElementById(`${base}-row`)),
  );
  const amount = (value: number, currency: string) => price(value, currency);
  const pack = first.pack;
  const facts = [
    t(pack.maintainers ? "addons.by_maintainers" : "addons.third_party"),
    pack.publisher,
    pack.updated ? t("addons.updated", { updated: /^\d{4}-\d{2}-\d{2}$/.test(pack.updated) ? day(pack.updated) : pack.updated }) : "",
  ].filter(Boolean);
  return (
    <Row id={`${base}-row`} aria-labelledby={`${base}-name`} title={<>{t("addons.group.title", { names: listOf(names, t("addons.group.and")) })}</>} titleId={`${base}-name`} metaLines={[facts.join(" · "), priceText(pack.price, amount, t)]} actions={<>{!anyInstalled && pack.installable && !change.installed && (
            <Button variant="primary"
              id={`${base}-install`}
              data-key="primary"
              disabled={change.busy !== null}
              aria-label={t("addons.install_named", { name: names.join(", ") })}
              onClick={() => void change.install()}
            >
              {t(change.busy === "install" ? "addons.installing" : "addons.install")}
            </Button>
          )}
          {!anyInstalled && !pack.installable && (
            <Button variant="primary"
              id={`${base}-get`}
              data-key="primary"
              aria-label={t("addons.get_named", { name: names.join(", ") })}
              onClick={() => props.onGet(first.index)}
            >
              {t("addons.get")}
            </Button>
          )}</>}>
<p className="hint">{t("addons.group.one_file", { n: slots.length })}</p>
<p className="what" id={`${base}-includes`}>
            {t("addons.group.includes", { names: names.join(", ") })}
          </p>
{change.problem && (
            <p className="problem-note" role="alert">
              {change.problem}
            </p>
          )}
{change.needsToken && pack.release_host && (
            <ReadToken pack={pack} base={base} host={pack.release_host} onSaved={change.gotToken} />
          )}
{change.tokenSaved && (
            <p className="hint" role="status">
              {t("addons.token.saved_note")}
            </p>
          )}
{change.note && <RestartLine text={change.note} />}
<RowList aria-labelledby={`${base}-includes`}>
            {slots.map((slot) => (
              <PackRow
                key={`${slot.pack.id}-${slot.index}`}
                pack={slot.pack}
                index={slot.index}
                restartNeeded={restartNeeded(slot.pack, props.installed)}
                onGet={() => props.onGet(slot.index)}
                onRemoved={() => props.onRemove(slot.pack.id)}
                group={{ anyInstalled, nameOf: props.nameOf }}
              />
            ))}
          </RowList>
</Row>
  );
}

/** How to get a pack: the publisher's install text as something to copy, and how to try it on made-up data first. */
function GetIt(props: { pack: Pack; onClose: () => void }) {
  const { t } = useWords();
  const { pack } = props;
  const titleId = useId();
  const demo = pack.demo && SAFE_ID.test(pack.id) ? t("addons.demo_command", { id: pack.id }) : null;
  return (
    <ModalPanel titleId={titleId} onClose={props.onClose}>
      <Heading slot="title" id={titleId}>
        {t("addons.get_title", { name: pack.name })}
      </Heading>
      <div className="get-it">
        <p>{pack.install ? t("addons.install_intro") : t("addons.install_none")}</p>
        {pack.install && <CopyLine text={pack.install} label={t("addons.copy_install")} />}
        {pack.install && <p className="hint">{t("addons.install_check")}</p>}
        {demo && (
          <details className="more-options">
            <summary>{t("addons.for_developers")}</summary>
            <p>{t("addons.demo_intro")}</p>
            <CopyLine text={demo} label={t("addons.copy_demo")} />
          </details>
        )}
      </div>
      <DialogFooter>
        <Button variant="primary" onClick={props.onClose}>
          {t("action.close")}
        </Button>
      </DialogFooter>
    </ModalPanel>
  );
}

function CopyLine(props: { text: string; label: string }) {
  const { t } = useWords();
  const { push } = useToasts();
  const [blocked, setBlocked] = useState(false);
  const copy = async () => {
    if ((await copyPlain(props.text)) === "blocked") {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    push({ message: t("addons.copied") });
  };
  return (
    <div className="copy-line">
      <div className="copy-row">
        <code className="command">{props.text}</code>
        <Button aria-label={props.label} onClick={() => void copy()}>
          {t("addons.copy")}
        </Button>
      </div>
      {blocked && (
        <p className="problem-note" role="alert">
          {t("addons.copy_blocked")}
        </p>
      )}
    </div>
  );
}

/** Where a catalog address is read from, for a message: its host, or the address itself when it isn't one. */
const hostOf = (address: string) => {
  try {
    return new URL(address).hostname || address;
  } catch {
    return address;
  }
};

/** The form that lists a catalog by its address: shown in place when none is listed, and from "Add another catalog". */
function AddCatalog(props: { first?: boolean; onDone?: () => void }) {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const fingerprint = useFreshFingerprint();
  const id = useId();
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const add = async () => {
    setBusy(true);
    setProblem("");
    try {
      const saved = await inOrder(async () => api.addCatalog(address.trim(), await fingerprint()));
      // The catalog is read at once, so its add-ons are listed when the form goes.
      client.setQueryData(["packs"], await api.refreshPacks());
      await afterSave(saved, { message: t("addons.catalog_added", { domain: hostOf(address.trim()) }) });
      props.onDone?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) void client.invalidateQueries({ queryKey: ["settings"] });
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
      setBusy(false);
    }
  };
  return (
    <form
      className="panel catalog-add"
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        if (address.trim() && !busy) void add();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && props.onDone) props.onDone();
      }}
    >
      <h3 id={`${id}-title`}>{t("addons.catalog_add_title")}</h3>
      <FormField id={`${id}-address`} label={t("addons.catalog_address")}>
        <input
          id={`${id}-address`}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoFocus={!props.first}
          value={address}
          disabled={busy}
          aria-describedby={`${id}-hint`}
          onChange={(e) => setAddress(e.target.value)}
        />
        <p className="hint" id={`${id}-hint`}>
          {t("addons.catalog_address_hint")}
        </p>
      </FormField>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      <Actions align="end">
        {!props.first && props.onDone && (
          <Button variant="quiet" onClick={props.onDone}>
            {t("action.cancel")}
          </Button>
        )}
        <Button variant="primary" type="submit" disabled={!address.trim() || busy}>
          {t(busy ? "addons.catalog_adding" : "addons.catalog_add")}
        </Button>
      </Actions>
    </form>
  );
}

function Catalog(props: { feeds: Feed[] }) {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const fingerprint = useFreshFingerprint();
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [problem, setProblem] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);
  const take = async (feed: Feed) => {
    const address = feed.address;
    if (!address) return;
    setBusy(true);
    setProblem("");
    try {
      const saved = await inOrder(async () => api.removeCatalog(address, await fingerprint()));
      client.setQueryData(["packs"], await api.refreshPacks());
      await afterSave(saved, { message: t("addons.catalog_removed", { domain: feed.domain }) });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    }
    setBusy(false);
  };
  const refresh = async () => {
    setBusy(true);
    setProblem("");
    try {
      client.setQueryData(["packs"], await api.refreshPacks());
    } catch (err) {
      setProblem(problemText(err, t));
    }
    setBusy(false);
  };
  return (
    <section className="catalog" aria-labelledby="catalog-title">
      <div className="heading">
        <h3 id="catalog-title">{t("addons.catalog")}</h3>
        <Button disabled={busy} onClick={() => void refresh()}>
          {t(busy ? "addons.refreshing" : "addons.refresh")}
        </Button>
      </div>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
      <ul className="catalog-list">
        {props.feeds.map((feed, i) => (
          <FeedLine key={`${feed.domain}-${i}`} feed={feed} busy={busy} onRemove={() => void take(feed)} />
        ))}
      </ul>
      {adding ? (
        <AddCatalog
          onDone={() => {
            setAdding(false);
            restoreFocus(() => addButton.current);
          }}
        />
      ) : (
        <Button variant="quiet" ref={addButton} onClick={() => setAdding(true)}>
          {t("addons.catalog_add_another")}
        </Button>
      )}
    </section>
  );
}

function FeedLine(props: { feed: Feed; busy: boolean; onRemove: () => void }) {
  const { t, tn } = useWords();
  const { feed } = props;
  const read = feed.read_at ? when(feed.read_at) : "";
  // The app's own catalog is named for the app and never by its address; one the person added keeps its domain.
  const app = t("app.name");
  const line = feed.own
    ? read
      ? t("addons.feed.own", { app, when: read })
      : t("addons.feed.own_never", { app })
    : read
      ? t("addons.feed.read", { domain: feed.domain, when: read })
      : t("addons.feed.never", { domain: feed.domain });
  return (
    <li className="feed">
      <span className="hint">{line}</span>
      {feed.removable && (
        <Button variant="quiet" size="sm" disabled={props.busy} aria-label={t("addons.catalog_remove_named", { domain: feed.domain })} onClick={props.onRemove}>
          {t("addons.catalog_remove")}
        </Button>
      )}
      {feed.error && <p className="problem-note">{t("addons.feed.error", { error: feed.error })}</p>}
      {feed.notes.length > 0 && (
        <details className="feed-notes">
          <summary>{tn("addons.feed.notes", feed.notes.length)}</summary>
          <ul className="plain-list">
            {feed.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

/** The same for a pack in the Available list, read from the installed add-on of that name. */
const restartNeeded = (pack: Pack, installed: Installed[]) => {
  const running = installed.find((i) => i.name === pack.id);
  return pack.enabled && running !== undefined && waitsForRestart(running);
};

function InstalledList(props: { items: Installed[]; removed: ReadonlySet<string>; onRemove: (id: string) => void }) {
  const { t } = useWords();
  const items = props.items.filter((item) => !props.removed.has(item.name));
  if (items.length === 0) return <EmptyState text={t("addons.installed.empty")} />;
  return (
    <RowList>
      {groupByFile(items).map((slots) =>
        slots.length === 1 ? (
          <InstalledRow
            key={`${slots[0].item.name}-${slots[0].index}`}
            item={slots[0].item}
            index={slots[0].index}
            onRemoved={() => props.onRemove(slots[0].item.name)}
          />
        ) : (
          <InstalledGroup key={`group-${slots[0].index}`} slots={slots} onRemove={props.onRemove} />
        ),
      )}
    </RowList>
  );
}

/** Installed add-ons that come in one file, as one row with each one's own state, switch and Remove under it. */
function InstalledGroup(props: { slots: { item: Installed; index: number }[]; onRemove: (id: string) => void }) {
  const { t } = useWords();
  const names = props.slots.map((s) => s.item.name);
  const base = `installed-group-${props.slots[0].index}`;
  return (
    <Row
      id={`${base}-row`}
      aria-labelledby={`${base}-name`}
      title={t("addons.group.title", { names: listOf(names, t("addons.group.and")) })}
      titleId={`${base}-name`}
    >
      <p className="hint">{t("addons.group.one_file", { n: names.length })}</p>
      <p className="what" id={`${base}-includes`}>
        {t("addons.group.includes", { names: names.join(", ") })}
      </p>
      <RowList aria-labelledby={`${base}-includes`}>
        {props.slots.map((slot) => (
          <InstalledRow
            key={`${slot.item.name}-${slot.index}`}
            item={slot.item}
            index={slot.index}
            onRemoved={() => props.onRemove(slot.item.name)}
          />
        ))}
      </RowList>
    </Row>
  );
}

function InstalledRow(props: { item: Installed; index: number; onRemoved: () => void }) {
  const { t } = useWords();
  const { item } = props;
  const base = `installed-${props.index}`;
  const power = useSwitch(item.name, item.name);
  const change = usePackChange(
    item.name,
    item.name,
    () => restoreFocus(() => document.getElementById(`${base}-row`) ?? document.getElementById("addons-title")),
    undefined,
    props.onRemoved,
  );
  const problem = change.problem || power.problem;
  const actions: MenuAction[] = [];
  if (!item.enabled && item.removable) {
    actions.push({ id: "remove", danger: true, label: t("addons.remove"), run: () => void change.remove() });
  }
  const isOn = item.enabled;
  const pending = waitsForRestart(item);
  const statusText = pending
    ? t(isOn ? "addons.state.after_restart" : "addons.state.off_after_restart")
    : item.state === "enabled"
      ? t("addons.state.running")
      : item.reason
        ? t("addons.state.because", { reason: item.reason })
        : t("addons.state.off");
  return (
    <Row id={`${base}-row`} aria-labelledby={`${base}-name`} title={item.name} titleId={`${base}-name`} meta={(item.version ? <>{t("addons.version", { version: item.version })}</> : null)} actions={<><SwitchButton on={isOn} label={item.name} busy={power.busy} onRun={() => void power.run(!isOn)} />
          <RowMenu label={item.name} actions={actions} /></>}>
{item.description && <p className="pack-summary">{item.description}</p>}
<p className="hint">
            {statusText}
            {pending && <RestartNowButton />}
          </p>
{isOn && item.signed_in != null && <p className="hint">{t(item.signed_in ? "addons.signed_in" : "addons.not_signed_in")}</p>}
{change.note && <RestartLine text={change.note} />}
{problem && (
            <p className="problem-note" role="alert">
              {problem}
            </p>
          )}
<WhatLines what={item.what} base={base} />
{item.state === "enabled" && <AddonSecrets plugin={item.name} />}
</Row>
  );
}
