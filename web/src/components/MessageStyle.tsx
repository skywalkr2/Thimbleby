// Follow-ups, Message style (design 7.9): how the messages the person copies start and end, in a drawer opened from the header. Each line shows a live
// preview with a made-up name, and its pattern is behind "Edit the pattern", so the person reads what the message will say
// and not the marker where the first name goes. Each is saved as it is changed, with the same read-back and Undo as on Settings.
import { useId, useRef, useState } from "react";
import type { Item } from "../lib/settings";
import { useSettingEdits } from "../lib/use-setting-edits";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Drawer } from "../ui/Drawer";
const GREETING = "language.messages.greeting";
const CLOSING = "language.messages.closing";
const FIRST_NAME = "{first_name}";

/** The style of the messages, in a drawer opened from the screen's header (`open`); nothing is drawn while it is shut. */
export function MessageStyle(props: { open: boolean; onClose: () => void }) {
  const { t } = useWords();
  const edit = useSettingEdits();
  const greeting = edit.item(GREETING);
  const closing = edit.item(CLOSING);
  if (!props.open || !edit.ready || !greeting || !closing) return null;
  return (
    <Drawer
      open
      title={t("followups.style.title")}
      onClose={props.onClose}
      footer={
        <Button onClick={props.onClose}>
          {t("action.close")}
        </Button>
      }
    >
      <p className="hint">{t("followups.style.intro")}</p>
      <div className="settings-groups">
        {[greeting, closing].map((item) => (
          <StyleLine key={item.key} item={item} edit={edit} />
        ))}
      </div>
    </Drawer>
  );
}

function StyleLine(props: { item: Item; edit: ReturnType<typeof useSettingEdits> }) {
  const { t } = useWords();
  const { item, edit } = props;
  const [editing, setEditing] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const group = useRef<HTMLDivElement>(null);
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
          // The field and its button are one group: moving from one to the other keeps editing, and leaving both saves the line.
          <div
            ref={group}
            onBlur={(e) => {
              if (e.relatedTarget instanceof Node && group.current?.contains(e.relatedTarget)) return;
              void edit.commit(item, pattern);
              setEditing(false);
            }}
          >
            <input
              id={id}
              ref={field}
              type="text"
              autoFocus
              value={pattern}
              disabled={item.locked || !item.editable}
              aria-label={t("followups.style.pattern_named", { label: t(`settings.key.${item.key}`) })}
              aria-invalid={problem ? true : undefined}
              onChange={(e) => edit.edit(item.key, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />
            {/* The marker for the first name is put in by a button, so nobody types it. It keeps the cursor in the field. */}
            <div>
              <Button
                variant="quiet"
                size="sm"
                disabled={item.locked || !item.editable}
                aria-label={t("followups.style.insert_name_named", { label: t(`settings.key.${item.key}`) })}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const box = field.current;
                  const from = box?.selectionStart ?? pattern.length;
                  const to = box?.selectionEnd ?? pattern.length;
                  edit.edit(item.key, pattern.slice(0, from) + FIRST_NAME + pattern.slice(to));
                  window.setTimeout(() => box?.setSelectionRange(from + FIRST_NAME.length, from + FIRST_NAME.length), 0);
                }}
              >
                {t("followups.style.insert_name")}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="quiet" size="sm" disabled={item.locked || !item.editable} onClick={() => setEditing(true)}>
              {t("followups.style.edit")}
              <span className="sr"> {t(`settings.key.${item.key}`)}</span>
            </Button>
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
        {item.key === GREETING && (
          // What a message to someone on the own life opens with, said here so the style shown is never contradicted by a draft.
          <p className="hint" data-own-life-opening="">
            {changed ? t("followups.style.own_life_set") : t("followups.style.own_life_default", { example: t("greeting.relation.friend", { first_name: sample }) })}
          </p>
        )}
      </div>
    </div>
  );
}
