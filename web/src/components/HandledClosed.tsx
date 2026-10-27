// The assistant's own closes on Handled for you (design 7.20, 6.32): actions and questions it closed, dropped or
// answered without the person making or seeing the change, each with what it was, when, why and what kind of item it is,
// and the share of all closes nobody saw. Looks right marks one as seen. A change a rule closed is a row of the list above.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { whenText as when } from "../lib/dates";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";

type SilentClose = S["SilentCloseView"];

export function AssistantCloses() {
  const { t, tn } = useWords();
  const found = useQuery({ queryKey: ["silent-closes"], queryFn: api.silentCloses });
  const mine = found.data?.closes.filter((c) => c.kind === "assistant") ?? [];
  return (
    <section className="panel-section" aria-labelledby="silent-closes-title">
      <div className="heading">
        <h2 id="silent-closes-title">{t("sources.silent.title")}</h2>
      </div>
      <p className="hint">{t("sources.silent.intro")}</p>
      {found.isPending ? (
        <Skeleton />
      ) : found.isError ? (
        <p className="empty">
          {t("sources.silent.load_failed")}{" "}
          <button type="button" className="btn" onClick={() => void found.refetch()}>
            {t("action.try_again")}
          </button>
        </p>
      ) : (
        <>
          {found.data.measure.total > 0 ? (
            <p className="hint" data-testid="silent-measure">
              {found.data.measure.silent === 0
                ? t("sources.silent.measure_none", { days: found.data.measure.days })
                : tn("sources.silent.measure", found.data.measure.silent, {
                    silent: found.data.measure.silent,
                    total: found.data.measure.total,
                  })}
            </p>
          ) : null}
          {mine.length === 0 ? (
            <p className="empty">{t("sources.silent.empty")}</p>
          ) : (
            <ul className="queue">
              {mine.map((item) => (
                <AssistantCloseRow key={item.ref} item={item} />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function AssistantCloseRow(props: { item: SilentClose }) {
  const { t } = useWords();
  const act = useAct();
  const [busy, setBusy] = useState(false);
  const { item } = props;
  const titleId = `silent-${item.ref}`;
  const seen = async () => {
    setBusy(true);
    await act(
      () => api.closeSeen(item.ref),
      () => ({ message: t("sources.silent.toast", { title: item.title }) }),
    );
    setBusy(false);
  };
  const facts = [t("sources.silent.by_assistant"), when(item.when)].filter(Boolean);
  return (
    <li className="line" data-row tabIndex={-1} aria-labelledby={titleId}>
      <div className="row">
        <span className="kind k-done" data-item={item.item}>
          {t(`handled.item.${item.item}`)}
        </span>
        <div className="text">
          <strong id={titleId}>{item.title}</strong>
          <span className="sub">{[t(`sources.silent.how.${item.how}`), ...facts].join(" · ")}</span>
          {item.why ? <span className="sub">{t("sources.silent.why", { reason: item.why })}</span> : null}
        </div>
        <div className="acts">
          <button
            type="button"
            className="btn primary"
            data-key="primary"
            disabled={busy}
            aria-label={t("sources.silent.seen_named", { title: item.title })}
            onClick={() => void seen()}
          >
            {t("sources.silent.seen")}
          </button>
        </div>
      </div>
    </li>
  );
}
