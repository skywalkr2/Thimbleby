// Settings (design 7.9): sections down the side, the open section's settings in the middle with their help beside each
// one. A change is saved as it is made (a choice when it changes, a box when the cursor leaves it or Enter is pressed),
// with a toast that reads it back and offers Undo; there is no Save button. Each save carries the fingerprint of the
// settings as the screen last knew them, so a change made elsewhere meanwhile is refused in plain words and what was
// typed stays.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import { api, ApiError, type S } from "../lib/api";
import { useListsPage, useValueLists } from "../lib/lists";
import { problemText } from "../lib/problem";
import {
  changedTime,
  changedUnderneath,
  refreshedSettings,
  type Refreshed,
} from "../lib/refreshed";
import {
  addonOf,
  fromDraft,
  groupLabel,
  isOff,
  labelForKey,
  depthOf,
  matches,
  switchOf,
  toDraft,
  topicLabel,
  type Draft,
  type Item,
} from "../lib/settings";
import {
  entriesOf,
  isListed,
  navSections,
  sectionItems,
  sectionOfItem,
  topics,
} from "../lib/settings-sections";
import {
  freshSettings,
  knownFingerprint,
  rememberFingerprint,
  useAfterSave,
} from "../lib/settings-save";
import { handOffSearch, takeSearch } from "../lib/settings-search";
import { readUnsaved, writeUnsaved } from "../lib/settings-pending";
import { placesFound, type Place } from "../lib/settings-find";
import { accountName } from "../lib/ai-accounts";
import { useAddonName } from "../lib/addon-names";
import { useSides } from "../lib/sides";
import { applyAppearanceChanges, useAppearance } from "../lib/theme";
import { useSettingWordsFromCache } from "../lib/setting-words";
import { settingsView, viewHref, type SettingsSection } from "../lib/views";
import { GroupLabel } from "../ui/GroupLabel";
import { useIsNarrow, useMediaQuery } from "../lib/media";
import { useConnection } from "../lib/connection";
import { parseAmount, useWriteAmount } from "../lib/money";
import { Marked } from "./Marked";
import { useWords } from "../lib/wording";
import { AiAccounts } from "./AiAccounts";
import { AiChoices } from "./AiRouting";
import { MergedRow } from "./MergedRow";
import { DataForms } from "./DataForms";
import { useFolderListing } from "./FolderPicker";
import { JobsPanel } from "./JobsPanel";
import { BusinessSides } from "./BusinessSides";
import { AddonSecrets, BackupKey } from "./KeptSecrets";
import { BackupsPanel } from "./BackupsPanel";
import { Notifications } from "./Notifications";
import { PageLinks } from "./PageLinks";
import { ActingAccounts } from "./ActingAccounts";
import { ReminderWhere } from "./ReminderWhere";
import { RefreshedLines } from "./RefreshedLines";
import { SettingRow } from "./SettingRow";
import { SyncPanel } from "./SyncPanel";
import { YourName } from "./YourName";
import { ValueLists } from "./ValueLists";
import { Drawer } from "../ui/Drawer";
import { Skeleton } from "../ui/Skeleton";
import { LoadFailed } from "../ui/LoadFailed";
import { WelcomeAi } from "./WelcomeAi";
import { restoreFocus } from "./ModalPanel";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { SearchField } from "../ui/SearchField";
type Edits = Record<string, Draft>;

const SEARCH_ID = "settings-search";
const NAV_GROUPS = [
  { key: "you", label: "settings.nav_group.you", sections: ["you", "business"] },
  { key: "assistant", label: "settings.nav_group.assistant", sections: ["ai", "today"] },
  { key: "data", label: "settings.nav_group.data", sections: ["connections", "backups", "lists", "files"] },
  { key: "more", label: "settings.nav_group.more", sections: ["appearance", "links", "addons", "advanced"] },
] as const;

/** The sections listed down the side of Settings (Connections and Add-ons among them). The pages reached from Settings
 * (what each account can do) show it too, so the person can go to any other section from where they are. */
