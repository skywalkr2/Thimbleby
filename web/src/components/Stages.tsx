// Stages (design 6.26): where each item is in its steps, and moving it. One row per item with one primary action: move
// on when it is ready, otherwise the reasons it isn't. Moving back and the history are in the row's menu.
import { useRef, useState } from "react";
import { useRowKeys } from "../lib/keys";
import { useMediaQuery } from "../lib/media";
import {
  sameItem,
  useKindWords,
  useMove,
  useStageRecords,
  useStageRequests,
  waitingForGo,
  type StageRequest,
  type StageView,
} from "../lib/stages";
import { usePluginActions } from "../lib/plugin-actions";
import { useWords } from "../lib/wording";
import { useActionReview } from "./ActionReview";
import { RowMenu, type MenuAction } from "./RowMenu";
import { SafeText } from "./SafeText";
import { StagesBoard } from "./StagesBoard";
import { History, WaitingLine } from "./StageParts";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";
import { RowList } from "../ui/RowList";
import { ItemList, Item } from "../ui/ItemList";
import { Row } from "../ui/Row";
import { Pill } from "../ui/Pill";
import { RowBody } from "../ui/RowBody";
type Shown = "board" | "list";
const KEPT = "stages.view";

/** How the person last chose to see the stages, kept for this device; a phone starts with the list. */
function useShown(): [Shown, (v: Shown) => void] {
  const phone = useMediaQuery("(max-width: 639px)");
  const [chosen, setChosen] = useState<Shown | null>(() => {
    try {
      const kept = window.localStorage.getItem(KEPT);
      return kept === "board" || kept === "list" ? kept : null;
    } catch {
      return null;
    }
  });
  const set = (v: Shown) => {
    setChosen(v);
    try {
      window.localStorage.setItem(KEPT, v);
    } catch {
      // The choice is just not remembered.
    }
  };
  return [chosen ?? (phone ? "list" : "board"), set];
}

export function Stages() {
  const { t } = useWords();
  const kindWords = useKindWords();
  const records = useStageRecords();
  const requests = useStageRequests();
  const waiting = waitingForGo(requests.data);
  const [shown, setShown] = useShown();
  const groups = new Map<string, StageView[]>();
  for (const view of records.data ?? []) groups.set(view.record.kind, [...(groups.get(view.record.kind) ?? []), view]);
  return (
    <>
      <PageHeader
        id="stages-title"
        title={t("stages.title")}
        filters={
          groups.size > 0 ? (
            <SegmentedControl
              label={t("stages.view")}
              value={shown}
              onChange={setShown}
              options={[
                { value: "board", label: t("stages.view.board") },
                { value: "list", label: t("stages.view.list") },
              ]}
            />
          ) : undefined
        }
      />
      {records.isPending ? (
        <section className="panel-section" aria-labelledby="stages-title">
          <Skeleton />
        </section>
      ) : records.isError ? (
        <section className="panel-section" aria-labelledby="stages-title">
          <EmptyState icon="alert" text={t("stages.load_failed")} action={{ label: t("action.try_again"), onClick: () => void records.refetch() }} />
        </section>
      ) : groups.size === 0 ? (
        <section className="panel-section" aria-labelledby="stages-title">
          <EmptyState text={t("stages.empty")} />
        </section>
      ) : (
        [...groups].map(([kind, views]) => (
          <section key={kind} className="panel-section" aria-labelledby={`stages-${kind}`}>
            <div className="heading">
              <h2 id={`stages-${kind}`}>{kindWords(kind)}</h2>
            </div>
            {shown === "board" ? (
              <StagesBoard kind={kindWords(kind)} views={views} waiting={waiting} />
            ) : (
              <RowList>
                {views.map((view) => (
                  <StageRow
                    key={`${view.record.kind}/${view.record.id}`}
                    view={view}
                    waiting={waiting.filter((r) => sameItem(view.record, r.stage_start))}
                  />
                ))}
              </RowList>
            )}
          </section>
        ))
      )}
    </>
  );
}

function StageRow(props: { view: StageView; waiting: StageRequest[] }) {
  const { t } = useWords();
  const { view } = props;
  const { error, busy, move } = useMove();
  const [history, setHistory] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const actions = usePluginActions(view.record.kind, view.record.id);
  const { start, review } = useActionReview();
  const ids = view.stages.map((s) => s.id);
  const here = view.current === null ? -1 : ids.indexOf(view.current);
  const failed = view.checks.filter((c) => !c.passed);
  const next = view.next;

  const primary = next && view.ready ? { label: t("stages.move_to", { stage: next.label }), run: () => void move(view, next) } : null;
  const menu: MenuAction[] = [];
  for (let i = here - 1; i >= 0; i--) {
    const stage = view.stages[i];
    menu.push({
      id: `back-${stage.id}`,
      label: t("stages.move_back", { stage: stage.label }),
      run: () => void move(view, stage),
    });
  }
  menu.push({ id: "history", label: t(history ? "stages.history_hide" : "stages.history"), run: () => setHistory((v) => !v) });
  for (const action of actions.data ?? []) {
    menu.push({
      id: `action-${action.name}`,
      label: action.label,
      run: () =>
        start(action, { kind: view.record.kind, id: view.record.id }, () => ref.current?.querySelector<HTMLElement>("button.more")),
    });
  }

  useRowKeys(ref, { primary: primary?.run, toggle: () => setHistory((v) => !v) });

  const stageName = view.current === null ? t("stages.not_started") : (view.current_label ?? t("stages.unknown_stage"));
  const sub = !next
    ? t("stages.sub.last")
    : view.ready
      ? t("stages.sub.ready", { stage: next.label })
      : t("stages.sub.blocked", { stage: next.label });
  const hasBody = (!view.ready && next && failed.length > 0) || props.waiting.length > 0 || history || error;
  const titleId = `st-${view.record.kind}-${view.record.id}`;

  return (
    <Row
      ref={ref}
      aria-labelledby={titleId}
      pill={<Pill tone={view.current === null ? "neutral" : "need"}>{stageName}</Pill>}
      title={<SafeText text={view.title} />}
      titleId={titleId}
      meta={sub}
      primary={
        primary && (
          <Button variant="primary" disabled={busy} onClick={primary.run}>
            {primary.label}
          </Button>
        )
      }
      menu={<RowMenu label={view.title} actions={menu} />}
    >
      {hasBody && (
        <RowBody>
          {!view.ready && next && failed.length > 0 && (
            <div>
              <p className="what">{t("stages.why_not", { stage: next.label })}</p>
              <ItemList>
                {failed.map((c) => (
                  <Item single key={c.id}>
                    <SafeText text={c.reason} />
                  </Item>
                ))}
              </ItemList>
            </div>
          )}
          {props.waiting.length > 0 && (
            <ItemList aria-label={t("stages.waiting_label")}>
              {props.waiting.map((r) => (
                <WaitingLine key={r.id} request={r} />
              ))}
            </ItemList>
          )}
          {history && <History view={view} />}
          {error && (
            <p className="problem-note" role="alert">
              {error}
            </p>
          )}
        </RowBody>
      )}
      {review}
    </Row>
  );
}
