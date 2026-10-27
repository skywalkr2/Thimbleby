// Follow-ups, Message style (design 7.9): how the messages the person copies start and end. Each line shows a live
// preview with a made-up name, and its pattern is behind "Edit the pattern", so the person reads what the message will say
// and not the marker where the first name goes. Each is saved as it is changed, with the same read-back and Undo as on Settings.
import { useId, useState } from "react";
import type { Item } from "../lib/settings";
import { useSettingEdits } from "../lib/use-setting-edits";
import { useWords } from "../lib/wording";

const GREETING = "language.messages.greeting";
const CLOSING = "language.messages.closing";
const FIRST_NAME = "{first_name}";

export function MessageStyle() {
  const { t } = useWords();
  const edit = useSettingEdits();
  const greeting = edit.item(GREETING);
  const closing = edit.item(CLOSING);
  if (!edit.ready || !greeting || !closing) return null;
  return (
    <details className="more-options message-style">
      <summary>{t("followups.style.title")}</summary>
      <p className="hint">{t("followups.style.intro")}</p>
      <div className="settings-groups">
        {[greeting, closing].map((item) => (
          <StyleLine key={item.key} item={item} edit={edit} />
        ))}
      </div>
    </details>
  );
}

function StyleLine(props: { item: Item; edit: ReturnType<typeof useSettingEdits> }) {
  const { t } = useWords();
  const { item, edit } = props;
  const [editing, setEditing] = useState(false);
  const id = useId();
  const pattern = String(edit.draftOf(item));
  const sample = t("settings.owner_example_name").split(" ")[0];
  const preview = pattern.split(FIRST_NAME).join(sample);
  const changed = JSON.stringify(item.value) !== JSON.stringify(item.default);
  const problem = edit.problems[item.key];
  return (
    <div className="setting beside" data-key={item.key}>
      <div className="setting-main" data-main>
        <div className="setting-head">
          <span className="setting-label" id={`${id}-label`}>
            {t(`settings.key.${item.key}`)}
          </span>
          {changed && !item.locked && (
            <span className="setting-changed">
              <span>{t("settings.changed")}</span>
              <span aria-hidden="true"> · </span>
              <button type="button" className="link-button" aria-label={t("settings.reset_named", { label: t(`settings.key.${item.key}`) })} onClick={() => void edit.reset(item)}>
                {t("settings.reset")}
              </button>
            </span>
          )}
        </div>
        <p className="setting-value" aria-labelledby={`${id}-label`} aria-live="polite">
          {preview}
        </p>
        {editing ? (
          <input
            id={id}
            type="text"
            autoFocus
            value={pattern}
            disabled={item.locked || !item.editable}
            aria-label={t("followups.style.pattern_named", { label: t(`settings.key.${item.key}`) })}
            aria-invalid={problem ? true : undefined}
            onChange={(e) => edit.edit(item.key, e.target.value)}
            onBlur={(e) => {
              void edit.commit(item, e.target.value);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <div>
            <button type="button" className="btn quiet small" disabled={item.locked || !item.editable} onClick={() => setEditing(true)}>
              {t("followups.style.edit")}
              <span className="sr"> {t(`settings.key.${item.key}`)}</span>
            </button>
          </div>
        )}
        {problem && (
          <p className="problem-note" role="alert">
            {problem}
          </p>
        )}
      </div>
      <div className="setting-help" data-help>
        <p className="hint">{t(`followups.style.hint.${item.key === GREETING ? "greeting" : "closing"}`)}</p>
      </div>
    </div>
  );
}
