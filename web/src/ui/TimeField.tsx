// A time of day (design 7.12): a text box that reads what a person types ("9", "9:30", "930", "9:30 pm", "21:30") and shows
// the time the way their computer writes it (12-hour or 24-hour), with a list of times at a step to pick from (the WAI-ARIA
// combobox pattern: the cursor stays in the box, the arrows move through the list, Enter picks, Escape closes the list).
// The value in and out is "HH:MM" on the 24-hour clock, whatever is shown.
import { useId, useMemo, useRef, useState, type KeyboardEvent, type Ref } from "react";
import { Popover as AriaPopover } from "react-aria-components";
import { parseTime, timesOfDay } from "../lib/date-input";
import { timeOfDay, timeStep } from "../lib/dates";
import { useWords } from "../lib/wording";
import { contained } from "./containEvents";
import { Icon } from "./Icon";
import styles from "./TimeField.module.css";

/** What a date or time box passes to `onChange`: the value, under the names a change event has them. */
export interface FieldChange {
  target: { value: string; name: string; id: string };
  currentTarget: { value: string; name: string; id: string };
}

export interface TimeFieldProps {
  id?: string;
  name?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: FieldChange) => void;
  /** The minutes between the times in the list; the setting's when a field names none. */
  step?: number;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement>;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

export function TimeField(props: TimeFieldProps) {
  const { id, name, className, value, defaultValue, onChange, step: stepGiven, required, disabled, autoFocus, onBlur, ref } = props;
  const { t, locale } = useWords();
  // The minutes between the times offered are the setting's (`ui.time_step`), unless a field names its own.
  const step = stepGiven ?? timeStep();
  const [own, setOwn] = useState(defaultValue ?? "");
  const held = value === undefined ? own : value;
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [problem, setProblem] = useState(false);
  const box = useRef<HTMLInputElement | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);
  const listId = useId();
  const helpId = useId();
  const times = useMemo(() => timesOfDay(step), [step]);
  // A time held that falls between the steps (09:20 at a quarter hour) is still listed, in its place.
  const listed = useMemo(() => (held && !times.includes(held) ? [...times, held].sort() : times), [times, held]);
  const shownText = draft ?? timeOfDay(held, locale);
  const who = (v: string) => ({ value: v, name: name ?? "", id: id ?? "" });

  const setBox = (el: HTMLInputElement | null) => {
    box.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as { current: HTMLInputElement | null }).current = el;
  };
  const send = (v: string) => {
    if (value === undefined) setOwn(v);
    if (v !== held) onChange?.({ target: who(v), currentTarget: who(v) });
  };
  /** The typed text becomes the time: said back in the person's clock, or flagged when it can't be read. */
  const commit = () => {
    if (draft === null) return true;
    const text = draft.trim();
    if (!text) {
      send("");
      setDraft(null);
      setProblem(false);
      return true;
    }
    const parsed = parseTime(text);
    if (!parsed) {
      setProblem(true);
      return false;
    }
    send(parsed);
    setDraft(null);
    setProblem(false);
    return true;
  };
  const pick = (v: string) => {
    send(v);
    setDraft(null);
    setProblem(false);
    setOpen(false);
    box.current?.focus();
  };
  const show = () => {
    if (disabled) return;
    setActive(held && listed.includes(held) ? held : (listed.find((x) => x >= (held || "09:00")) ?? listed[0] ?? null));
    setOpen(true);
  };
  const move = (by: number) => {
    if (!open) return show();
    const at = listed.indexOf(active ?? "");
    setActive(listed[Math.min(listed.length - 1, Math.max(0, at < 0 ? 0 : at + by))] ?? null);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "PageDown" && open) {
      e.preventDefault();
      move(8);
    } else if (e.key === "PageUp" && open) {
      e.preventDefault();
      move(-8);
    } else if (e.key === "Enter") {
      if (open && active && draft === null) {
        e.preventDefault();
        pick(active);
      } else {
        commit();
        setOpen(false);
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };
  const example = timeOfDay("09:30", locale);

  return (
    <div className={[styles.wrap, className ?? ""].filter(Boolean).join(" ")} ref={wrap} data-ui="time-wrap">
      <div className={styles.row}>
        <input
          ref={setBox}
          id={id}
          name={name}
          type="text"
          role="combobox"
          inputMode="text"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={open && active ? `${listId}-${active.replace(":", "")}` : undefined}
          aria-label={props["aria-label"]}
          aria-describedby={[props["aria-describedby"], problem ? helpId : ""].filter(Boolean).join(" ") || undefined}
          aria-invalid={problem || props["aria-invalid"] || undefined}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          data-ui="date"
          data-kind="time"
          className={styles.input}
          value={shownText}
          placeholder={example}
          onChange={(e) => {
            setDraft(e.target.value);
            setProblem(false);
            const parsed = parseTime(e.target.value);
            if (parsed && open) setActive(listed.find((x) => x >= parsed) ?? parsed);
          }}
          onBlur={() => {
            setOpen(false);
            commit();
            onBlur?.();
          }}
          onClick={() => !open && show()}
          onKeyDown={onKey}
        />
        <button type="button" tabIndex={-1} className={styles.open} disabled={disabled} aria-label={t("timefield.open")} aria-hidden="true" onMouseDown={(e) => e.preventDefault()} onClick={() => (open ? setOpen(false) : (box.current?.focus(), show()))}>
          <Icon name="chevron-down" size={16} />
        </button>
      </div>
      <AriaPopover triggerRef={wrap} isOpen={open} isNonModal onOpenChange={setOpen} placement="bottom start" offset={4} className={styles.popover}>
        <ul id={listId} role="listbox" aria-label={t("timefield.list")} className={styles.list} {...contained}>
          {listed.map((v) => (
            <li
              key={v}
              id={`${listId}-${v.replace(":", "")}`}
              role="option"
              aria-selected={v === held}
              data-active={v === active ? "" : undefined}
              data-value={v}
              className={styles.option}
              ref={v === active ? keepInView : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(v)}
            >
              {timeOfDay(v, locale)}
            </li>
          ))}
        </ul>
      </AriaPopover>
      {problem && (
        <p id={helpId} className={`problem-note ${styles.problem}`} role="alert">
          {t("timefield.invalid", { example })}
        </p>
      )}
    </div>
  );
}

const keepInView = (el: HTMLElement | null) => el?.scrollIntoView?.({ block: "nearest" });
