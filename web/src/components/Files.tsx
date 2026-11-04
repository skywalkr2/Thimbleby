// Files (design 5.3, 7.15): what has been added, one row each, with Open as the row's one primary action, and a details pane
// beside the list for the file chosen: a preview, where it came from and what refers to it. Plugins' actions for a file are
// in its menu; actions for the whole workspace are buttons above the list. With a side beside Personal the list can be
// narrowed to one side; a file in no project, or in one on no side, shows under every choice.
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { day } from "../lib/dates";
import { useSize } from "../lib/files";
import { useListChoice, type ListChoice } from "../lib/list-choice";
import { useMediaQuery } from "../lib/media";
import { usePluginActions } from "../lib/plugin-actions";
import { onSide, useSideFilter, useSideOf, useSides } from "../lib/sides";
import { recordView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { ListDetail } from "../ui/ListDetail";
import { FilteredEmpty } from "../ui/FilteredEmpty";
import { ListState } from "../ui/ListState";
import { Skeleton } from "../ui/Skeleton";
import { useActionReview } from "./ActionReview";
import { AddFile } from "./AddFile";
import { useFileEdits } from "./FileEdit";
import { restoreFocus } from "./ModalPanel";
import { RowMenu, type MenuAction } from "./RowMenu";
import { SideFilter } from "./SideFilter";
import { FileDrop } from "../ui/FileDrop";
import { PageHeader } from "../ui/PageHeader";
import { Pill } from "../ui/Pill";
import { Button, ButtonLink } from "../ui/Button";
import styles from "./Files.module.css";
import { Actions } from "../ui/Actions";
import { RowList } from "../ui/RowList";
import { Row, ExpandableRow } from "../ui/Row";
import { DefinitionList, Definition } from "../ui/DefinitionList";
/** The width the list needs beside the pane before the pane would overlay it. */
const FILES_FIT = 420;
/** The media types shown as text in the preview, and how much of the start of one is shown. */
const TEXT_TYPES = ["text/plain", "text/markdown", "text/csv"];
const PREVIEW_CHARS = 2000;
/** The media types the app shows as pictures (the same ones the server serves inline). */
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export function Files() {
  const { t } = useWords();
  const files = useQuery({ queryKey: ["files"], queryFn: api.files });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const workspace = usePluginActions();
  const { start, review } = useActionReview();
  const [adding, setAdding] = useState(false);
  // A file dropped on, or chosen in, the empty page is the one the Add form opens with.
  const [dropped, setDropped] = useState<File | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const names = new Map((projects.data ?? []).map((p) => [p.id, p.name]));
  // A file filed on a side and in none of its projects is "in <side>, not in a project", never in a project.
  const sides = new Set((projects.data ?? []).filter((p) => p.side).map((p) => p.id));
  const side = useSideFilter();
  const sideOf = useSideOf();
  // With nothing beside Personal, a file filed on Personal itself has no place to say: it is simply the person's.
  const { justMe } = useSides();
  const placeOf = (project: string | null | undefined) => (project && !(justMe && sides.has(project)) ? names.get(project) : undefined);
  const everything = files.data ?? [];
  const shown = everything.filter((f) => onSide(sideOf(f.project), side.choice));
  const beside = useMediaQuery("(min-width: 1024px)");
  const choice = useListChoice({ keys: shown.map((f) => f.id), beside, reset: side.choice });
  const selected = shown.find((f) => f.id === choice.chosen) ?? null;

  return (
    <section className="panel-section" aria-labelledby="files-title">
      <PageHeader
        id="files-title"
        title={t("files.title")}
        filters={<SideFilter holds={everything.length} />}
        actionsLabel={t("files.actions_label")}
        actions={(workspace.data ?? []).map((action) => (
          <Button
            key={action.name}
            onClick={(e) => {
              const button = e.currentTarget;
              start(action, null, () => button);
            }}
          >
            {action.label}
          </Button>
        ))}
        primary={
          <Button variant="primary" ref={addButton} onClick={() => setAdding(true)}>
            {t("files.add")}
          </Button>
        }
      />
      <ListDetail
        title={selected?.name ?? ""}
        onClose={choice.close}
        fit={FILES_FIT}
        detail={selected ? <FileDetail file={selected} project={placeOf(selected.project)} side={!!selected.project && sides.has(selected.project)} earlier={everything.find((f) => f.id === selected.replaces)?.name} /> : null}
      >
        <ListState query={files} failed={t("files.load_failed")} row={{ lead: false, framed: true }}>
          {() =>
            everything.length === 0 ? (
              <div className={styles.empty} data-empty="">
                <FileDrop
                  id="files-drop"
                  aria-label={t("files.drop_label")}
                  onChange={(e) => {
                    const chosen = e.target.files?.[0] ?? null;
                    setDropped(chosen);
                    if (chosen) setAdding(true);
                  }}
                />
                <p className="hint">{t("files.empty")}</p>
              </div>
            ) : shown.length === 0 ? (
              <FilteredEmpty text={t("sides.empty.files", { side: side.named })} onClear={() => side.set("all")} />
            ) : (
              <RowList>
                {shown.map((file) => (
                  <FileRow key={file.id} file={file} project={placeOf(file.project)} side={!!file.project && sides.has(file.project)} choice={choice} kinds={new Set(shown.map((f) => f.kind_label)).size > 1} />
                ))}
              </RowList>
            )
          }
        </ListState>
      </ListDetail>
      {adding && (
        <AddFile
          initial={dropped}
          onClose={() => {
            setAdding(false);
            setDropped(null);
            restoreFocus(() => addButton.current);
          }}
        />
      )}
      {review}
    </section>
  );
}

/** `kinds`: the list holds more than one kind of file, so each row says its own; a list of one kind says nothing on any row. */
function FileRow(props: { file: S["FileView"]; project?: string; side?: boolean; choice: ListChoice; kinds?: boolean }) {
  const { t } = useWords();
  const size = useSize();
  const { file, choice } = props;
  const ref = useRef<HTMLLIElement>(null);
  const actions = usePluginActions("file", file.id);
  const { start, review } = useActionReview();
  const titleId = `file-${file.id}`;
  const edits = useFileEdits(file);
  const menu: MenuAction[] = [
    ...(actions.data ?? []).map((action) => ({
      id: action.name,
      label: action.label,
      run: () => start(action, { kind: "file", id: file.id }, () => ref.current?.querySelector<HTMLElement>("button.more")),
    })),
    ...edits.entries,
  ];
  const facts = [
    size(file.size),
    ...(props.project ? [props.side ? t("place.option_side", { side: props.project }) : t("files.in_project", { project: props.project })] : []),
    t("files.added_on", { when: day(file.added_at) }),
  ];
  return (
    <ExpandableRow
      ref={ref}
      aria-labelledby={titleId}
      {...choice.rowProps(file.id)}
      pill={props.kinds ? <Pill>{file.kind_label}</Pill> : undefined}
      title={file.name}
      titleId={titleId}
      metaLines={[facts.join(" · "), file.description || null, file.origin === "tool" ? <Pill tone="warn">{t("files.untrusted")}</Pill> : null]}
      expand={{ expanded: choice.chosen === file.id, onToggle: () => choice.choose(file.id) }}
      primary={
        <ButtonLink
          variant="primary"
          data-key="primary"
          href={api.fileContent(file.id)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("files.open_named", { name: file.name })}
        >
          {t("files.open")}
        </ButtonLink>
      }
      menu={<RowMenu label={file.name} actions={menu} />}
    >
      {edits.form}
      {review}
    </ExpandableRow>
  );
}

/** The details of one file: a preview, where it came from and what refers to it. Nothing is drawn as a page: a picture is
 * shown as a picture, text as plain text, and anything else is only offered to open. */
function FileDetail(props: { file: S["FileView"]; project?: string; side?: boolean; earlier?: string }) {
  const { t } = useWords();
  const size = useSize();
  const { file } = props;
  const used = useQuery({ queryKey: ["file-used-by", file.id], queryFn: () => api.fileUsedBy(file.id) });
  const facts: Array<[string, string]> = [
    [t("files.detail.kind"), file.kind_label],
    [t("files.detail.size"), size(file.size)],
    ...(props.project ? ([[t("files.detail.project"), props.side ? t("files.detail.side_value", { side: props.project }) : props.project]] as Array<[string, string]>) : []),
  ];
  return (
    <>
      {file.description && (
        <section aria-labelledby={`file-${file.id}-about`}>
          <h3 id={`file-${file.id}-about`}>{t("files.detail.about")}</h3>
          <p>{file.description}</p>
        </section>
      )}
      <section aria-labelledby={`file-${file.id}-preview`}>
        <h3 id={`file-${file.id}-preview`}>{t("files.detail.preview")}</h3>
        <Preview file={file} />
      </section>
      <section aria-labelledby={`file-${file.id}-from`}>
        <h3 id={`file-${file.id}-from`}>{t("files.detail.from")}</h3>
        <p>{t(file.origin === "tool" ? "files.detail.from_tool" : "files.detail.from_you", { when: day(file.added_at) })}</p>
        {file.origin === "tool" && <p className="hint">{t("files.detail.from_tool_hint")}</p>}
        {props.earlier && <p>{t("files.detail.replaces", { name: props.earlier })}</p>}
        <DefinitionList>
          {facts.map(([label, value]) => (
            <Definition key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Definition>
          ))}
        </DefinitionList>
      </section>
      <section aria-labelledby={`file-${file.id}-refers`}>
        <h3 id={`file-${file.id}-refers`}>{t("files.detail.refers")}</h3>
        {used.isPending ? (
          <Skeleton />
        ) : used.isError ? (
          <p className="hint">{t("files.detail.refers_failed")}</p>
        ) : used.data.items.length === 0 ? (
          <p className="hint">{t("files.detail.refers_none")}</p>
        ) : (
          <RowList>
            {used.data.items.map((use) => (
              <Row
                key={`${use.kind}:${use.id}`}
                title={<a href={viewHref(recordView(use.kind, use.id))}>{t("files.detail.refers_item", { kind: use.kind_label, label: use.label })}</a>}
              />
            ))}
          </RowList>
        )}
      </section>
      <Actions align="end">
        <ButtonLink variant="primary" href={api.fileContent(file.id)} target="_blank" rel="noopener noreferrer" aria-label={t("files.open_named", { name: file.name })}>
          {t("files.open")}
        </ButtonLink>
      </Actions>
    </>
  );
}

function Preview(props: { file: S["FileView"] }) {
  const { t } = useWords();
  const { file } = props;
  const isText = TEXT_TYPES.includes(file.media_type);
  const text = useQuery({
    queryKey: ["file-text", file.id, file.version],
    queryFn: async () => {
      const response = await fetch(api.fileContent(file.id));
      if (!response.ok) throw new Error(String(response.status));
      return response.text();
    },
    enabled: isText,
    retry: false,
  });
  if (IMAGE_TYPES.includes(file.media_type)) {
    return <img className="file-preview" src={api.fileContent(file.id)} alt={t("files.detail.preview_alt", { name: file.name })} />;
  }
  if (isText) {
    if (text.isPending) return <Skeleton />;
    if (text.isError) return <p className="hint">{t("files.detail.no_preview")}</p>;
    const whole = text.data;
    return (
      <>
        <pre className="file-preview" tabIndex={0}>
          {whole.length > PREVIEW_CHARS ? `${whole.slice(0, PREVIEW_CHARS)}…` : whole}
        </pre>
        {whole.length > PREVIEW_CHARS && <p className="hint">{t("files.detail.preview_more")}</p>}
      </>
    );
  }
  return <p className="hint">{t("files.detail.no_preview")}</p>;
}
