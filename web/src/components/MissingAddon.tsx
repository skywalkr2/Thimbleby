// A connection whose add-on isn't running (design 7.9, Connections): the row names the add-on in plain words and offers the
// one thing to do about it. "Install it" installs the add-on the catalog lists (the same install as on Add-ons), "Restart now"
// shows once it is installed and waits for a restart, and an add-on that is installed but off, or that no catalog lists, points
// to Add-ons. Nothing restarts until the person chooses.
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { waitsForRestart } from "../lib/packs";
import { addonLabel } from "../lib/settings";
import { useWords } from "../lib/wording";
import { RestartNowButton, usePackChange } from "./Addons";

/** The add-on a connector belongs to: the part of its id before the slash; none for one the app itself provides. */
export const addonOfConnector = (connector: string): string | null => {
  const at = connector.indexOf("/");
  return at > 0 ? connector.slice(0, at) : null;
};

export function MissingAddon(props: { plugin: string; onOpenAddons?: () => void }) {
  const { t, has } = useWords();
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const pack = packs.data?.available.find((p) => p.id === props.plugin);
  const installed = packs.data?.installed.find((i) => i.name === props.plugin);
  const name = pack?.name ?? addonLabel(props.plugin, t, has);
  const change = usePackChange(props.plugin, name, () => {});
  const restart = change.installed || (installed ? waitsForRestart(installed) : false);
  const installable = !installed && pack?.installable === true;
  const text = restart
    ? t("sources.addon_restart", { name })
    : installable
      ? t("sources.addon_missing", { name })
      : installed
        ? t("sources.addon_turn_on", { name })
        : t("sources.addon_unavailable", { name });
  return (
    <div className="problem-note" data-missing-addon="">
      <p>{text}</p>
      {change.problem && <p role="alert">{change.problem}</p>}
      <p className="acts">
        {restart ? (
          <RestartNowButton />
        ) : installable ? (
          <button
            type="button"
            className="btn primary small"
            disabled={change.busy !== null}
            aria-label={t("sources.addon_install_named", { name })}
            onClick={() => void change.install()}
          >
            {t("sources.addon_install")}
          </button>
        ) : (
          props.onOpenAddons && (
            <button type="button" className="btn quiet small" onClick={props.onOpenAddons}>
              {t("sources.addon_open")}
            </button>
          )
        )}
      </p>
    </div>
  );
}
