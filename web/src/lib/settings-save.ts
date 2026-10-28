// What follows any saved settings (the Settings screen and the guided setup steps): the question about restarting when a change needs one, a refresh of
// what the saved files change, and a toast that reads back what changed with Undo.
import { zoneLabel } from "./time-zones";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api, type S } from "./api";
import { useRestart } from "./restart";
import { leaksInternals } from "./raw-data";
import { formatValue, labelForKey, undoBody } from "./settings";
import { useToasts } from "./toasts";
import { useWords } from "./wording";

const SHOWN = 3;

/** Where the newest settings fingerprint this screen knows is kept: the one a save answered with, so the next save, and an
 * Undo of an earlier one, never go out with an old one. A reload of the settings replaces it. */
const FINGERPRINT = ["settings-fingerprint"] as const;

export const rememberFingerprint = (client: QueryClient, fingerprint: string) => client.setQueryData(FINGERPRINT, fingerprint);

/** The fingerprint to save against: the newest one a save answered with, else the one the settings loaded with. */
export const knownFingerprint = (client: QueryClient, loaded?: string): string | undefined =>
  client.getQueryData<string>(FINGERPRINT) ?? loaded;

export function useAfterSave() {
  const client = useQueryClient();
  const { push } = useToasts();
  const { t, tn, has } = useWords();
  const restart = useRestart();
  return useCallback(
    (saved: S["SettingsSaved"], opts: { message?: string; quiet?: boolean } = {}): Promise<void> => {
      rememberFingerprint(client, saved.fingerprint);
      if (saved.needs_restart) restart.offer();
      const refreshed = client.invalidateQueries();
      // Removing a source or an account also removes the passwords and keys kept for it, once no Undo needs them.
      const going = saved.kept_secrets_going ?? 0;
      const minutes = saved.kept_secrets_undo_minutes ?? 0;
      const secrets = going === 0 ? "" : minutes > 0 ? tn("kept_secrets.going", going, { minutes }) : tn("kept_secrets.gone", going);
      const said = (message: string) => (secrets ? `${message} ${secrets}` : message);
      // A setup step shows what it saved in its own controls: it asks for no message for each tick.
      if (opts.quiet) return refreshed;
      if (!saved.changes.length) {
        push({ message: said(opts.message ?? t("settings.nothing_changed")) });
        return refreshed;
      }
      const known = client.getQueryData<S["SettingsView"]>(["settings"])?.items ?? [];
      const label = (key: string) => labelForKey(key, known, t, has);
      // A value that is an id of the app's own (a setting that holds a person or a project) is never shown as one: the line
      // says the setting changed.
      const line = (c: S["SettingChangeView"]) => {
        // A time zone is said as its city, as everywhere else, never as the id the settings hold.
        const zone = known.find((i) => i.key === c.key)?.choices === "time_zones" && typeof c.after === "string";
        const value = zone ? zoneLabel(String(c.after)) : formatValue(c.after, t);
        if (leaksInternals(value)) return t("settings.saved_changed", { label: label(c.key) });
        return c.is_default ? t("settings.saved_default", { label: label(c.key), value }) : t("settings.saved_line", { label: label(c.key), value });
      };
      const lines = saved.changes.slice(0, SHOWN).map(line);
      if (saved.changes.length > SHOWN) lines.push(t("settings.saved_more", { n: saved.changes.length - SHOWN }));
      push({
        message: said(opts.message ?? t("settings.saved", { changes: lines.join("; ") })),
        undo: async () => {
          // Saves made since then moved the fingerprint on; a change made elsewhere still gets the refusal.
          const undone = await api.saveSettings(undoBody(saved.changes, knownFingerprint(client, saved.fingerprint) ?? saved.fingerprint));
          rememberFingerprint(client, undone.fingerprint);
          if (undone.needs_restart) restart.offer();
          await client.invalidateQueries();
        },
      });
      return refreshed;
    },
    [client, push, t, tn, has, restart],
  );
}

/** The saves of settings that read the fingerprint as they start, one at a time, in the order they were asked for: a save
 * asked for while another is under way waits for it and then reads the fingerprint that one answered with, so neither is
 * refused as out of date by the other and neither is dropped. A save that fails doesn't stop the ones behind it. */
let line: Promise<unknown> = Promise.resolve();
export function inOrder<T>(run: () => Promise<T>): Promise<T> {
  const next = line.then(run, run);
  line = next.catch(() => undefined);
  return next;
}

/** The settings as they are now, read fresh, so a save is made on what the server holds and a change made meanwhile is
 * noticed, not overwritten. The app asks for everything again whenever the server says something changed, and that
 * cancels a read that is under way; a save that waited on such a read was lost. So the read here is a request of its
 * own, which nothing cancels, and the screen's copy is brought up to date with its answer. */
export async function freshSettings(client: QueryClient): Promise<S["SettingsView"]> {
  const view = await api.settings();
  client.setQueryData(["settings"], view);
  return view;
}

/** The fingerprint of the settings as they are now, read fresh, so a change made meanwhile is noticed, not overwritten. */
export function useFreshFingerprint() {
  const client = useQueryClient();
  return useCallback(async () => (await freshSettings(client)).fingerprint, [client]);
}
