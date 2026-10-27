// The Came in card of Today's rail (design 7.7): the mail that arrived, with a button that reads every source now. A card
// with nothing in it is not drawn; it is drawn when mail arrived, a mailbox couldn't be read, or there is a mailbox to
// connect (given only once setup is finished).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { localDate, wallTime, weekday } from "../lib/dates";
import { useSetAside } from "../lib/set-aside";
import { anyReading } from "../lib/sources";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import { Empty, Failed, RailPanel } from "./RailPanel";
import { SourceProblems, useNow, useSourceNames, useSourceState } from "./RailSources";
import { RowMenu } from "./RowMenu";
import { SafeLink } from "./SafeText";

type T = ReturnType<typeof useWords>["t"];

/** What a check says in a toast: what arrived, then any source that couldn't be read or was already being read. */
function checkedText(result: S["InboxCheckView"], t: T, tn: ReturnType<typeof useWords>["tn"]): string {
  const parts = [result.new_items > 0 ? tn("today.arrived.check_new", result.new_items) : t("today.arrived.check_none")];
  // A source that couldn't be read says why and what to do, not only that it failed.
  if (result.sources_failed > 0) {
    const problems = result.problems ?? [];
    parts.push(...(problems.length > 0 ? problems.map((p) => p.replace(/\.$/, "")) : [tn("today.arrived.check_failed", result.sources_failed)]));
  }
  if (result.sources_busy > 0) parts.push(tn("today.arrived.check_busy", result.sources_busy));
  return parts.join(". ") + (parts.length > 1 ? "." : "");
}

/** The button that reads every source now and shows what arrived; it never replaces the sources' own schedule. */
function CheckNow() {
  const { t, tn } = useWords();
  const act = useAct();
  const client = useQueryClient();
  const [checking, setChecking] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const keepFocus = useRef(false);
  // A button that turns off while it works loses the keyboard's place; put it back once it is on again.
  useEffect(() => {
    if (!checking && keepFocus.current) {
      keepFocus.current = false;
      button.current?.focus();
    }
  }, [checking]);
  const run = async () => {
    keepFocus.current = document.activeElement === button.current;
    setChecking(true);
    await act(
      async () => {
        const result = await api.checkArrived();
        // Show the new list at once, without waiting for it to be fetched again.
        client.setQueryData<S["InboxView"]>(["today", "arrived"], {
          items: result.items,
          left_out: result.left_out,
          set_aside: result.set_aside,
        });
        return result;
      },
      (result) => ({ message: checkedText(result, t, tn) }),
    );
    setChecking(false);
  };
  return (
    <button ref={button} type="button" className="btn small" disabled={checking} aria-busy={checking} onClick={() => void run()}>
      {t(checking ? "today.arrived.checking" : "today.arrived.check")}
    </button>
  );
}

/** The Came in card and whether to draw it; `settled` is true once what it asks has answered. */
export function useCameInCard(onAddSource?: () => void): { settled: boolean; drawn: boolean; card: ReactNode } {
  const { t, tn } = useWords();
  const sourceState = useSourceState(onAddSource, t("today.arrived.connect"), "mail");
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const arrived = useQuery({ queryKey: ["today", "arrived"], queryFn: api.arrived });
  const now = useNow();
  const today = localDate(now);
  const items = arrived.data?.items ?? [];
  const { setAside: moveToFolder } = useSetAside();
  const sourceName = useSourceNames(items.map((m) => m.source));
  const received = (iso: string) => (iso.slice(0, 10) === today ? wallTime(iso) : weekday(iso));
  const settled = !arrived.isPending && !watch.isPending;
  const drawn = arrived.isError || items.length > 0 || sourceState.problems.length > 0 || !!sourceState.button;

  const card = (
    <RailPanel
      id="arrived"
      title={t("today.arrived.title")}
      count={arrived.data ? items.length : null}
      countText={tn("today.arrived.count", items.length)}
      summary={
        arrived.data
          ? items.length > 0
            ? String(items.length)
            : sourceState.problems.length > 0
              ? t("today.rail.not_read")
              : t("today.rail.nothing")
          : ""
      }
      action={watch.data && anyReading(watch.data) ? <CheckNow /> : undefined}
    >
      {arrived.isPending ? (
        <Skeleton />
      ) : arrived.isError ? (
        <Failed text={t("today.arrived.load_failed")} retry={() => void arrived.refetch()} />
      ) : items.length === 0 ? (
        sourceState.problems.length > 0 ? (
          <div className="tb-empty">
            <p>{t("today.arrived.not_read")}</p>
            <SourceProblems problems={sourceState.problems} />
          </div>
        ) : (
          <Empty text={t("today.arrived.empty")} button={sourceState.button} />
        )
      ) : (
        <ul className="tb-list">
          {items.map((message, i) => {
            const meta = [message.sender, sourceName(message.source)].filter(Boolean).join(" · ");
            return (
              <li key={`${message.snapshot}:${i}`} className={message.unread ? "tb-row unread" : "tb-row"}>
                <div className="tb-what">
                  <div className="tb-title">
                    {message.unread && <span className="pill k-wait">{t("today.arrived.new")}</span>}
                    <span>{message.link ? <SafeLink label={message.title} url={message.link} /> : message.title}</span>
                  </div>
                  {meta && (
                    <div className="tb-meta" title={message.sender_address ?? undefined}>
                      {meta}
                    </div>
                  )}
                </div>
                <time className="tb-when" dateTime={message.received}>
                  {received(message.received)}
                </time>
                <RowMenu
                  label={message.title}
                  actions={[
                    { id: "sales", label: t("setaside.menu_sales"), run: () => void moveToFolder({ id: message.snapshot, title: message.title }, "sales") },
                  ]}
                />
              </li>
            );
          })}
        </ul>
      )}
    </RailPanel>
  );
  return { settled, drawn, card };
}
