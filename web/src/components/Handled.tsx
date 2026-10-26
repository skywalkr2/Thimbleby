// Handled for you (design 7.20): the mail the app dealt with so the person didn't have to, on two lists: mail set aside
// before the assistant read it, and mail the assistant read and found nothing to do in. Rows are grouped by kind or by
// sender, collapsed, with a count; a search narrows them. Every row offers the same four choices, each recording a
// correction: Treat as work (the one button), Treat as personal, Always set aside mail like this, and Open the message.
// Leaving a mail where it is is the confirmation, so there is no choice that keeps it.
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
import { RowMenu, type MenuAction } from "./RowMenu";

type Tab = S["HandledView"]["tab"];
type Group = S["HandledView"]["group"];
type Row = S["HandledRow"];
const TABS: Tab[] = ["set_aside", "read"];
const GROUPS: Group[] = ["kind", "sender"];
/** How long typing waits before the list is asked for again. */
const TYPING_MS = 250;

export function Handled() {
  const { t } = useWords();
  const ids = useId();
  const [tab, setTab] = useState<Tab>("set_aside");
  const [group, setGroup] = useState<Group | null>(null);
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

  const list = useQuery({ queryKey: ["handled", tab, group, query], queryFn: () => api.handled(tab, group, query), placeholderData: keepPreviousData });
  const shownGroup: Group = group ?? list.data?.group ?? "kind";
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
            <button key={name} type="button" aria-pressed={tab === name} onClick={() => setTab(name)}>
              {t(`handled.tab.${name}`, { n: counts ? counts[name] : "…" })}
            </button>
          ))}
        </div>
      </div>
      <p className="hint">{t(`handled.explain.${tab}`)}</p>
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
          {list.data.groups.map((g) => {
            const key = `${tab}|${shownGroup}|${g.key}`;
            // A search shows the mail it found, so its groups are open.
            const open = !!query || opened.has(key);
            const name = g.label ?? (shownGroup === "kind" ? t(`handled.kind.${g.key as Row["kind"]}`) : t("handled.sender_unknown"));
            return (
              <section key={key} className={styles.group} data-group={g.key}>
                <h2>
                  <button type="button" className="expander text" aria-expanded={open} aria-controls={`${ids}-${key}`} onClick={() => toggle(key)}>
                    <span className={styles.head}>
                      <span className={styles.chevron} data-open={open ? "" : undefined}>
                        <Icon name="chevron" size={16} />
                      </span>
                      <strong>{t("handled.group_name", { name, n: g.count })}</strong>
                    </span>
                  </button>
                </h2>
                {open && (
                  <ul className="queue" id={`${ids}-${key}`}>
                    {g.items.map((item) => (
                      <HandledRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function HandledRow(props: { item: Row }) {
  const { t } = useWords();
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
  const open = item.link
    ? { run: () => void window.open(item.link ?? "", "_blank", "noopener,noreferrer") }
    : item.saved
      ? {
          run: () => {
            window.location.hash = toHash(recordView("source", item.saved ?? ""));
          },
        }
      : null;
  const menu: MenuAction[] = [
    { id: "personal", label: t("setaside.personal"), run: () => void choose(isPersonal) },
    ...(item.address
      ? [
          {
            id: "always",
            label: t("setaside.always_like_this"),
            run: () => void alwaysLikeThis({ id: item.id, title: item.title, section: item.section, address: item.address }),
          },
        ]
      : []),
    ...(open ? [{ id: "open", label: t("setaside.open"), run: open.run }] : []),
  ];
  const facts = [item.sender, item.received ? when(item.received) : "", item.source].filter(Boolean);
  return (
    <li className="line" data-row tabIndex={-1} aria-labelledby={titleId}>
      <div className="row">
        <div className={`text ${styles.text}`}>
          <strong id={titleId}>{item.title}</strong>
          <span className="sub">{facts.join(" · ")}</span>
          <span className="sub">{item.reason ? t("sources.closed.why", { reason: item.reason }) : t("handled.read_why")}</span>
        </div>
        <div className="acts">
          <button
            type="button"
            className="btn primary"
            data-key="primary"
            disabled={busy}
            aria-label={t("setaside.work_named", { title: item.title })}
            onClick={() => void choose(isWork)}
          >
            {t("setaside.work")}
          </button>
          <RowMenu label={item.title} actions={menu} />
        </div>
      </div>
    </li>
  );
}
