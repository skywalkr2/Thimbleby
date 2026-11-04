// An add-on's own page of Settings: who it is (its state and version, what it is for), then its settings and keys. A page with
// none of those says so, with where the add-on's sign-in and what it reads are kept, never a blank under the title.
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import { settingsView, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { StateMark, type StateTone } from "../ui/StateMark";

export function AddonPage(props: {
  plugin: string;
  /** The page has settings or keys to show beside this header. */
  hasContent: boolean;
  children?: ReactNode;
}) {
  const { t } = useWords();
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const keys = useQuery({ queryKey: ["addon-secrets"], queryFn: api.addonSecrets });
  const mine = packs.data?.installed.find((i) => i.name === props.plugin);
  const tone: StateTone = !mine ? "neutral" : mine.state === "enabled" ? "ok" : "neutral";
  const keysShown = (keys.data?.find((a) => a.plugin === props.plugin)?.secrets.length ?? 0) > 0 && mine?.signed_in !== true;
  return (
    <div className="addon-page" data-addon-page={props.plugin}>
      {packs.isPending ? (
        <Skeleton rows={2} />
      ) : mine ? (
        <div className="addon-page-head">
          <p className="hint">
            <StateMark tone={tone}>{t(mine.state === "enabled" ? "addons.pill.on" : "addons.pill.off")}</StateMark>
            {mine.version ? ` · ${t("addons.version", { version: mine.version })}` : ""}
            {mine.signed_in != null && mine.state === "enabled" ? ` · ${t(mine.signed_in ? "addons.signed_in" : "addons.not_signed_in")}` : ""}
          </p>
          {mine.description && <p className="hint addon-page-about">{mine.description}</p>}
        </div>
      ) : null}
      {props.children}
      {!props.hasContent && !keysShown && !packs.isPending && (
        <EmptyState
          icon="puzzle"
          title={t("addons.page.empty_title")}
          text={t("addons.page.empty")}
          action={{ label: t("addons.page.to_connections"), href: viewHref(settingsView("connections")) }}
        />
      )}
    </div>
  );
}
