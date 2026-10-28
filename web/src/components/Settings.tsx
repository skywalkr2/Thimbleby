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
  addonLabel,
  fromDraft,
  groupLabel,
  isOff,
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
  knownFingerprint,
  rememberFingerprint,
  useAfterSave,
} from "../lib/settings-save";
import { handOffSearch, takeSearch } from "../lib/settings-search";
import { useSides } from "../lib/sides";
import { settingsView, viewHref, type SettingsSection } from "../lib/views";
import { useWords } from "../lib/wording";
import { AiAccounts } from "./AiAccounts";
import { AiChoices } from "./AiRouting";
import { MergedRow } from "./MergedRow";
import { DataForms } from "./DataForms";
import { useFolderListing } from "./FolderPicker";
import { JobsPanel } from "./JobsPanel";
import { BrandContrast } from "./BrandContrast";
import { BusinessSides } from "./BusinessSides";
import { AddonSecrets, BackupKey } from "./KeptSecrets";
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
import { WelcomeAi } from "./WelcomeAi";
import { restoreFocus } from "./ModalPanel";

type Edits = Record<string, Draft>;

const SEARCH_ID = "settings-search";

const FIRST_FIELD =
  "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])";

/** The sections listed down the side of Settings (Connections and Add-ons among them). The pages reached from Settings
 * (what each account can do) show it too, so the person can go to any other section from where they are. */
