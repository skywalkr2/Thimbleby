// Handled for you (design 7.20): what the app dealt with so the person didn't have to, on three lists by how it was
// handled: mail set aside before the assistant read it, changes a rule closed, and mail read with nothing to do. Rows are
// grouped by the reason they were handled (or by sender), collapsed, with a count and a Show more past a page of rows;
// a kind-of-item filter and a search narrow them. Every row says what kind of item it is and why, and offers Take a
// closer look (or Treat as work for set-aside mail) in one click with Undo, each recording a correction. Leaving an item
// where it is is the confirmation, so there is no choice that keeps it.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { whenText as when } from "../lib/dates";
import { useSetAside } from "../lib/set-aside";
import { recordView, toHash } from "../lib/views";
import { useWords } from "../lib/wording";
import { Icon } from "../ui/Icon";
import { Skeleton } from "../ui/Skeleton";
import styles from "./Handled.module.css";
import { AssistantCloses } from "./HandledClosed";
import { RowMenu, type MenuAction } from "./RowMenu";
import { useVersionActs } from "./SameDocument";
import { useAct } from "../lib/act";

type Tab = S["HandledView"]["tab"];
type Group = S["HandledView"]["group"];
type Row = S["HandledRow"];
type Item = S["HandledRow"]["item"];
const TABS: Tab[] = ["set_aside", "closed", "read"];
const GROUPS: Group[] = ["reason", "sender"];
/** How long typing waits before the list is asked for again. */
const TYPING_MS = 250;

