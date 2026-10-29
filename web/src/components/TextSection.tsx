// One long text field on a record's page: its current text, who wrote what (three separate counts), its versions with
// Review on each one waiting, Edit in place, and its working copies.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { day } from "../lib/dates";
import { readable, useFieldLabel } from "../lib/records";
import { useWords } from "../lib/wording";
import { restoreFocus } from "./ModalPanel";
import { SafeText } from "./SafeText";
import { WorkingCopies } from "./WorkingCopies";
import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { FormField } from "../ui/FormField";
import { Actions } from "../ui/Actions";
import { RowList } from "../ui/RowList";
import { Row } from "../ui/Row";
type Review = (version: string, returnTo?: () => HTMLElement | null | undefined) => void;

/** Words by who wrote them. The three kinds are never folded together. */
export function authorshipCounts(spans: S["AuthorSpan"][]) {
  const counts = { person: 0, assistant: 0, assistant_edit: 0 };
  for (const span of spans) {
    if (span.kind === "person" || span.kind === "assistant" || span.kind === "assistant_edit") counts[span.kind] += span.words ?? 0;
  }
  return counts;
}

export function TextSection(props: { kind: string; id: string; field: string; help?: string; onReview: Review }) {
  const { t, tn } = useWords();
  const labelOf = useFieldLabel();
  const act = useAct();
  const { kind, id, field } = props;
  const base = useId();
  const text = useQuery({ queryKey: ["text", kind, id, field], queryFn: () => api.text(kind, id, field) });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const titleId = `${base}-title`;
  const data = text.data;

  useEffect(() => {
    if (editing) area.current?.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(data?.text ?? "");
    setEditing(true);
  };
  const stopEdit = () => {
    setEditing(false);
    restoreFocus(() => editButton.current);
  };
  const save = async () => {
    setSaving(true);
    const result = await act(
      () => api.editText({ kind, id, field, text: draft }),
      (done) => ({
        message: t("text.saved"),
        undo: async () => {
          const report = await api.undo(done.changeset);
          if (!report.restored.length) throw new Error("not undone");
        },
      }),
    );
    setSaving(false);
    if (result) stopEdit();
  };

  // A text nobody has written, with no versions waiting, is one line with a way to write it: no help text or empty box over it.
  const blank = !!data && !editing && !data.text.trim() && data.versions.length === 0;
  const counts = data ? authorshipCounts(data.authorship) : null;
  const pending = (data?.versions ?? []).filter((v) => v.status === "pending");

  return (
    <section className="text-section" aria-labelledby={titleId}>
      <div className="heading">
        <h2 id={titleId}>{labelOf(field)}</h2>
        {data && !editing && (
          <Button ref={editButton} variant={blank ? "quiet" : "secondary"} onClick={startEdit}>
            {t(blank ? "text.write" : "text.edit")}
          </Button>
        )}
      </div>
      {props.help && !blank && <p className="hint">{props.help}</p>}
      {text.isPending && <Skeleton />}
      {text.isError && (
        <EmptyState icon="alert" text={t("text.load_failed")} action={{ label: t("action.try_again"), onClick: () => void text.refetch() }} />
      )}
      {data &&
        (editing ? (
          <FormField id={`${base}-edit`} label={t("text.edit_label", { field: labelOf(field) })}>
            <textarea
              id={`${base}-edit`}
              ref={area}
              className="msg"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  stopEdit();
                }
              }}
            />
            <Actions align="end">
              <Button variant="quiet" onClick={stopEdit}>
                {t("action.cancel")}
              </Button>
              <Button variant="primary" disabled={saving} onClick={() => void save()}>
                {t(saving ? "text.saving" : "text.save")}
              </Button>
            </Actions>
          </FormField>
        ) : data.text.trim() ? (
          <div className="text-body">
            <SafeText text={data.text} />
          </div>
        ) : blank ? null : (
          <EmptyState text={t("text.empty")} />
        ))}
      {counts && data && data.authorship.length > 0 && (
        <div>
          <span className="what" id={`${base}-who`}>
            {t("text.authorship")}
          </span>
          <ul className="plain-list" aria-labelledby={`${base}-who`}>
            <li>{tn("text.by_person", counts.person)}</li>
            <li>{tn("text.by_assistant", counts.assistant)}</li>
            <li>{tn("text.by_assistant_edit", counts.assistant_edit)}</li>
          </ul>
        </div>
      )}
      {data && data.versions.length > 0 && (
        <section aria-labelledby={`${base}-versions`}>
          <h4 id={`${base}-versions`} className="what">
            {t("text.versions")}
            {pending.length > 0 ? ` · ${tn("text.waiting", pending.length)}` : ""}
          </h4>
          <RowList>
            {data.versions.map((v) => (
              <VersionRow key={v.id} version={v} current={data.current} onReview={props.onReview} />
            ))}
          </RowList>
        </section>
      )}
      <WorkingCopies kind={kind} id={id} field={field} onReview={props.onReview} />
    </section>
  );
}

function VersionRow(props: { version: S["TextVersionView"]; current: number | null; onReview: Review }) {
  const { t, tn, has } = useWords();
  const { version } = props;
  const button = useRef<HTMLButtonElement>(null);
  const status = has(`text.status.${version.status}`) ? t(`text.status.${version.status}`) : readable(version.status);
  const source = has(`text.source.${version.source}`) ? t(`text.source.${version.source}`) : readable(version.source);
  const facts = [
    status,
    source,
    tn("text.words", version.words),
    ...(version.created_at ? [day(version.created_at)] : []),
    ...(version.number === props.current ? [t("text.shown_now")] : []),
  ];
  return (
    <Row
      title={t("text.version_n", { n: version.number })}
      metaLines={[facts.join(" · "), version.note ? <SafeText text={version.note} /> : null]}
      primary={
        version.status === "pending" ? (
          <Button
            variant="primary"
            ref={button}
            data-key="primary"
            aria-label={t("text.review_named", { n: version.number })}
            onClick={() => props.onReview(version.id, () => button.current)}
          >
            {t("text.review")}
          </Button>
        ) : undefined
      }
    />
  );
}
