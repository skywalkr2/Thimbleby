// The search field (design 7.12), in the header and in the phone's bar. What is typed is looked up in the records as it is
// typed (people, projects, to-dos, files and what was learned), which costs nothing; the last row asks the assistant about
// the same words, and nothing is sent until the person chooses it. The results drop down from the field.
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { api } from "../lib/api";
import { plain } from "../lib/read";
import { useStableJustMe } from "../lib/sides";
import { useWords } from "../lib/wording";
import { Icon, type IconName } from "../ui/Icon";
import { GroupLabel } from "../ui/GroupLabel";
import { RowList } from "../ui/RowList";
import { SearchField } from "../ui/SearchField";
import styles from "./SearchBox.module.css";

/** Marks the field, so the search key and the bar can find the one that is showing. */
export const SEARCH_FIELD = "data-search-field";

/** The glyph of a kind of result, so a row says what it is before it is read. */
const KIND_ICON: Record<string, IconName> = { person: "users", project: "grid", action: "check", file: "folder", lesson: "book", glossary_entry: "book", routing_entry: "chat", style_note: "book" };

export function SearchBox(props: {
  onOpenRecord: (kind: string, id: string) => void;
  onAsk: (question: string) => void;
  /** Where the results open: below the field (the header) or above it (the bar at the bottom). */
  opens?: "down" | "up";
  autoFocus?: boolean;
  className?: string;
}) {
  const { t, tn } = useWords();
  const justMe = useStableJustMe();
  const base = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const words = text.trim();
  const found = useQuery({
    queryKey: ["search", words],
    queryFn: () => api.search(words),
    enabled: words !== "",
    placeholderData: (previous) => previous,
  });
  const rows = words ? (found.data?.results ?? []) : [];
  // For a person with only their own life, a project is an area of their life, and their Personal page is named for what it is.
  const groupLabel = (kind: string) => (justMe && kind === "project" ? t("search.group.project.just_me") : t(`search.group.${kind}`));
  // The results are grouped by what they are, in the order the first of each kind came; the heading says the kind, so a row does not.
  const groups: Array<{ kind: string; rows: typeof rows }> = [];
  for (const r of rows) {
    const group = groups.find((g) => g.kind === r.kind);
    if (group) group.rows.push(r);
    else groups.push({ kind: r.kind, rows: [r] });
  }
  const done = () => {
    setOpen(false);
    setText("");
  };
  const pick = (kind: string, id: string) => {
    done();
    props.onOpenRecord(kind, id);
  };
  const ask = () => {
    done();
    props.onAsk(words);
  };
  // Arrow keys move between the rows from the field and from row to row; Enter in the field opens the first row, or asks when there is none.
  const move = (from: Element | null, step: 1 | -1) => {
    const all = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const at = from ? all.indexOf(from as HTMLButtonElement) : -1;
    all[Math.min(all.length - 1, Math.max(0, at + step))]?.focus();
  };
  const field = root.current?.querySelector<HTMLInputElement>("input");
  return (
    <div
      ref={root}
      className={[styles.box, props.className ?? ""].filter(Boolean).join(" ")}
      data-opens={props.opens ?? "down"}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          move(e.target instanceof HTMLButtonElement ? e.target : null, e.key === "ArrowDown" ? 1 : -1);
        } else if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          field?.focus();
        }
      }}
    >
      <SearchField
        id={`${base}-q`}
        label={t("search.label")}
        placeholder={justMe ? t("search.placeholder.just_me") : t("search.placeholder")}
        value={text}
        onChange={(v) => {
          setText(v);
          setOpen(true);
        }}
        autoFocus={props.autoFocus}
        {...{ [SEARCH_FIELD]: "" }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.nativeEvent.isComposing || !words) return;
          e.preventDefault();
          const first = rows[0];
          if (first) pick(first.kind, first.id);
          else ask();
        }}
      />
      {open && words && <div className={styles.scrim} aria-hidden="true" />}
      {open && (
        <div className={styles.drop} ref={list}>
          {words && found.isError && <p className="hint">{t("search.load_failed")}</p>}
          {words && !found.isError && !found.isFetching && rows.length === 0 && <p className={styles.none}>{t("search.none", { query: words })}</p>}
          {words && rows.length > 0 && (
            <p className={styles.count} data-search-count="">
              {tn("search.count", rows.length)}
            </p>
          )}
          {/* One list: the results, and the question to ask last. The question stays at the foot of the panel while the results scroll, so
              the one paid choice is always in reach. */}
          <RowList aria-label={t("search.results")} detail className={styles.results}>
            {groups.flatMap((g) => [
              <li key={`head-${g.kind}`} className={styles.groupItem}>
                <GroupLabel as="p" count={g.rows.length}>
                  {groupLabel(g.kind)}
                </GroupLabel>
              </li>,
              ...g.rows.map((r) => (
                <li key={`${r.kind}/${r.id}`}>
                  <button type="button" className={styles.row} onClick={() => pick(r.kind, r.id)}>
                    <span className={styles.lead} aria-hidden="true">
                      <Icon name={KIND_ICON[r.kind] ?? "search"} size={16} />
                    </span>
                    <span className={styles.main}>{plain(r.title)}</span>
                    {r.detail && <span className={styles.detail}>{plain(r.detail)}</span>}
                  </button>
                </li>
              )),
            ])}
            <li className={styles.askItem}>
              <button type="button" className={styles.row} aria-describedby={words ? `${base}-hint` : undefined} onClick={ask}>
                <span className={styles.lead} aria-hidden="true">
                  <Icon name="chat" size={16} />
                </span>
                <span className={styles.main}>{words ? t("search.ask", { query: words }) : t("search.ask_empty")}</span>
              </button>
              {words && (
                <span id={`${base}-hint`} className={styles.note}>
                  {t("search.ask.hint")}
                </span>
              )}
            </li>
          </RowList>
        </div>
      )}
    </div>
  );
}
