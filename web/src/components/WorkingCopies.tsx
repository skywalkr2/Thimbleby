// Working copies of a long text (design 5.3): hand the text out as a file for another program, bring the edited file
// back to review, or set a copy aside. One row per copy; a copy that is out has Bring back as its one primary action.
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { day } from "../lib/dates";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { RowMenu } from "./RowMenu";
import { Icon } from "../ui/Icon";
import { Pill } from "../ui/Pill";
import { Button } from "../ui/Button";
import { Row } from "../ui/Row";
export function WorkingCopies(props: {
  kind: string;
  id: string;
  field: string;
  onReview: (version: string, returnTo?: () => HTMLElement | null | undefined) => void;
}) {
  const { t } = useWords();
  const act = useAct();
  const { kind, id, field } = props;
  const formats = useQuery({ queryKey: ["working-copy-formats", kind, field], queryFn: () => api.workingCopyFormats(kind, field) });
  const copies = useQuery({ queryKey: ["working-copies", kind, id], queryFn: () => api.workingCopies(kind, id) });
  const [handed, setHanded] = useState<S["WorkingCopyView"] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const shown = (copies.data ?? []).filter((c) => c.field === field && c.status !== "dropped");

  if (!formats.data?.length && shown.length === 0) return null;

  const handOut = async (format: S["WorkingCopyFormatView"]) => {
    setBusy(format.name);
    const copy = await act(
      () => api.handOut({ format: format.name, kind, id, field }),
      (made) => ({ message: t("copies.handed_out", { what: made.label }) }),
    );
    setBusy(null);
    if (copy) setHanded(copy);
  };

  const titleId = `copies-${field}`.replace(/[^A-Za-z0-9_-]/g, "-");
  return (
    <section aria-labelledby={titleId} className="copies">
      <h4 id={titleId} className="what">
        {t("copies.title")}
      </h4>
      {(formats.data ?? []).length > 0 && (
        <div className="acts wrap" role="group" aria-label={t("copies.hand_out_group")}>
          {(formats.data ?? []).map((format) => (
            <Button key={format.name} disabled={busy !== null} onClick={() => void handOut(format)}>
              {t("copies.hand_out", { label: format.label })}
            </Button>
          ))}
        </div>
      )}
      {handed && (
        <p role="status" className="hint">
          {t("copies.ready", { label: handed.label })}{" "}
          <a href={api.fileContent(handed.file)} download>
            {t("copies.download")}
          </a>
        </p>
      )}
      {shown.length > 0 && (
        <ul className="queue">
          {shown.map((copy) => (
            <CopyRow key={copy.id} copy={copy} onReview={props.onReview} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CopyRow(props: { copy: S["WorkingCopyView"]; onReview: (version: string, returnTo?: () => HTMLElement | null | undefined) => void }) {
  const { t, has } = useWords();
  const act = useAct();
  const { push } = useToasts();
  const { copy } = props;
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const out = copy.status === "out";
  const status = has(`copies.status.${copy.status}`) ? t(`copies.status.${copy.status}`) : copy.status;

  const bringBack = async (file: File) => {
    const result = await act(() => api.returnCopy(copy.id, file));
    if (!result) return;
    if (result.unchanged || !result.version) {
      // The file came back as it left, so there is nothing to look at.
      push({ message: t("copies.unchanged", { what: copy.label }) });
      return;
    }
    props.onReview(result.version, () => button.current);
  };
  const setAside = () =>
    void act(
      () => api.dropCopy(copy.id),
      () => ({ message: t("copies.set_aside", { what: copy.label }) }),
    );

  return (
    <Row
      title={
        <>
          {copy.label}
          {copy.stale && (
            <Pill tone="warn" className="pill-gap">
              <Icon name="alert" size={14} /> {t("copies.stale")}
            </Pill>
          )}
        </>
      }
      meta={
        <>
          {[status, t("copies.handed_on", { when: day(copy.handed_at) })].join(" · ")}
          {" · "}
          <a href={api.fileContent(copy.file)} download>
            {t("copies.download")}
          </a>
        </>
      }
      primary={
        out ? (
          <>
            <Button
              variant="primary"
              ref={button}
              data-key="primary"
              aria-label={t("copies.bring_back_named", { what: copy.label })}
              onClick={() => input.current?.click()}
            >
              {t("copies.bring_back")}
            </Button>
            <input
              ref={input}
              type="file"
              hidden
              tabIndex={-1}
              aria-label={t("copies.choose_file", { what: copy.label })}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void bringBack(file);
              }}
            />
          </>
        ) : undefined
      }
      menu={out ? <RowMenu label={copy.label} actions={[{ id: "drop", label: t("copies.set_aside_action"), run: setAside }]} /> : undefined}
    />
  );
}
