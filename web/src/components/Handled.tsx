// Handled for you (design 7.20): what the app dealt with so the person didn't have to, on two tabs by whether the
// assistant read it: what was sorted away before it read it (mail set aside and changes a rule closed, of any kind of
// item) and mail it read with nothing to do. Rows are grouped by kind, by the reason they were handled or by sender,
// collapsed, with a count and a Show more past a page of rows; a kind-of-item filter and a search narrow them. Every row says what kind of item it is and why, and offers Take a
// closer look (or, for set-aside mail, Bring it in) in one click with Undo, each recording a correction. Bring it in asks
// which side the mail belongs to, Personal or a business, only when there is more than one; with one it goes there at once.
// Leaving an item where it is is the confirmation, so there is no choice that keeps it.
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { useReviewTime } from "../lib/review-time";
import { whenText as when } from "../lib/dates";
import { useSetAside } from "../lib/set-aside";
import { useSideFilter, useSides } from "../lib/sides";
import { useLookedAt } from "../lib/waiting";
import { recordView, toHash } from "../lib/views";
import { useHandedToast, useWaitsForStart } from "../lib/handed-toast";
import { useWords } from "../lib/wording";
import { SearchField } from "../ui/SearchField";
import { Icon } from "../ui/Icon";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Skeleton } from "../ui/Skeleton";
import styles from "./Handled.module.css";
import { AssistantCloses } from "./HandledClosed";
import { SideFilter } from "./SideFilter";
import { RowMenu, type MenuAction } from "./RowMenu";
import { useVersionActs } from "./SameDocument";
import { useAct } from "../lib/act";
import { useSelection } from "../lib/act-batch";
import { MailSelectionBar } from "./MailSelection";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { TabStrip } from "../ui/TabStrip";
import { Pill } from "../ui/Pill";
import { Row, RowItem } from "../ui/Row";
import { RowList } from "../ui/RowList";
import { Item } from "../ui/ItemList";
type Tab = S["HandledView"]["tab"];
type Group = S["HandledView"]["group"];
type Row = S["HandledRow"];
type Item = S["HandledRow"]["item"];
const TABS: Tab[] = ["set_aside", "read"];
const GROUPS: Group[] = ["kind", "reason", "sender"];
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
  // Saved mail ticked in either list, to archive, move, label or mark as read together.
  const picked = useSelection();
  const heading = useRef<HTMLHeadingElement>(null);
  // What is new here counts from when the person last left this screen.
  useLookedAt("handled");
  useReviewTime("handled");

  // A screen opens with the cursor on its heading, never in a field.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(typed.trim()), TYPING_MS);
    return () => window.clearTimeout(timer);
  }, [typed]);

  // With a side beside Personal the lists can be narrowed to one side: what came from a source serving it, or no one side.
  const side = useSideFilter();
  const sideId = side.choice === "all" ? null : side.choice;
  const list = useQuery({
    queryKey: ["handled", tab, group, query, item, sideId],
    queryFn: () => api.handled(tab, group, query, item, sideId),
    placeholderData: keepPreviousData,
  });
  const shownGroup: Group = group ?? list.data?.group ?? "kind";
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
      <PageHeader
        id={`${ids}-title`}
        headingRef={heading}
        focusable
        title={t("handled.title")}
        filters={
          <>
            <SegmentedControl
              label={t("handled.tabs")}
              options={TABS.map((name) => ({ value: name, label: t(`handled.tab.${name}`, { n: counts ? counts[name] : "…" }) }))}
              value={tab}
              onChange={(name) => {
                setTab(name);
                setItem(null);
                picked.clear();
              }}
            />
            <SideFilter waiting="handled" />
          </>
        }
      />
      <p className="hint">{t(`handled.explain.${tab}`)}</p>
      {list.data && <p className="hint">{tn("handled.kept", list.data.kept_days)}</p>}
      <div className={styles.bar}>
        <SearchField id={`${ids}-search`} label={t("handled.search")} className={styles.search} value={typed} onChange={setTyped} />
        <SegmentedControl label={t("handled.group")} options={GROUPS.map((name) => ({ value: name, label: t(`handled.group.${name}`) }))} value={shownGroup} onChange={setGroup} />
      </div>
      {kinds.length > 1 || item ? (
        <TabStrip
          label={t("handled.filter")}
          value={item ?? ""}
          onChange={(value) => setItem(value === "" ? null : value)}
          options={[{ value: "", label: t("handled.filter.all") }, ...kinds.map((k) => ({ value: k.item, label: t("handled.filter.kind", { kind: t(`handled.item.${k.item}`), n: k.count }) }))]}
        />
      ) : null}
      {picked.selected.size > 0 && <MailSelectionBar records={[...picked.selected]} onClear={picked.clear} />}
      {list.isPending ? (
        <Skeleton />
      ) : list.isError ? (
        <EmptyState icon="alert" text={t("handled.load_failed")} action={{ label: t("action.try_again"), onClick: () => void list.refetch() }} />
      ) : list.data.groups.length === 0 ? (
        <EmptyState role="status" text={query ? t("handled.none_match") : side.choice !== "all" ? t("sides.empty.handled", { side: side.named }) : t(`handled.empty.${tab}`)} />
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
                : g.key.startsWith("item:")
                  ? t(`handled.item_group.${g.key.slice(5) as Item}`)
                  : t(shownGroup === "sender" ? "handled.sender_unknown" : "handled.reason_unknown"));
            return (
              <section key={key} className={styles.group} data-group={g.key}>
                <h2>
                  <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={open ? `${ids}-group-${index}` : undefined} onClick={() => toggle(key)}>
                    <span className={styles.head}>
                      <span className={styles.chevron} data-open={open ? "" : undefined}>
                        <Icon name="chevron" size={16} />
                      </span>
                      <strong>{t("handled.group_name", { name, n: g.count })}</strong>
                    </span>
                  </button>
                </h2>
                {open && (
                  <RowList id={`${ids}-group-${index}`}>
                    {g.items.slice(0, limit).map((row) => (
                      <HandledRow key={row.id} item={row} picked={row.saved && row.item === "mail" && row.tab !== "closed" ? { on: picked.selected.has(row.saved), toggle: () => picked.toggle(row.saved ?? "") } : undefined} />
                    ))}
                    {g.items.length > limit && (
                      <RowItem>
                        <Button variant="quiet" onClick={() => setMore((now) => ({ ...now, [key]: (now[key] ?? 0) + pageRows }))}>
                          {t("handled.show_more", { n: g.items.length - limit })}
                        </Button>
                      </RowItem>
                    )}
                  </RowList>
                )}
              </section>
            );
          })}
        </div>
      )}
      {tab === "read" && <AssistantCloses />}
    </section>
  );
}

