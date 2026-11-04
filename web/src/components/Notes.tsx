// Notes (design 5.3, 7.15): every note that was filed, newest first, one row each: its first line as the title, which opens the
// note's own page, and under it the day it was filed and where (a side, or a project). With a side beside Personal the list can be
// narrowed to one side; a note on no side shows under every choice. A note from outside content is marked as such, as elsewhere.
import { useQuery } from "@tanstack/react-query";
import { api, type S } from "../lib/api";
import { day } from "../lib/dates";
import { usePlaceText } from "../lib/place";
import { useReadable } from "../lib/readable";
import { onSide, useSideFilter, useSideOf } from "../lib/sides";
import { recordView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { Pill } from "../ui/Pill";
import { Row } from "../ui/Row";
import { RowList } from "../ui/RowList";
import { FilteredEmpty } from "../ui/FilteredEmpty";
import { ListState } from "../ui/ListState";
import { SideFilter } from "./SideFilter";

/** The first line of a note that reads as words: a piece of a data dump or a line left with nothing in it is passed over. */
const firstLine = (text: string, readable: (text: string) => string) =>
  text.split("\n").map((line) => readable(line.trim())).find(Boolean) ?? "";

/** `onHandIn` opens the box a note is handed in through: an empty page offers it, since it is how a note is made. */
export function Notes(props: { onHandIn?: () => void }) {
  const { t, tn } = useWords();
  const notes = useQuery({ queryKey: ["notes"], queryFn: api.notes });
  const place = usePlaceText();
  const side = useSideFilter();
  const sideOf = useSideOf();
  const everything = notes.data ?? [];
  const shown = everything.filter((n) => onSide(sideOf(n.project), side.choice));
  return (
    <section className="panel-section" aria-labelledby="notes-title">
      <PageHeader id="notes-title" title={t("notes.title")} subtitle={everything.length > 0 ? t("notes.sub") : undefined} filters={<SideFilter holds={everything.length} />} />
      <ListState query={notes} failed={t("notes.load_failed")}>
        {() =>
          everything.length === 0 ? (
            <EmptyState text={t("notes.empty")} action={props.onHandIn ? { label: t("notes.write"), onClick: props.onHandIn, primary: true } : null} />
          ) : shown.length === 0 ? (
            <FilteredEmpty text={t("sides.empty.notes", { side: side.named })} onClear={() => side.set("all")} />
          ) : (
            <>
              <RowList aria-label={t("notes.title")}>
                {shown.map((n) => (
                  <NoteRow key={n.id} note={n} where={place({ name: n.project_name, side: n.side_name })} />
                ))}
              </RowList>
              <p className="hint">{tn("notes.count", shown.length)}</p>
            </>
          )
        }
      </ListState>
    </section>
  );
}

function NoteRow(props: { note: S["NoteView"]; where: string }) {
  const { t } = useWords();
  const readable = useReadable();
  const { note } = props;
  return (
    <Row
      pill={note.trust === "untrusted" ? <Pill tone="neutral">{t("notes.from_outside")}</Pill> : undefined}
      title={<a href={viewHref(recordView("note", note.id))}>{firstLine(note.text, readable) || t("notes.untitled")}</a>}
      meta={[note.created_at ? t("notes.filed_on", { when: day(note.created_at) }) : "", props.where].filter(Boolean).join(" · ") || undefined}
    />
  );
}