export function SettingsNav(props: {
  listed: SettingsSection[];
  /** The section whose page is open; none when the page is one of the screens reached from Settings. */
  current: SettingsSection | null;
  choose: (section: SettingsSection) => void;
}) {
  const { t } = useWords();
  const addonName = useAddonName();
  // On a phone the sections are behind one line that names the open one, so the page's own content is not pushed down the
  // screen by a list of every section.
  // Below 1100px of window the list of sections folds too: the page's content has the room, not a column of section names.
  // Both are read on every render (a hook is never behind `||`), so the window changing width keeps the hooks in order.
  const phone = useIsNarrow();
  const folded = useMediaQuery("(max-width: 1100px)");
  const narrow = phone || folded;
  const [picking, setPicking] = useState(false);
  const label = (s: SettingsSection) =>
    s.startsWith("addon/")
      ? addonName(s.slice("addon/".length))
      : t(`settings.section.${s}`);
  const follow = (e: MouseEvent, run: () => void) => {
    // A plain click moves within the app; a modified one (a new tab) keeps its link.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    e.preventDefault();
    setPicking(false);
    run();
  };
  const link = (id: SettingsSection) => (
    <a
      href={viewHref(settingsView(id))}
      aria-current={id === props.current ? "page" : undefined}
      onClick={(e) => follow(e, () => props.choose(id))}
    >
      {label(id)}
    </a>
  );
  const addonSections = props.listed.filter((id) => id.startsWith("addon/"));
  const groups = (
    <>
      {NAV_GROUPS.map((group) => {
        const sections = group.sections.filter((id) => props.listed.includes(id));
        if (sections.length === 0) return null;
        const headingId = `settings-nav-${group.key}`;
        return (
          <section className="settings-nav-group" aria-labelledby={headingId} key={group.key}>
            <GroupLabel id={headingId}>{t(group.label)}</GroupLabel>
            <ul className="settings-nav">
              {sections.map((id) => (
                <li key={id}>
                  {link(id)}
                  {id === "addons" && addonSections.length > 0 && (
                    <ul className="settings-nav-sublist" aria-label={t("settings.addon_pages")}>
                      {addonSections.map((addon) => (
                        <li key={addon}>{link(addon)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
  return (
    <nav aria-label={t("settings.sections")}>
      {narrow ? (
        <details className="more-options settings-picker" open={picking} onToggle={(e) => setPicking(e.currentTarget.open)}>
          <summary aria-label={props.current ? t("settings.picker_label", { section: label(props.current) }) : undefined}>
            {props.current ? t("settings.picker", { section: label(props.current) }) : t("settings.picker_none")}
          </summary>
          {groups}
        </details>
      ) : (
        groups
      )}
    </nav>
  );
}

/** What the side bar lists and what every page of Settings is built from: the settings the app shows (with the ones that
 * name a side left out while there is none), and the sections in order once what decides them has loaded. */
export function useSettingsSections() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const { justMe, sides } = useSides();
  const onListsPage = useListsPage();
  const forms = useQuery({ queryKey: ["data-forms"], queryFn: api.dataForms });
  // The add-ons that need keys: each gets password boxes in its own section.
  const keyed = useQuery({ queryKey: ["addon-secrets"], queryFn: api.addonSecrets });
  // With no side beside Personal, the settings that name which project is whose side are left out: nothing in them can be
  // changed to any use until there is one.
  // The words that mean each side are only to tell one side from another: with no side beside Personal there is nothing to tell.
  // The theme and the spacing show what is in effect on this device: the menu under the initials sets the same two things.
  const device = useAppearance();
  const inEffect = (i: S["SettingItem"]) =>
    i.key === "ui.theme" ? { ...i, value: device.theme } : i.key === "ui.density" ? { ...i, value: device.density } : i;
  const everything = (settings.data?.items ?? [])
    .filter((i) => !(justMe && i.key.startsWith("workspace.project.")) && !(sides.length === 0 && i.key.startsWith("workspace.project.side_words.")))
    .map(inEffect);
  const listed = navSections(everything, {
    // Jobs and businesses are added here, so the page is there for a person with only their own life too.
    business: true,
    lists: onListsPage.length > 0,
    files: (forms.data?.length ?? 0) > 0,
    keyed: (keyed.data ?? []).filter((a) => a.secrets.length > 0).map((a) => a.plugin),
    loading: settings.data === undefined,
  });
  return { settings, forms, keyed, sides, justMe, everything, listed };
}

/** Every page of Settings (Connections, Add-ons and what each account can do included) is built in this one frame: the
 * title, the search and the list of sections in the same place, the page's content beside them. */
export function SettingsFrame(props: {
  /** The section whose page is open, marked in the list; none while the page is a list of search results. */
  under?: SettingsSection | null;
  choose: (section: SettingsSection) => void;
  /** The search of a page that shows results itself (Settings). Without it, typing opens Settings with the search made. */
  search?: { query: string; onQuery: (query: string) => void };
  /** The page is one reached from a section's own page (what each account can do): its way back is on the page, so a phone
   * does not also show the list of sections above it. */
  subpage?: boolean;
  /** What sits beside the title (the setup guide, on the first page). */
  acts?: ReactNode;
  contentRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const { t } = useWords();
  const { listed } = useSettingsSections();
  const phone = useIsNarrow();
  return (
    <section className="panel-section settings-screen" aria-labelledby="settings-title">
      <PageHeader id="settings-title" title={t("settings.title")} actions={props.acts} />
      <p className="settings-intro">{t("settings.intro")}</p>
      <div className="settings-layout">
        <div className="settings-side">
          <SearchField
            id={SEARCH_ID}
            label={t("settings.search")}
            value={props.search?.query ?? ""}
            onChange={(value) => {
              if (props.search) props.search.onQuery(value);
              else if (value) {
                handOffSearch(value);
                props.choose("you");
              }
            }}
          />
          {!(props.subpage && phone) && <SettingsNav listed={listed} current={props.under ?? null} choose={props.choose} />}
        </div>
        <div className="settings-content" ref={props.contentRef}>
          {props.children}
        </div>
      </div>
    </section>
  );
}

export function Settings(props: {
  /** Opens the setup guide, at the step named when one is. */
  onOpenGuide: (step?: string) => void;
  onChooseSource: (plugin: string | null) => void;
  /** Opens the Knowledge screen, where the standing rules are kept and reviewed. */
  onOpenKnowledge?: () => void;
  /** Opens the grid of what each AI account can do. */
  onOpenCompare?: () => void;
  /** The section the address names; the first when it names none. */
  section?: SettingsSection | null;
  /** Called with the section the person chose, to put it in the address; without it the screen keeps the choice itself. */
  onSection?: (section: SettingsSection) => void;
  /** A moment (a counter) when something else asks for the form that adds an AI account to open, and its acknowledgment. */
  addAccount?: number | null;
  onAddAccountOpened?: () => void;
}) {
  const { t, tn, has, locale } = useWords();
  const offline = useConnection().offline;
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const settingWords = useSettingWordsFromCache();
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  // What decides which sections are listed, and when a section that loads its own content is ready to take the cursor.
  const lists = useValueLists();
  const { settings, forms, keyed, sides, everything, listed } = useSettingsSections();
  const accounts = useQuery({
    queryKey: ["ai-accounts"],
    queryFn: api.aiAccounts,
  });
  const endpoints = useQuery({ queryKey: ["ai-endpoints"], queryFn: api.endpoints });
  // The person's own name, on the You page: its row is there once this has answered, so the cursor waits for it.
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  // The form that adds an AI account opens here, as a drawer, so the person never leaves Settings for it.
  const [adding, setAdding] = useState(false);
  const [addDirty, setAddDirty] = useState(false);
  const addButton = useRef<HTMLElement | null>(null);
  const requested = props.addAccount;
  const acknowledge = props.onAddAccountOpened;
  useEffect(() => {
    if (requested == null) return;
    setAdding(true);
    acknowledge?.();
  }, [requested, acknowledge]);
  const [chosen, setChosen] = useState<SettingsSection>("you");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // A search made on another page of Settings (Connections, Add-ons) opens here already made.
  const [query, setQuery] = useState(takeSearch);
  const [edits, setEdits] = useState<Edits>({});
  const [problems, setProblems] = useState<Record<string, string>>({});
  // What a refused save refreshed from what is saved now, and when it changed, until the next save goes through.
  const [refreshed, setRefreshed] = useState<{
    lines: Refreshed[];
    time: string;
  }>({ lines: [], time: "" });
  const editsNow = useRef(edits);
  editsNow.current = edits;
  // The settings whose saves are waiting or under way, for the "Saving…" cue, and the moment after the last one finished.
  const [saving, setSaving] = useState<string[]>([]);
  const [justSaved, setJustSaved] = useState(false);
  const content = useRef<HTMLDivElement>(null);

  const canList = useFolderListing(everything.some((i) => i.picker));
  const wanted = props.section ?? chosen;
  const loaded =
    settings.isSuccess &&
    !lists.isPending &&
    !forms.isPending &&
    !keyed.isPending;
  // An address naming a section that has nothing to show (an add-on turned off) opens the first one. The older address of
  // the Lists page, when no list is left on it, opens the business page where the project lists are.
  const section: SettingsSection =
    !loaded || listed.includes(wanted) ? wanted : wanted === "lists" && sides.length > 0 ? "business" : "you";
  const addonName = useAddonName();
  const label = (s: SettingsSection) =>
    s.startsWith("addon/")
      ? addonName(s.slice("addon/".length))
      : t(`settings.section.${s}`);

  const choose = (next: SettingsSection) => {
    setQuery("");
    if (props.onSection) props.onSection(next);
    else setChosen(next);
  };

  // The cursor goes to the section's first field when it opens, or to its heading where its content is a list.
  const settled =
    settings.isSuccess &&
    (section === "ai"
      ? !accounts.isPending
      : section === "business" || section === "lists"
        ? !lists.isPending
        : section === "files"
          ? !forms.isPending
          : section === "you"
            ? !me.isPending
            : true);
  const searching = query.trim() !== "";
  useEffect(() => {
    if (!settled) return;
    const root = content.current;
    if (!root) return;
    // A search made on another page keeps the cursor in the search box, so typing goes on where it was. The search can
    // arrive just after the section opens (the page it was typed on hands it over), so this runs again when it does.
    const searchBox = document.getElementById(SEARCH_ID);
    if (query.trim() && searchBox instanceof HTMLInputElement) {
      searchBox.focus({ preventScroll: true });
      searchBox.setSelectionRange(searchBox.value.length, searchBox.value.length);
      return;
    }
    // Someone clearing the search box keeps typing there.
    if (searchBox && document.activeElement === searchBox) return;
    // A section opens with the cursor on its heading, never in a field.
    root.querySelector<HTMLElement>("[data-section-heading]")?.focus({ preventScroll: true });
    // Only when a section opens or a search starts: a save must not move the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, settled, searching]);

  // The fingerprint to save against is the one the screen loaded with and what each save answered with. A background
  // reload doesn't replace it, so a change made elsewhere is refused instead of being written over; after the refusal
  // the next load does, since the person has been told to look again.
  const adopt = useRef(true);
  useEffect(() => {
    if (!settings.data || settings.isFetching || !adopt.current) return;
    adopt.current = false;
    rememberFingerprint(client, settings.data.fingerprint);
  }, [client, settings.data, settings.isFetching]);

  // Typed values the saves have not yet answered are kept for the tab: a reload brings them back and saves them.
  const [kept, setKept] = useState(false);
  useEffect(() => {
    if (!kept) return;
    writeUnsaved(edits);
  }, [kept, edits]);
  useEffect(() => {
    const flush = () => {
      if (kept) writeUnsaved(editsNow.current);
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [kept]);
  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 3000);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const draftOf = (item: Item): Draft =>
    item.key in edits ? edits[item.key] : toDraft(item);
  const edit = (key: string, draft: Draft) => {
    setEdits((all) => ({ ...all, [key]: draft }));
    setProblems((all) => (all[key] ? { ...all, [key]: "" } : all));
  };

  // Saves go one at a time, each on the fingerprint the one before answered with.
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = (run: () => Promise<boolean | void>, keys: string[] = []) => {
    setSaving((all) => [...all, ...keys]);
    setJustSaved(false);
    const done = async () => {
      const saved = await run();
      setSaving((all) => {
        const next = [...all];
        for (const k of keys) {
          const at = next.indexOf(k);
          if (at >= 0) next.splice(at, 1);
        }
        if (next.length === 0 && saved === true) setJustSaved(true);
        return next;
      });
    };
    chain.current = chain.current.then(done, done);
  };
  const drop = (key: string, sent?: Draft) =>
    setEdits((all) => {
      if (!(key in all) || (sent !== undefined && all[key] !== sent))
        return all;
      const next = { ...all };
      delete next[key];
      return next;
    });
  const save = async (
    key: string,
    body: { changes?: Record<string, unknown>; reset?: string[] },
    sent?: Draft,
  ): Promise<boolean> => {
    const view = client.getQueryData<S["SettingsView"]>(["settings"]);
    const fingerprint = knownFingerprint(client, view?.fingerprint);
    if (!view || !fingerprint) return false;
    setProblems((all) => ({ ...all, [key]: "" }));
    try {
      const saved = await api.saveSettings({
        changes: body.changes ?? {},
        reset: body.reset ?? [],
        fingerprint,
      });
      rememberFingerprint(client, saved.fingerprint);
      // What the screen shows is what was saved, at once, before the reload comes back.
      client.setQueryData<S["SettingsView"]>(
        ["settings"],
        (now) =>
          now && {
            fingerprint: saved.fingerprint,
            items: now.items.map((item) => {
              const change = saved.changes.find((c) => c.key === item.key);
              return change
                ? {
                    ...item,
                    value: change.after,
                    source: change.is_default ? "default" : "file",
                    by_setup: false,
                  }
                : item;
            }),
          },
      );
      drop(key, sent);
      setRefreshed({ lines: [], time: "" });
      // The refresh of what the save changed is not waited for: the next save goes on at once, on the fingerprint this one
      // answered with.
      void afterSave(saved);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Out of date: load again. What the person didn't touch takes what is saved now and is listed; what they
        // changed stays as typed, and is marked on its row.
        adopt.current = true;
        const typed = editsNow.current;
        try {
          const now = await freshSettings(client);
          rememberFingerprint(client, now.fingerprint);
          const was = view.items;
          setRefreshed({
            lines: refreshedSettings(was, now.items, (k) => k in typed, t, has, settingWords.value),
            time: changedTime(now),
          });
          setProblems((all) => {
            const next = { ...all, [key]: t("settings.changed_since_opened") };
            for (const k of Object.keys(typed))
              if (changedUnderneath(was, now.items, k))
                next[k] = t("settings.changed_since_opened");
            return next;
          });
        } catch {
          void client.invalidateQueries({ queryKey: ["settings"] });
          setProblems((all) => ({
            ...all,
            [key]: t("settings.changed_since_opened"),
          }));
        }
        return false;
      }
      // A refused value says what is allowed beside its field, naming the field by the label its screen shows.
      const refused =
        err instanceof ApiError && err.detail && err.field
          ? t("settings.refused", { label: labelForKey(err.field, view.items, t, has), reason: err.detail })
          : null;
      setProblems((all) => ({
        ...all,
        [key]: refused ?? (err instanceof ApiError && err.detail ? err.detail : problemText(err, t)),
      }));
      return false;
    }
  };

  const commit = (item: Item, draft: Draft) => {
    if (item.locked || !item.editable || item.type === "other") return;
    const parsed = fromDraft(item, draft);
    if (!parsed.ok) return;
    // This device shows the choice at once, even when the workspace's saved value is already the same.
    applyAppearanceChanges([{ key: item.key, after: parsed.value }]);
    // A repeat of what is saved and nothing is waiting to save (Enter, then the cursor leaving, as when the cursor goes to the
    // Reset beside it) sends nothing and shows no Saving cue, which would take that button away from under the press.
    const heldNow = client.getQueryData<S["SettingsView"]>(["settings"])?.items.find((i) => i.key === item.key);
    if (heldNow && !saving.includes(item.key)) {
      const stored = fromDraft(heldNow, toDraft(heldNow));
      if (stored.ok && JSON.stringify(stored.value) === JSON.stringify(parsed.value)) {
        drop(item.key, draft);
        return;
      }
    }
    enqueue(async () => {
      // What is saved now, so a repeat (Enter, then the cursor leaving) or an edit put back as it was sends nothing.
      const now =
        client
          .getQueryData<S["SettingsView"]>(["settings"])
          ?.items.find((i) => i.key === item.key) ?? item;
      const saved = fromDraft(now, toDraft(now));
      if (
        saved.ok &&
        JSON.stringify(saved.value) === JSON.stringify(parsed.value)
      ) {
        drop(item.key, draft);
        return;
      }
      return save(item.key, { changes: { [item.key]: parsed.value } }, draft);
    }, [item.key]);
  };

  // What was typed and not yet saved when the tab was last left comes back, and is saved.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !settings.data) return;
    restored.current = true;
    const stored = readUnsaved();
    const back: Edits = {};
    // In the order they were typed, since one limit may be refused above another that is typed after it.
    const found: Item[] = [];
    for (const [key, draft] of Object.entries(stored)) {
      const item = settings.data.items.find((i) => i.key === key);
      if (item && draft !== toDraft(item)) {
        back[key] = draft;
        found.push(item);
      }
    }
    setKept(true);
    if (found.length === 0) return;
    setEdits(back);
    for (const item of found) commit(item, back[item.key]);
    // Once, when the settings first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data]);

  const reset = (item: Item) => {
    drop(item.key);
    enqueue(async () => {
      const saved = await save(item.key, { reset: [item.key] });
      document.getElementById(`setting-${item.key}`)?.focus();
      return saved;
    }, [item.key]);
  };

  /** Puts several settings of one row back to their defaults in one save, so one toast reads it back with its Undo. */
  const resetMany = (items: Item[]) => {
    for (const item of items) drop(item.key);
    enqueue(async () => {
      const saved = await save(items[0].key, { reset: items.map((i) => i.key) });
      document.getElementById(`setting-${items[0].key}`)?.focus();
      return saved;
    }, items.map((i) => i.key));
  };

  // With one side, the words that mean it are named for it, by the name of its project.
  const sideLabel = (item: Item): string | undefined =>
    item.key === "workspace.project.side_words.business" && sides.length === 1
      ? t("settings.business.words_named", { name: sides[0].name })
      : undefined;

  // Backing up on its own needs a place to put the copies: with none chosen the switch shows off and says why, whatever the file holds.
  const noBackupFolder = (() => {
    const targets = everything.find((i) => i.key === "storage.backups.targets")?.value;
    return Array.isArray(targets) && targets.length === 0;
  })();
  const writeAmount = useWriteAmount();
  // Ask-before above the most one run may cost is never asked: those runs don't start. Said beside the amount, nothing refused.
  const crossNote = (item: Item): string | undefined => {
    if (item.key !== "ai.budgets.confirm_above_usd") return undefined;
    const run = everything.find((i) => i.key === "ai.budgets.per_run_usd");
    const ask = parseAmount(String(draftOf(item)), locale);
    const most = run ? parseAmount(String(draftOf(run)), locale) : null;
    return ask !== null && most !== null && ask > most ? t("settings.note.ask_above_run", { most: writeAmount(most) }) : undefined;
  };
  const row = (item: Item) => {
    const gate = switchOf(item, everything);
    return (
      <SettingRow
        key={item.key}
        item={item}
        reason={item.key === "storage.backups.automatic" && noBackupFolder ? t("settings.backups.automatic_needs_folder") : undefined}
        label={sideLabel(item)}
        draft={draftOf(item)}
        onChange={(draft) => edit(item.key, draft)}
        commit={(draft) => commit(item, draft)}
        onReset={() => reset(item)}
        problem={problems[item.key]}
        saving={saving.includes(item.key)}
        beside
        disabled={offline}
        cross={crossNote(item)}
        mark={query.trim() || undefined}
        depth={depthOf(item, everything)}
        gate={gate && isOff(gate, edits) ? gate : null}
        canList={canList}
      />
    );
  };

  /** A list of settings as rows: a merged row (the working hours, the brief's times) stands for all of its settings. */
  const rows = (items: Item[]) =>
    entriesOf(items).map((entry) =>
      entry.kind === "item" ? (
        row(entry.item)
      ) : (
        <MergedRow
          key={entry.id}
          id={entry.id}
          items={entry.items}
          draftOf={draftOf}
          onChange={edit}
          commit={commit}
          onReset={resetMany}
          problems={problems}
        />
      ),
    );

  /** The settings of one group, under its heading when there is a heading to show. */
  const group = (name: string, items: Item[], heading: boolean) => {
    const titleId = `settings-group-${name.replace(/[^A-Za-z0-9_-]/g, "-")}`;
    return (
      <div
        key={name}
        className="settings-group"
        role="group"
        aria-labelledby={heading ? titleId : undefined}
      >
        {heading && <h3 id={titleId}>{addonOf(name) !== null ? addonName(addonOf(name) as string) : groupLabel(name, t, has)}</h3>}
        {rows(items)}
      </div>
    );
  };

  /** A page of settings: the rows the app places on it, with a heading for each group only where the page is the AI page
   * or an add-on's own. The rarely changed ones are left for the page's "More settings" fold. */
  const form = (id: SettingsSection, lead?: ReactNode) => {
    const byTopic = topics(sectionItems(everything, id).filter((i) => !i.advanced));
    const headings = id === "ai" || (id.startsWith("addon/") && byTopic.length > 1);
    // A page with no settings of its own and nothing leading it (Quick links) draws no empty block, which would hold a gap open.
    if (byTopic.length === 0 && !lead) return null;
    return (
      <div className="settings-groups">
        {lead}
        {byTopic.map((topic) => group(topic.group, topic.items, headings))}
      </div>
    );
  };

  /** The foot of every page: its rarely changed settings in one closed fold, and whatever else belongs with them (the
   * accent color's contrast, where a chat app's address is kept). Nothing when the page has none. */
  const moreSettings = (id: SettingsSection) => {
    const items = sectionItems(everything, id).filter((i) => i.advanced);
    const extra =
      id === "today" ? <Notifications part="webhook" /> : null;
    if (items.length === 0 && !extra) return null;
    return (
      <details key={id} className="more-options more-settings" data-more={id}>
        <summary>{t("settings.more")}</summary>
        <div className="settings-groups">
          {rows(items)}
          {extra}
        </div>
      </details>
    );
  };

  /** Advanced: the topics that have no page of their own, each closed until it is opened. */
  const advanced = () =>
    topics(sectionItems(everything, "advanced")).map((topic) => {
      const key = `advanced:${topic.group}`;
      const id = `settings-topic-${topic.group.replace(/[^A-Za-z0-9_-]/g, "-")}`;
      return (
        <div key={topic.group} className="settings-topic">
          <h3 id={`${id}-title`}>
            <button
              type="button"
              className="topic-toggle"
              aria-expanded={!!open[key]}
              aria-controls={id}
              onClick={() => setOpen({ ...open, [key]: !open[key] })}
            >
              {topicLabel(topic.group, t, has)}
            </button>
            <span className="topic-count" aria-hidden="true">
              {tn("settings.topic_count", topic.items.length)}
            </span>
          </h3>
          <div
            id={id}
            hidden={!open[key]}
            role="group"
            aria-labelledby={`${id}-title`}
          >
            {open[key] && group(topic.group, topic.items, false)}
            {open[key] && topic.group === "learns" && props.onOpenKnowledge && (
              <p className="hint">
                {t("settings.rules_link")}{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={props.onOpenKnowledge}
                >
                  {t("settings.rules_open")}
                </button>
              </p>
            )}
          </div>
        </div>
      );
    });

  const heading = (id: SettingsSection) => (
    <h2
      id={`settings-section-${id.replace(/[^A-Za-z0-9_-]/g, "-")}`}
      tabIndex={-1}
      data-section-heading=""
    >
      {label(id)}
    </h2>
  );

  // The words a person may search by besides the settings' own: the shipped list, which the workspace may replace.
  const searchWords = settings.data?.search_words ?? {};
  const found = query.trim()
    ? everything.filter(
        (item) => isListed(item) && matches(item, query, t, has, searchWords),
      )
    : [];
  // What a search also finds that is not a row of a setting: each section, the AI accounts, the backup key and the keys an
  // add-on needs. Each opens its section.
  const places: Place[] = [
    ...listed.map((id) => ({
      id: `section:${id}`,
      section: id,
      label: label(id),
      about: t(id.startsWith("addon/") ? "settings.about.addon" : `settings.about.${id}`),
    })),
    ...(listed.includes("backups")
      ? [{ id: "backup-key", section: "backups" as SettingsSection, label: t("settings.place.backup_key"), about: t("settings.place.backup_key_about") }]
      : []),
    ...(accounts.data ?? [])
      .filter((a) => a.adapter !== "stub")
      .map((a) => ({
        id: `account:${a.name}`,
        section: "ai" as SettingsSection,
        label: accountName(a, endpoints.data?.find((e) => e.id === a.kind), t),
        about: t("settings.place.ai_account"),
      })),
    ...(keyed.data ?? [])
      .filter((a) => a.secrets.length > 0 && listed.includes(`addon/${a.plugin}`))
      .map((a) => ({
        id: `keys:${a.plugin}`,
        section: `addon/${a.plugin}` as SettingsSection,
        label: t("settings.place.addon_keys", { name: addonName(a.plugin) }),
        about: t("settings.place.addon_keys_about"),
      })),
  ];
  const placesHit = query.trim() ? placesFound(places, query, searchWords) : [];
  const goTo = (e: MouseEvent, id: SettingsSection) => {
    // A plain click moves within the app; a modified one (a new tab) keeps its link.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    choose(id);
  };
  const results = () => {
    if (!found.length && !placesHit.length)
      return <EmptyState text={t("settings.none_match")} />;
    return (
      <>
        {placesHit.length > 0 && (
          <section className="settings-results" aria-label={t("settings.places")} data-places="">
            <GroupLabel>{t("settings.places")}</GroupLabel>
            <ul className="settings-places">
              {placesHit.map((place) => (
                <li key={place.id}>
                  <a href={viewHref(settingsView(place.section))} onClick={(e) => goTo(e, place.section)}>
                    <Marked text={place.label} query={query} />
                  </a>
                  <span className="settings-place-about">{place.about}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {listed
          .map((id) => ({
            id,
            items: found.filter((i) => sectionOfItem(i) === id),
          }))
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section
              key={s.id}
              className="settings-results"
              aria-label={label(s.id)}
            >
              <GroupLabel>{label(s.id)}</GroupLabel>
              {rows(s.items)}
            </section>
          ))}
      </>
    );
  };

  const body = () => {
    if (section === "ai") {
      return (
        <>
          <AiAccounts
            level={2}
            local={setup.data?.local}
            onAdd={() => {
              addButton.current =
                document.activeElement instanceof HTMLElement
                  ? document.activeElement
                  : null;
              setAdding(true);
            }}
            onCompare={props.onOpenCompare}
          />
          <AiChoices />
          {form("ai")}
          {moreSettings("ai")}
        </>
      );
    }
    if (section === "business") {
      return (
        <>
          {heading("business")}
          <BusinessSides />
          {form("business")}
          <ValueLists level={3} place="business" />
        </>
      );
    }
    if (section === "lists") return <ValueLists level={2} />;
    if (section === "files") return <DataForms level={2} />;
    if (section === "advanced") {
      return (
        <>
          {heading("advanced")}
          <p className="hint">{t("settings.advanced_intro")}</p>
          <div className="settings-topics">{advanced()}</div>
        </>
      );
    }
    return (
      <>
        {heading(section)}
        {form(section, section === "you" ? <YourName /> : undefined)}
        {section === "links" && <PageLinks />}
        {section.startsWith("addon/") && (
          <AddonSecrets
            unlessSignedIn
            plugin={section.slice("addon/".length)}
            name={label(section)}
          />
        )}
        {section === "you" && <ActingAccounts />}
        {section === "today" && <ReminderWhere />}
        {section === "today" && <Notifications part="browser" />}
        {section === "backups" && (
          <>
            <BackupsPanel local={setup.data?.local ?? false} />
            <BackupKey />
            <SyncPanel />
            <JobsPanel />
          </>
        )}
        {moreSettings(section)}
      </>
    );
  };

  return (
    <>
      <SettingsFrame
        under={!query.trim() ? section : null}
        choose={choose}
        search={{ query, onQuery: setQuery }}
        acts={
          section === "you" && !query.trim() ? (
            <Button onClick={() => props.onOpenGuide()}>
              {t("settings.open_guide")}
            </Button>
          ) : null
        }
        contentRef={content}
      >
        {query.trim() && (
          <p className="hint" role="status">
            {[placesHit.length ? tn("settings.places_shown", placesHit.length) : "", found.length ? tn("settings.shown", found.length) : ""]
              .filter(Boolean)
              .join(" ")}
          </p>
        )}
        {settings.isPending ? (
          <Skeleton shape="form" rows={3} />
        ) : settings.isError ? (
          <LoadFailed message={t("settings.failed")} onRetry={() => void settings.refetch()} />
        ) : query.trim() ? (
          results()
        ) : (
          <>
            {offline && (
              <p className="hint" role="status" data-held="">
                {t("settings.offline_held")}
              </p>
            )}
            <RefreshedLines lines={refreshed.lines} time={refreshed.time} />
            {loaded && wanted !== section && (
              <p className="hint" role="status" data-not-available="">
                {t("settings.not_available", { page: label(wanted), shown: label(section) })}{" "}
                <a href={viewHref("today")}>{t("settings.not_available_back")}</a>
              </p>
            )}
            {body()}
            {/* At the foot of the page: the line appearing never moves the field being edited above it. */}
            <p className="hint save-status" role="status" data-save-status="">
              {saving.length > 0 ? t("settings.saving") : justSaved ? t("settings.saved_status") : ""}
            </p>
          </>
        )}
      </SettingsFrame>
      <Drawer
        open={adding}
        title={t("ai_add.title")}
        dirty={addDirty}
        wide
        onClose={() => {
          setAdding(false);
          setAddDirty(false);
          restoreFocus(() => addButton.current);
        }}
      >
        {adding && setup.data && (
          <WelcomeAi
            local={setup.data.local}
            done
            drawer={{
              onAdded: () => {
                setAdding(false);
                setAddDirty(false);
                restoreFocus(() => addButton.current);
              },
              onCancel: () => {
                setAdding(false);
                setAddDirty(false);
                restoreFocus(() => addButton.current);
              },
              onDirty: setAddDirty,
            }}
          />
        )}
      </Drawer>
    </>
  );
}