function HandledRow(props: { item: Row; picked?: { on: boolean; toggle: () => void } }) {
  const { t } = useWords();
  const waitsForStart = useWaitsForStart();
  const toast = useHandedToast();
  const act = useAct();
  const { isWork, isPersonal, isSide, alwaysLikeThis } = useSetAside();
  const { justMe, personal, sides } = useSides();
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const bringButton = useRef<HTMLButtonElement>(null);
  const firstPlace = useRef<HTMLButtonElement>(null);
  const { item } = props;
  const titleId = `handled-row-${item.id}`;
  useEffect(() => {
    if (choosing) firstPlace.current?.focus();
  }, [choosing]);
  const mail = { id: item.id, title: item.title, version: item.version, tab: item.tab };
  const choose = async (treat: typeof isWork) => {
    setBusy(true);
    await treat(mail);
    setBusy(false);
  };
  // Take a closer look on a change a rule closed: handed in after all, one click, Undo closes it again.
  const lookCloser = async () => {
    setBusy(true);
    let waits = false;
    await act(
      async () => {
        const made = await api.closerLook(item.id, item.version);
        waits = await waitsForStart();
        return made;
      },
      () => ({ ...toast(waits, t("handled.look_toast", { title: item.title }), t("toast.handed_in_waiting")), undo: () => api.closerLookUndo(item.id) }),
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
  // The places a message can be brought in as belonging to: with a side beside Personal, Personal and each side by name.
  // With only Personal, or before the sides are known, there is nothing to choose.
  const named = sides.length > 0 ? sides.map((side) => ({ id: side.project, name: side.name })) : [];
  const personalSide = personal ? { id: personal, name: t("sides.filter.personal") } : null;
  const places = sides.length > 0 ? [...(personalSide ? [personalSide] : []), ...named] : [];
  const aside = !closed && item.tab === "set_aside";
  // On the read list the menu offers the other sides by name; on the set-aside list Bring it in asks.
  const asSides = [...(personalSide ? [personalSide] : []), ...named];
  const menu: MenuAction[] = closed
    ? [{ id: "seen", label: t("sources.silent.seen"), run: () => void seen() }]
    : aside || justMe
      ? []
      : named.length > 0
        ? asSides.map((side) => ({
            id: `side-${side.id}`,
            label: t("setaside.treat_as", { side: side.name }),
            run: () => void choose(isSide(side)),
          }))
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
      ? t("handled.set_aside_why", { reason: item.reason.replace(/[.\s]+$/, "") })
      : t("handled.read_why");
  // Bring it in on set-aside mail: handed in as the side it belongs to, asked only with more than one side. A mail read with
  // nothing to do, and a change a rule closed, get a closer look.
  const bring = () => {
    if (places.length > 1) setChoosing(true);
    else void choose(places.length === 1 ? isSide(places[0]) : isWork);
  };
  const stopChoosing = () => {
    setChoosing(false);
    bringButton.current?.focus();
  };
  return (
    <Row
      aria-labelledby={titleId}
      lead={
        props.picked && (
          <input type="checkbox" checked={props.picked.on} aria-label={t("batch.select_named", { title: item.title })} onChange={props.picked.toggle} />
        )
      }
      pill={<Pill>{t(`handled.item.${item.item}`)}</Pill>}
      title={item.title}
      titleId={titleId}
      metaLines={[facts.join(" · "), why]}
      primary={
        <Button
          variant="primary"
          data-key="primary"
          ref={bringButton}
          disabled={busy}
          aria-expanded={aside && places.length > 1 ? choosing : undefined}
          aria-label={aside ? t("setaside.bring_in_named", { title: item.title }) : t("handled.look_named", { title: item.title })}
          onClick={() => void (closed ? lookCloser() : aside ? bring() : choose(isWork))}
        >
          {aside ? t("setaside.bring_in") : t("handled.look")}
        </Button>
      }
      menu={<RowMenu label={item.title} actions={menu} />}
    >
      {choosing && (
        <div
          className={styles.bring}
          role="group"
          aria-label={t("setaside.bring_in_as")}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              stopChoosing();
            }
          }}
        >
          <span>{t("setaside.bring_in_as")}</span>
          {places.map((side, index) => (
            <Button
              key={side.id}
              ref={index === 0 ? firstPlace : undefined}
              disabled={busy}
              aria-label={t("setaside.bring_in_side_named", { side: side.name, title: item.title })}
              onClick={() => {
                setChoosing(false);
                void choose(isSide(side));
              }}
            >
              {side.name}
            </Button>
          ))}
          <Button variant="quiet" onClick={stopChoosing}>
            {t("action.cancel")}
          </Button>
        </div>
      )}
      {versions.form}
    </Row>
  );
}
