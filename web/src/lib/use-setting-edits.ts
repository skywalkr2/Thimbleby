// Editing a few settings from a screen that is not Settings (the catalog fields on Add-ons, the message style on
// Follow-ups, the glossary on Knowledge): each is saved as it is changed, against the settings as they are now, with the
// same read-back and Undo as on Settings. A change made elsewhere meanwhile is refused in plain words and what was typed stays.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError, type S } from "./api";
import { problemText } from "./problem";
import { fromDraft, toDraft, type Draft, type Item } from "./settings";
import { inOrder, useAfterSave, useFreshFingerprint } from "./settings-save";
import { useWords } from "./wording";

export function useSettingEdits() {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const fingerprint = useFreshFingerprint();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [edits, setEdits] = useState<Record<string, Draft>>({});
  const [problems, setProblems] = useState<Record<string, string>>({});
  const items = settings.data?.items ?? [];
  const item = (key: string): Item | undefined => items.find((i) => i.key === key);
  const draftOf = (it: Item): Draft => (it.key in edits ? edits[it.key] : toDraft(it));
  const edit = (key: string, draft: Draft) => {
    setEdits((all) => ({ ...all, [key]: draft }));
    setProblems((all) => (all[key] ? { ...all, [key]: "" } : all));
  };
  const forget = (key: string) =>
    setEdits((all) => {
      const next = { ...all };
      delete next[key];
      return next;
    });
  /** Saves values by key (or resets keys to their defaults) and reads it back; the problem, if any, is told on `key`. */
  const save = async (key: string, body: { changes?: Record<string, unknown>; reset?: string[] }, message?: string) => {
    setProblems((all) => ({ ...all, [key]: "" }));
    try {
      // One at a time: a change made while an earlier one is being saved is saved after it, on the fingerprint it answered with.
      await inOrder(async () => {
        const saved: S["SettingsSaved"] = await api.saveSettings({ changes: body.changes ?? {}, reset: body.reset ?? [], fingerprint: await fingerprint() });
        forget(key);
        await afterSave(saved, message ? { message } : {});
      });
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) void client.invalidateQueries({ queryKey: ["settings"] });
      setProblems((all) => ({
        ...all,
        [key]: err instanceof ApiError && err.status === 409 ? t("settings.changed_since_opened") : err instanceof ApiError && err.detail ? err.detail : problemText(err, t),
      }));
      return false;
    }
  };
  /** Saves what a control holds, unless it is what is saved already or can't be read yet. */
  const commit = async (it: Item, draft: Draft) => {
    const parsed = fromDraft(it, draft);
    if (!parsed.ok) return;
    const now = fromDraft(it, toDraft(it));
    if (now.ok && JSON.stringify(now.value) === JSON.stringify(parsed.value)) {
      forget(it.key);
      return;
    }
    await save(it.key, { changes: { [it.key]: parsed.value } });
  };
  const reset = (it: Item) => {
    forget(it.key);
    return save(it.key, { reset: [it.key] });
  };
  return { ready: settings.isSuccess, item, items, draftOf, edit, commit, reset, save, problems };
}