export function Handled() {
  const { t, tn } = useWords();
  const ids = useId();
  const [tab, setTab] = useState<Tab>("set_aside");
  const [group, setGroup] = useState<Group | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [more, setMore] = useState<Record<string, number>>({});
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const search = useRef<HTMLInputElement>(null);

  // The cursor starts in the search box.
  useEffect(() => {
    search.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(typed.trim()), TYPING_MS);
    return () => window.clearTimeout(timer);
  }, [typed]);

  const list = useQuery({ queryKey: ["handled", tab, group, query, item], queryFn: () => api.handled(tab, group, query, item), placeholderData: keepPreviousData });
  const shownGroup: Group = group ?? list.data?.group ?? "reason";
  const pageRows = list.data?.page_rows ?? 25;
  // A kind that the list no longer holds stops narrowing it.
  const kinds = list.data?.kinds ?? [];
  const counts = list.data?.counts;
  const toggle = (key: string) =>
    setOpened((now) => {
      const next = new Set(now);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <section className="panel-section" aria-labelledby={`${ids}-title`} data-handled="">
      <div className="heading">
        <h1 id={`${ids}-title`}>{t("handled.title")}</h1>
        <div className={`filters ${styles.tabs}`} role="group" aria-label={t("handled.tabs")}>
          {TABS.map((name) => (
            <button key={name} type="button" aria-pressed={tab === name} onClick={() => {
                setTab(name);
                setItem(null);
              }}>
              {t(`handled.tab.${name}`, { n: counts ? counts[name] : "…" })}
            </button>
          ))}
        </div>
      </div>
      <p className="hint">{t(`handled.explain.${tab}`)}</p>
      {list.data && <p className="hint">{tn("handled.kept", list.data.kept_days)}</p>}
      <div className={styles.bar}>
        <div className={`field ${styles.search}`}>
          <label htmlFor={`${ids}-search`}>{t("handled.search")}</label>
          <input id={`${ids}-search`} ref={search} type="search" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
        <div className={`filters ${styles.tabs}`} role="group" aria-label={t("handled.group")}>
          {GROUPS.map((name) => (
            <button key={name} type="button" aria-pressed={shownGroup === name} onClick={() => setGroup(name)}>
              {t(`handled.group.${name}`)}
            </button>
          ))}
        </div>
      </div>
      {kinds.length > 1 || item ? (
        <div className={`filters ${styles.tabs}`} role="group" aria-label={t("handled.filter")}>
          <button type="button" aria-pressed={item === null} onClick={() => setItem(null)}>
            {t("handled.filter.all")}
          </button>
          {kinds.map((k) => (
            <button key={k.item} type="button" aria-pressed={item === k.item} onClick={() => setItem(k.item)}>
              {t("handled.filter.kind", { kind: t(`handled.item.${k.item}`), n: k.count })}
            </button>
          ))}
        </div>
      ) : null}
      {list.isPending ? (
        <Skeleton />
      ) : list.isError ? (
        <p className="empty">
          {t("handled.load_failed")}{" "}
          <button type="button" className="btn" onClick={() => void list.refetch()}>
            {t("action.try_again")}
          </button>
        </p>
      ) : list.data.groups.length === 0 ? (
        <p className="empty" role="status">
          {t(query ? "handled.none_match" : `handled.empty.${tab}`)}
        </p>
      ) : (
        <div className={styles.groups}>
          {list.data.groups.map((g, index) => {
            const key = `${tab}|${shownGroup}|${item ?? ""}|${g.key}`;
            const limit = pageRows + (more[key] ?? 0);
            // A search shows the mail it found, so its groups are open.
            const open = !!query || opened.has(key);
            const name =
              g.label ??
              (g.key.startsWith("kind:")
                ? t(`handled.kind.${g.key.slice(5) as Row["kind"]}`)
                : t(shownGroup === "reason" ? "handled.reason_unknown" : "handled.sender_unknown"));
            return (
              <section key={key} className={styles.group} data-group={g.key}>
                <h2>
                  <button type="button" className="expander text" aria-expanded={open} aria-controls={open ? `${ids}-group-${index}` : undefined} onClick={() => toggle(key)}>
                    <span className={styles.head}>
                      <span className={styles.chevron} data-open={open ? "" : undefined}>
                        <Icon name="chevron" size={16} />
                      </span>
                      <strong>{t("handled.group_name", { name, n: g.count })}</strong>
                    </span>
                  </button>
                </h2>
                {open && (
                  <ul className="queue" id={`${ids}-group-${index}`}>
                    {g.items.slice(0, limit).map((row) => (
                      <HandledRow key={row.id} item={row} />
                    ))}
                    {g.items.length > limit && (
                      <li className="line">
                        <button type="button" className="btn quiet" onClick={() => setMore((now) => ({ ...now, [key]: (now[key] ?? 0) + pageRows }))}>
                          {t("handled.show_more", { n: g.items.length - limit })}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
      {tab === "closed" && <AssistantCloses />}
    </section>
  );
}

function HandledRow(props: { item: Row }) {
  const { t } = useWords();
  const act = useAct();
  const { isWork, isPersonal, alwaysLikeThis } = useSetAside();
  const [busy, setBusy] = useState(false);
  const { item } = props;
  const titleId = `handled-row-${item.id}`;
  const mail = { id: item.id, title: item.title, version: item.version, tab: item.tab };
  const choose = async (treat: typeof isWork) => {
    setBusy(true);
    await treat(mail);
    setBusy(false);
  };
  // Take a closer look on a change a rule closed: handed in after all, one click, Undo closes it again.
  const lookCloser = async () => {
    setBusy(true);
    await act(
      () => api.closerLook(item.id, item.version),
      () => ({ message: t("handled.look_toast", { title: item.title }), undo: () => api.closerLookUndo(item.id) }),
    );
    setBusy(false);
  };
  const seen = async () => {
    await act(
      () => api.closeSeen(`request:${item.id}`),
      () => ({ message: t("sources.silent.toast", { title: item.title }) }),
    );
  };
  const open = item.link
    ? { run: () => void window.open(item.link ?? "", "_blank", "noopener,noreferrer") }
    : item.saved
      ? {
          run: () => {
            window.location.hash = toHash(recordView("source", item.saved ?? ""));
          },
        }
      : null;
  const closed = item.tab === "closed";
  // A file a rule closed: which files are one document, where a wrong grouping is noticed (design 6.2).
  const versions = useVersionActs(
    closed && item.item === "file" ? item.saved : null,
    item.older_version && item.request ? { request: item.request, readVersion: item.version } : undefined,
  );
  const menu: MenuAction[] = closed
    ? [{ id: "seen", label: t("sources.silent.seen"), run: () => void seen() }]
    : [{ id: "personal", label: t("setaside.personal"), run: () => void choose(isPersonal) }];
  if (!closed && item.address) {
    menu.push({
      id: "always",
      label: t("setaside.always_like_this"),
      run: () => void alwaysLikeThis({ id: item.id, title: item.title, section: item.section, address: item.address }),
    });
  }
  menu.push(...versions.entries);
  if (open) menu.push({ id: "open", label: t(closed ? "handled.open_item" : "setaside.open"), run: open.run });
  const facts = [item.sender, item.received ? when(item.received) : "", item.source, item.change ? t(`sources.closed.change.${item.change}`) : ""].filter(Boolean);
  const why = closed
    ? t("handled.closed_why", { rule: item.rule ?? "", reason: item.reason ?? "" })
    : item.reason
      ? t("sources.closed.why", { reason: item.reason })
      : t("handled.read_why");
  // Set-aside mail is handed in as work; a mail read with nothing to do, or a change a rule closed, gets a closer look.
  const look = item.tab !== "set_aside";
  return (
    <li className="line" data-row tabIndex={-1} aria-labelledby={titleId}>
      <div className="row">
        <span className="kind k-done" data-item={item.item}>
          {t(`handled.item.${item.item}`)}
        </span>
        <div className={`text ${styles.text}`}>
          <strong id={titleId}>{item.title}</strong>
          <span className="sub">{facts.join(" · ")}</span>
          <span className="sub">{why}</span>
        </div>
        <div className="acts">
          <button
            type="button"
            className="btn primary"
            data-key="primary"
            disabled={busy}
            aria-label={t(look ? "handled.look_named" : "setaside.work_named", { title: item.title })}
            onClick={() => void (closed ? lookCloser() : choose(isWork))}
          >
            {t(look ? "handled.look" : "setaside.work")}
          </button>
          <RowMenu label={item.title} actions={menu} />
        </div>
      </div>
      {versions.form}
    </li>
  );
}