export function SettingsNav(props: {
  listed: SettingsSection[];
  /** The section whose page is open; none when the page is one of the screens reached from Settings. */
  current: SettingsSection | null;
  choose: (section: SettingsSection) => void;
}) {
  const { t, has } = useWords();
  const label = (s: SettingsSection) =>
    s.startsWith("addon/")
      ? addonLabel(s.slice("addon/".length), t, has)
      : t(`settings.section.${s}`);
  const follow = (e: MouseEvent, run: () => void) => {
    // A plain click moves within the app; a modified one (a new tab) keeps its link.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    e.preventDefault();
    run();
  };
  return (
    <nav aria-label={t("settings.sections")}>
      <ul className="settings-nav">
        {props.listed.map((id) => (
          <li key={id}>
            <a
              href={viewHref(settingsView(id))}
              aria-current={id === props.current ? "page" : undefined}
              onClick={(e) => follow(e, () => props.choose(id))}
            >
              {label(id)}
            </a>
          </li>
        ))}
      </ul>
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
  const everything = (settings.data?.items ?? []).filter(
    (i) => !(justMe && i.key.startsWith("workspace.project.")) && !(sides.length === 0 && i.key.startsWith("workspace.project.side_words.")),
  );
  const listed = navSections(everything, {
    business: sides.length > 0,
    lists: onListsPage.length > 0,
    files: (forms.data?.length ?? 0) > 0,
    keyed: (keyed.data ?? []).filter((a) => a.secrets.length > 0).map((a) => a.plugin),
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
  /** What sits beside the title (the setup guide, on the first page). */
  acts?: ReactNode;
  contentRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  const { t } = useWords();
  const { listed } = useSettingsSections();
  return (
    <section className="panel-section settings-screen" aria-labelledby="settings-title">
      <div className="heading">
        <h1 id="settings-title">{t("settings.title")}</h1>
        {props.acts && <div className="acts">{props.acts}</div>}
      </div>
      <p className="settings-intro">{t("settings.intro")}</p>
      <div className="settings-layout">
        <div className="settings-side">
          <div className="field">
            <label htmlFor={SEARCH_ID}>{t("settings.search")}</label>
            <input
              id={SEARCH_ID}
              type="search"
              value={props.search?.query ?? ""}
              onChange={(e) => {
                if (props.search) props.search.onQuery(e.target.value);
                else if (e.target.value) {
                  handOffSearch(e.target.value);
                  props.choose("you");
                }
              }}
              autoComplete="off"
            />
          </div>
          <SettingsNav listed={listed} current={props.under ?? null} choose={props.choose} />
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
  const { t, tn, has } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  // What decides which sections are listed, and when a section that loads its own content is ready to take the cursor.
  const lists = useValueLists();
  const { settings, forms, keyed, sides, everything, listed } = useSettingsSections();
  const accounts = useQuery({
    queryKey: ["ai-accounts"],
    queryFn: api.aiAccounts,
  });
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
  const content = useRef<HTMLDivElement>(null);

  // The accent color as it stands on screen: what is typed, else what is saved.
  const brand = everything.find((i) => i.key === "ui.brand.color");
  const brandColor = brand
    ? String(brand.key in edits ? edits[brand.key] : (brand.value ?? ""))
    : "";
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
    !loaded || listed.includes(wanted) ? wanted : wanted === "lists" && listed.includes("business") ? "business" : "you";
  const label = (s: SettingsSection) =>
    s.startsWith("addon/")
      ? addonLabel(s.slice("addon/".length), t, has)
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
  useEffect(() => {
    if (!settled) return;
    const root = content.current;
    if (!root) return;
    // A search made on another page keeps the cursor in the search box, so typing goes on where it was.
    const searchBox = document.getElementById(SEARCH_ID);
    if (query.trim() && searchBox instanceof HTMLInputElement) {
      searchBox.focus({ preventScroll: true });
      searchBox.setSelectionRange(searchBox.value.length, searchBox.value.length);
      return;
    }
    // A field inside a closed "More settings" fold can't take the cursor.
    const field = Array.from(root.querySelectorAll<HTMLElement>(FIRST_FIELD)).find((el) => !el.closest("details:not([open])"));
    const heading = root.querySelector<HTMLElement>("[data-section-heading]");
    const target =
      section === "ai" || section === "files" || section === "lists"
        ? heading
        : (field ?? heading);
    target?.focus({ preventScroll: true });
    // Only when a section opens: a save must not move the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, settled]);

  // The fingerprint to save against is the one the screen loaded with and what each save answered with. A background
  // reload doesn't replace it, so a change made elsewhere is refused instead of being written over; after the refusal
  // the next load does, since the person has been told to look again.
  const adopt = useRef(true);
  useEffect(() => {
    if (!settings.data || settings.isFetching || !adopt.current) return;
    adopt.current = false;
    rememberFingerprint(client, settings.data.fingerprint);
  }, [client, settings.data, settings.isFetching]);

  const draftOf = (item: Item): Draft =>
    item.key in edits ? edits[item.key] : toDraft(item);
  const edit = (key: string, draft: Draft) => {
    setEdits((all) => ({ ...all, [key]: draft }));
    setProblems((all) => (all[key] ? { ...all, [key]: "" } : all));
  };

  // Saves go one at a time, each on the fingerprint the one before answered with.
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = (run: () => Promise<void>) => {
    chain.current = chain.current.then(run, run);
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
  ) => {
    const view = client.getQueryData<S["SettingsView"]>(["settings"]);
    const fingerprint = knownFingerprint(client, view?.fingerprint);
    if (!view || !fingerprint) return;
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
      await afterSave(saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Out of date: load again. What the person didn't touch takes what is saved now and is listed; what they
        // changed stays as typed, and is marked on its row.
        adopt.current = true;
        const typed = editsNow.current;
        try {
          const now = await client.fetchQuery({
            queryKey: ["settings"],
            queryFn: api.settings,
            staleTime: 0,
          });
          rememberFingerprint(client, now.fingerprint);
          const was = view.items;
          setRefreshed({
            lines: refreshedSettings(was, now.items, (k) => k in typed, t, has),
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
        return;
      }
      setProblems((all) => ({
        ...all,
        [key]:
          err instanceof ApiError && err.detail
            ? err.detail
            : problemText(err, t),
      }));
    }
  };

  const commit = (item: Item, draft: Draft) => {
    if (item.locked || !item.editable || item.type === "other") return;
    const parsed = fromDraft(item, draft);
    if (!parsed.ok) return;
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
      await save(item.key, { changes: { [item.key]: parsed.value } }, draft);
    });
  };

  const reset = (item: Item) => {
    drop(item.key);
    enqueue(async () => {
      await save(item.key, { reset: [item.key] });
      document.getElementById(`setting-${item.key}`)?.focus();
    });
  };

  /** Puts several settings of one row back to their defaults in one save, so one toast reads it back with its Undo. */
  const resetMany = (items: Item[]) => {
    for (const item of items) drop(item.key);
    enqueue(async () => {
      await save(items[0].key, { reset: items.map((i) => i.key) });
      document.getElementById(`setting-${items[0].key}`)?.focus();
    });
  };

  // With one side, the words that mean it are named for it, by the name of its project.
  const sideLabel = (item: Item): string | undefined =>
    item.key === "workspace.project.side_words.business" && sides.length === 1
      ? t("settings.business.words_named", { name: sides[0].name })
      : undefined;

  const row = (item: Item) => {
    const gate = switchOf(item, everything);
    return (
      <SettingRow
        key={item.key}
        item={item}
        label={sideLabel(item)}
        draft={draftOf(item)}
        onChange={(draft) => edit(item.key, draft)}
        commit={(draft) => commit(item, draft)}
        onReset={() => reset(item)}
        problem={problems[item.key]}
        beside
        disabled={false}
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
        {heading && <h3 id={titleId}>{groupLabel(name, t, has)}</h3>}
        {rows(items)}
      </div>
    );
  };

  /** A page of settings: the rows the app places on it, with a heading for each group only where the page is the AI page
   * or an add-on's own. The rarely changed ones are left for the page's "More settings" fold. */
  const form = (id: SettingsSection, lead?: ReactNode) => {
    const byTopic = topics(sectionItems(everything, id).filter((i) => !i.advanced));
    const headings = id === "ai" || (id.startsWith("addon/") && byTopic.length > 1);
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
      id === "appearance" ? <BrandContrast color={brandColor} /> : id === "today" ? <Notifications part="webhook" /> : null;
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

  const found = query.trim()
    ? everything.filter(
        (item) => isListed(item) && matches(item, query, t, has),
      )
    : [];
  const results = () => {
    if (!found.length)
      return <p className="empty">{t("settings.none_match")}</p>;
    return listed
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
          <h3>{label(s.id)}</h3>
          {rows(s.items)}
        </section>
      ));
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
            plugin={section.slice("addon/".length)}
            name={label(section)}
          />
        )}
        {section === "you" && <ActingAccounts />}
        {section === "today" && <ReminderWhere />}
        {section === "today" && <Notifications part="browser" />}
        {section === "backups" && (
          <>
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
            <button type="button" className="btn" onClick={() => props.onOpenGuide()}>
              {t("settings.open_guide")}
            </button>
          ) : null
        }
        contentRef={content}
      >
        {query.trim() && (
          <p className="hint" role="status">
            {found.length ? tn("settings.shown", found.length) : ""}
          </p>
        )}
        {settings.isPending ? (
          <Skeleton />
        ) : settings.isError ? (
          <p className="empty">{t("settings.failed")}</p>
        ) : query.trim() ? (
          results()
        ) : (
          <>
            <RefreshedLines lines={refreshed.lines} time={refreshed.time} />
            {body()}
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
