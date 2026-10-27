// The settings screens' test data: a setting item with every field the server sends, and a fake server that keeps the
// values, answers a save with what changed and a new fingerprint, and refuses a save made on an old fingerprint.
import type { S } from "./api";
import { Refuse, fakeApi } from "../test-utils";

export function settingItem(key: string, extra: Partial<S["SettingItem"]> = {}): S["SettingItem"] {
  return {
    key,
    file: key.split(".")[0],
    group: key.split(".").slice(0, 2).join("."),
    description: `What ${key} does`,
    type: "text",
    options: [],
    value: "",
    default: "",
    source: "default",
    locked: false,
    basic: false,
    editable: true,
    page: null,
    topic: null,
    ...extra,
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");

export function fakeSettings(items: S["SettingItem"][], extra: Record<string, (body: unknown) => unknown> = {}) {
  let n = 1;
  const state = items.map((i) => ({ ...i }));
  return fakeApi({
    "GET settings": () => ({ fingerprint: `fp-${n}`, items: state }),
    ...extra,
    "POST settings": (body) => {
      const sent = body as S["SettingsSave"];
      if (sent.fingerprint !== `fp-${n}`) return new Refuse(409, "The settings changed since you opened them. Look again, then save.");
      const changes: S["SettingChangeView"][] = [];
      const set = (key: string, after: unknown) => {
        const at = state.find((i) => i.key === key)!;
        changes.push({ key, before: at.value, after, was_default: same(at.value, at.default), is_default: same(after, at.default) });
        at.value = after;
        at.source = "file";
      };
      for (const [key, after] of Object.entries(sent.changes ?? {})) set(key, after);
      for (const key of sent.reset ?? []) set(key, state.find((i) => i.key === key)!.default);
      n += 1;
      return { changes, fingerprint: `fp-${n}`, needs_restart: false };
    },
  });
}
