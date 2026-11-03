// Which sides of the person's life a mailbox or calendar serves, as tick boxes (design 6.32): in setup, after a sign-in, and
// on Connections beside the rest of a connection's settings, so the choice made at setup can be changed later.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, ApiError, type S } from "../lib/api";
import { freshSettings, useAfterSave } from "../lib/settings-save";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { CheckboxGroup } from "../ui/CheckboxGroup";

type Source = S["WatchSourceView"];

export const SOURCES = "watch.sources";

export const listOf = (names: string[]) => new Intl.ListFormat(undefined, { style: "long", type: "conjunction" }).format(names);

/** Which sides of the person's life a mailbox or calendar serves, as tick boxes: Personal and each side. Each tick is saved at
 * once as the source's `sides`, through the settings save (the whole list of sources, read fresh). A tick made while an
 * earlier one is still being saved is queued and saved after it, and the boxes and the line under them show the choices as made,
 * so the last words always match the boxes. The step raises no message for a tick: a tick is undone by unticking it, and one
 * that couldn't be saved names its box and offers Try again. Nothing ticked is allowed: it means not said. With several sources
 * (`group`), one set of boxes is saved to every one of them in the same save, and a box shows ticked when all of them hold it. */
export function SourceSides(props: { sources: Source[]; group?: boolean; what?: string; account?: string; label?: string; personal: string | null; sides: S["SideView"][]; compact?: boolean; hintId?: string }) {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  type Tick = { side: string; on: boolean };
  // What the person ticked that isn't settled yet (shown as made), the ticks waiting their turn, and what couldn't be saved.
  const [wanted, setWanted] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Array<Tick & { detail: string }>>([]);
  const [touched, setTouched] = useState(false);
  const waiting = useRef<Tick[]>([]);
  const running = useRef(false);
  const options = [
    ...(props.personal ? [{ id: props.personal, name: t("sides.filter.personal") }] : []),
    ...props.sides.map((s) => ({ id: s.project, name: s.name })),
  ];
  const stored = (settings.data?.items.find((i) => i.key === SOURCES)?.value ?? []) as Array<{ id: string; sides?: string[] }>;
  const heldBy = (id: string) => new Set(stored.find((s) => s.id === id)?.sides ?? []);
  const ticked = (side: string) => wanted[side] ?? props.sources.every((src) => heldBy(src.id).has(side));
  const mine = props.sources.map((src) => src.id);
  const label = props.label ?? props.sources[0]?.label ?? "";
  const many = props.sources.length > 1;
  // For one account's sources among several: the kinds it reads, named in the question with its address.
  const kinds = [...new Set(props.sources.flatMap((src) => src.reads ?? []))].map((kind) => t(`walkthrough.mail.reads.${kind}`)).join(t("walkthrough.mail.reads_join"));

  const save = async ({ side, on }: Tick) => {
    // The settings as they are now, so a change made meanwhile is noticed rather than overwritten.
    const current = await freshSettings(client);
    const list = (current.items.find((i) => i.key === SOURCES)?.value ?? []) as Array<Record<string, unknown> & { id: string; sides?: string[] }>;
    const withTick = (had: string[] | undefined): string[] => {
      const now = new Set(had ?? []);
      if (on) now.add(side);
      else now.delete(side);
      // In the order of the choices, then any side the source names that isn't offered, which a tick leaves as it was.
      return [...options.map((o) => o.id).filter((id) => now.has(id)), ...[...now].filter((id) => !options.some((o) => o.id === id))];
    };
    const changes = { [SOURCES]: list.map((s) => (mine.includes(s.id) ? { ...s, sides: withTick(s.sides) } : s)) };
    const saved = await api.saveSettings({ changes, reset: [], fingerprint: current.fingerprint });
    await afterSave(saved, { quiet: true });
  };

  // One save at a time, in the order the ticks were made.
  const drain = async () => {
    if (running.current) return;
    running.current = true;
    const missed: Array<Tick & { detail: string }> = [];
    try {
      while (waiting.current.length > 0) {
        const tick = waiting.current.shift() as Tick;
        try {
          await save(tick);
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) void client.invalidateQueries({ queryKey: ["settings"] });
          missed.push({ ...tick, detail: err instanceof ApiError && err.detail && err.status < 500 ? err.detail : "" });
          // The box goes back to what is stored.
          setWanted((now) => Object.fromEntries(Object.entries(now).filter(([side]) => side !== tick.side)));
        }
      }
    } finally {
      running.current = false;
    }
    if (missed.length > 0) setFailed(missed);
    // Every tick is saved now: the boxes read from the settings again, unless another tick has been made since.
    await freshSettings(client).catch(() => undefined);
    if (!running.current && waiting.current.length === 0) setWanted({});
  };

  const change = (side: string, on: boolean) => {
    setFailed([]);
    setTouched(true);
    setWanted((now) => ({ ...now, [side]: on }));
    waiting.current.push({ side, on });
    void drain();
  };
  const retry = () => {
    const again = failed;
    setFailed([]);
    setWanted((now) => ({ ...now, ...Object.fromEntries(again.map((x) => [x.side, x.on])) }));
    waiting.current.push(...again.map(({ side, on }) => ({ side, on })));
    void drain();
  };

  const id = `source-sides-${mine.join("-").replace(/[^A-Za-z0-9_-]/g, "-")}`;
  const list = listOf;
  const count = many ? "other" : "one";
  const serving = options.filter((o) => ticked(o.id)).map((o) => o.name);
  const nameOf = (side: string) => options.find((o) => o.id === side)?.name ?? side;
  return (
    <CheckboxGroup legend={props.group ? (props.account ? t("walkthrough.mail.sides.account.legend", { reads: kinds, account: props.account }) : t(`walkthrough.mail.sides.group.legend_${count}`)) : t("walkthrough.mail.sides.legend", { label: label })} data-source-sides={props.group ? undefined : mine[0]} data-sign-in-sides={props.group ? "" : undefined} aria-describedby={props.compact ? props.hintId : `${id}-hint`} className={props.compact ? "source-sides-compact" : undefined}>
      {options.map((o) => (
        <label key={o.id} className="side-chip" data-ticked={ticked(o.id) ? "true" : undefined}>
          <input type="checkbox" checked={ticked(o.id)} disabled={settings.isPending} onChange={(e) => change(o.id, e.target.checked)} />
          <span>{o.name}</span>
        </label>
      ))}
      {!props.compact && (
        <p className="hint" id={`${id}-hint`}>
          {t("walkthrough.mail.sides.hint")}
        </p>
      )}
      {(serving.length > 0 || touched) && !(props.compact && !touched) && (
        <p className="hint" role="status" data-sides-state="">
          {props.group
            ? serving.length > 0
              ? t(`walkthrough.mail.sides.group.state_${count}`, { sides: list(serving) })
              : t(`walkthrough.mail.sides.group.none_${count}${options.length === 2 ? "_two" : ""}`)
            : serving.length > 0
              ? t("walkthrough.mail.sides.state", { label, sides: list(serving) })
              : t(options.length === 2 ? "walkthrough.mail.sides.none_two" : "walkthrough.mail.sides.none", { label })}
        </p>
      )}
      {failed.length > 0 && (
        <div className="problem-note" role="alert">
          <p>
            {t("walkthrough.mail.sides.failed", {
              sides: list([...new Set(failed.map((x) => nameOf(x.side)))]),
              label: props.group ? (props.what ?? "") : label,
            })}
            {failed[0].detail ? ` ${failed[0].detail}` : ""}
          </p>
          <Button onClick={retry}>
            {t("action.try_again")}
          </Button>
        </div>
      )}
    </CheckboxGroup>
  );
}
