// The starting templates for kinds of items of your own (design 3.10): what each adds, and one button to use it. The
// setup guide's template step and Ask's offer to keep track of something of your own both show this list.
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useRestart } from "../lib/restart";
import { useSides } from "../lib/sides";
import { useWords } from "../lib/wording";
import { Skeleton } from "../ui/Skeleton";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Row } from "../ui/Row";
import { RowList } from "../ui/RowList";
export function TemplateList() {
  const { t } = useWords();
  const act = useAct();
  const restart = useRestart();
  const templates = useQuery({ queryKey: ["templates"], queryFn: api.templates });
  const { justMe } = useSides();
  const [busy, setBusy] = useState(false);
  if (templates.isPending) return <Skeleton />;
  // A person with nothing beside their own life is offered the templates for that, never the ones for running work.
  const offered = templates.data?.filter((tpl) => !justMe || tpl.audience !== "work") ?? [];
  if (templates.isError || !offered.length) return <EmptyState text={t("welcome.template.none")} />;
  const apply = async (template: S["TemplateView"]) => {
    setBusy(true);
    const done = await act(
      () => api.applyTemplate(template.id),
      () => ({ message: t("welcome.template.applied", { name: template.name }) }),
    );
    setBusy(false);
    if (done?.needs_restart) restart.offer();
  };
  return (
    <RowList>
      {offered.map((tpl) => {
        return (
          <Row
            key={tpl.id}
            title={tpl.name}
            meta={tpl.description || undefined}
            primary={
              tpl.set_up ? (
                <span className="template-set-up">
                  <Icon name="check" size={14} /> {t("welcome.template.set_up")}
                </span>
              ) : (
                <Button disabled={busy} aria-label={t("welcome.template.apply_named", { name: tpl.name })} onClick={() => void apply(tpl)}>
                  {t("welcome.template.apply")}
                </Button>
              )
            }
          />
        );
      })}
    </RowList>
  );
}

/** Under Ask's box: a line that opens the starting templates for keeping track of something of your own, so the app's
 * define-your-own kit is offered where it is wanted and not as an add-on to turn on. Nothing is read until it is opened. */
export function OwnKindsOffer() {
  const { t } = useWords();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="own-kinds">
      <button type="button" className="link-button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        {t("own_kinds.offer")}
      </button>
      <div id={id} hidden={!open}>
        {open && (
          <>
            <p className="hint">{t("own_kinds.hint")}</p>
            <TemplateList />
          </>
        )}
      </div>
    </div>
  );
}
