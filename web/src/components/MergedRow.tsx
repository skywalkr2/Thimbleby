// One row that edits several settings at once (design 7.9): the working hours (days, start and end) and the times the brief
// shows. Each setting keeps its own key and is saved as it is changed, like any other row; the row reads as one sentence
// with a choice for each of them, so a person sees one thing to set instead of several.
import { Fragment, useId } from "react";
import { fromDraft, isChanged, labelOf, type Draft, type Item } from "../lib/settings";
import { useWords } from "../lib/wording";
import { ClampedHint } from "../ui/ClampedHint";
import { Select } from "../ui/Select";

/** The part of a key that names the setting inside its group, which a row's pattern refers to as `{name}`. */
const slotOf = (key: string) => key.slice(key.lastIndexOf(".") + 1);

export function MergedRow(props: {
  /** The row's name, which its wording is under (`settings.row.<id>`). */
  id: string;
  /** Its settings, in the order the pattern's choices are listed. */
  items: Item[];
  draftOf: (item: Item) => Draft;
  onChange: (key: string, draft: Draft) => void;
  commit: (item: Item, draft: Draft) => void;
  /** Puts the settings the person changed back to their defaults. */
  onReset: (items: Item[]) => void;
  problems: Record<string, string>;
}) {
  const { t, has } = useWords();
  const base = useId();
  const { items } = props;
  const label = t(`settings.row.${props.id}`);
  const changed = items.filter((item) => item.editable && !item.locked && isChanged(item, fromDraft(item, props.draftOf(item))));
  const problem = items.map((item) => props.problems[item.key]).find(Boolean);
  const locked = items.find((item) => item.locked);
  const option = (item: Item, o: string) => (has(`settings.option.${item.key}.${o}`) ? t(`settings.option.${item.key}.${o}`) : o);
  const control = (item: Item) => {
    const value = String(props.draftOf(item));
    // A value outside the list (set in a file) is kept on it, so a row never shows a value that is not the saved one.
    const listed = item.options ?? [];
    const options = listed.includes(value) || value === "" ? listed : [...listed, value];
    return (
      <Select
        key={item.key}
        id={`setting-${item.key}`}
        aria-label={labelOf(item, t, has)}
        aria-describedby={`${base}-hint${problem ? ` ${base}-problem` : ""}`}
        value={value}
        disabled={item.locked || !item.editable}
        onChange={(e) => {
          props.onChange(item.key, e.target.value);
          props.commit(item, e.target.value);
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {option(item, o)}
          </option>
        ))}
      </Select>
    );
  };
  const bySlot = new Map(items.map((item) => [slotOf(item.key), item]));
  const parts = t(`settings.row.${props.id}.pattern`).split(/\{(\w+)\}/);
  return (
    <div className="setting beside" data-key={items[0].key} role="group" aria-labelledby={`${base}-label`}>
      <div className="setting-main" data-main>
        <div className="setting-head">
          <span className="setting-label" id={`${base}-label`}>
            {label}
          </span>
          {changed.length > 0 && (
            <span className="setting-changed">
              <span>{t("settings.changed")}</span>
              <span aria-hidden="true"> · </span>
              <button type="button" className="link-button" aria-label={t("settings.reset_named", { label })} onClick={() => props.onReset(changed)}>
                {t("settings.reset")}
              </button>
            </span>
          )}
        </div>
        <div className="merged-controls">
          {parts.map((part, n) =>
            n % 2 === 1 && bySlot.has(part) ? <Fragment key={part}>{control(bySlot.get(part)!)}</Fragment> : part ? <span key={n}>{part}</span> : null,
          )}
        </div>
        {problem && (
          <p className="problem-note" id={`${base}-problem`} role="alert">
            {problem}
          </p>
        )}
        {locked && <p className="hint">{t(locked.source === "env" ? "settings.locked_env" : "settings.locked_flag")}</p>}
      </div>
      <div className="setting-help" data-help>
        <ClampedHint id={`${base}-hint`} text={t(`settings.row.${props.id}.hint`)} />
      </div>
    </div>
  );
}
