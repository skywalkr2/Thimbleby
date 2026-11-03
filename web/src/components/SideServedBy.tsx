// After a business or job is added (design 6.32, 7.9): which of the mailboxes and calendars already connected serve it. They
// were connected before it existed, so nothing says so yet; asking once keeps mail from them off Personal and out of the
// wrong side. Each tick is saved at once as that connection's `sides` and undone by unticking it; ticking nothing is allowed.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useSides } from "../lib/sides";
import { freshSettings, useAfterSave } from "../lib/settings-save";
import { useWords } from "../lib/wording";
import { CheckboxGroup } from "../ui/CheckboxGroup";
import { SOURCES } from "./SourceSides";

/** The connections that read mail or a calendar, on, as the ones a new side could be served by. */
export function useReadingSources() {
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  return (watch.data ?? []).filter((s) => s.enabled && (s.reads ?? []).length > 0);
}

export function SideServedBy(props: { side: { id: string; name: string } }) {
  const { t, tn } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const reading = useReadingSources();
  const { personal, sides } = useSides();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [wanted, setWanted] = useState<Record<string, boolean>>({});
  const [problem, setProblem] = useState("");
  const chain = useRef<Promise<void>>(Promise.resolve());
  const order = [...(personal ? [personal] : []), ...sides.map((s) => s.project)];
  const stored = (settings.data?.items.find((i) => i.key === SOURCES)?.value ?? []) as Array<{ id: string; sides?: string[] }>;
  const held = (id: string) => (stored.find((s) => s.id === id)?.sides ?? []).includes(props.side.id);
  if (reading.length === 0) return null;

  const save = async (id: string, on: boolean) => {
    // The settings as they are now, so a change made meanwhile is noticed rather than overwritten.
    const current = await freshSettings(client);
    const list = (current.items.find((i) => i.key === SOURCES)?.value ?? []) as Array<Record<string, unknown> & { id: string; sides?: string[] }>;
    const changes = {
      [SOURCES]: list.map((s) => {
        if (s.id !== id) return s;
        const now = new Set(s.sides ?? []);
        if (on) now.add(props.side.id);
        else now.delete(props.side.id);
        return { ...s, sides: [...order.filter((x) => now.has(x)), ...[...now].filter((x) => !order.includes(x))] };
      }),
    };
    const saved = await api.saveSettings({ changes, reset: [], fingerprint: current.fingerprint });
    await afterSave(saved, { quiet: true });
  };
  const change = (id: string, on: boolean) => {
    setProblem("");
    setWanted((all) => ({ ...all, [id]: on }));
    // One save at a time, in the order the ticks were made.
    chain.current = chain.current.then(async () => {
      try {
        await save(id, on);
      } catch (err) {
        setProblem(err instanceof ApiError && err.detail && err.status < 500 ? err.detail : t("side.serves.failed", { name: props.side.name }));
      }
      setWanted((all) => Object.fromEntries(Object.entries(all).filter(([key]) => key !== id)));
    });
  };

  return (
    <CheckboxGroup legend={t("side.serves.legend", { name: props.side.name })} data-side-served-by="" aria-describedby="side-serves-hint">
      {reading.map((source) => (
        <label key={source.id} className="check-line">
          <input type="checkbox" checked={wanted[source.id] ?? held(source.id)} disabled={settings.isPending} onChange={(e) => change(source.id, e.target.checked)} />
          <span>{source.label}</span>
        </label>
      ))}
      <p className="hint" id="side-serves-hint">
        {tn("side.serves.hint", reading.length)}
      </p>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </CheckboxGroup>
  );
}
