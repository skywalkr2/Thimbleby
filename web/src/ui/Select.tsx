// The one list to pick from (design 7.12): a button that shows the choice and opens a listbox, drawn in the app's look (the
// WAI-ARIA select-only combobox pattern). Arrows, Home, End and Page Up and Down move through the list, typing a few letters
// jumps to the choice that starts with them, Enter picks, Escape closes and the cursor goes back to the button. A long list
// (more than `LONG_LIST` choices) has a filter box at the top, as the time-zone list does: type to narrow it, Enter picks the
// first match. A field with a known set of values is always a Select, never a box to type in.
// It keeps the props of the browser's select, so a caller writes the same thing: `<option>` and `<optgroup>` children,
// `value` or `defaultValue`, and `onChange` that reads `e.target.value`. Give it an id and a label (FormField), or a name of
// its own (`aria-label`). A choice with no match in the list shows the first one, as the browser's select does.
import { Children, Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode, type Ref } from "react";
import { Popover as AriaPopover } from "react-aria-components";
import { useWords } from "../lib/wording";
import { contained } from "./containEvents";
import groupStyles from "./GroupLabel.module.css";
import { Icon } from "./Icon";
import styles from "./Select.module.css";

/** How many choices a list may hold before it gets a filter box. */
export const LONG_LIST = 12;

/** What `onChange` is given: the chosen value, under the names a select's change event has them. */
export interface SelectChange {
  target: { value: string; name: string; id: string };
  currentTarget: { value: string; name: string; id: string };
}

export interface SelectProps {
  id?: string;
  name?: string;
  className?: string;
  value?: string | number;
  defaultValue?: string | number;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  title?: string;
  /** Give a filter box to a list: always (`true`), never (`false`), or when it is long (left out). */
  filter?: boolean;
  children?: ReactNode;
  onChange?: (event: SelectChange) => void;
  /** Called when the cursor leaves the control, but not while it is in the list the control opened. */
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

interface Choice {
  value: string;
  label: string;
  disabled: boolean;
  group: string | null;
}

/** The words of a node, for the text of a choice. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement(node)) return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  return "";
}

/** The choices an `<option>` list holds, in order, with the group each belongs to. */
function choicesOf(children: ReactNode, group: string | null = null, out: Choice[] = []): Choice[] {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{ children?: ReactNode; value?: string | number; label?: string; disabled?: boolean }>;
    if (el.type === Fragment) choicesOf(el.props.children, group, out);
    else if (el.type === "optgroup") choicesOf(el.props.children, el.props.label ?? "", out);
    else if (el.type === "option") {
      const label = textOf(el.props.children);
      out.push({ value: el.props.value === undefined ? label : String(el.props.value), label, disabled: !!el.props.disabled, group });
    }
  });
  return out;
}

const keepInView = (el: HTMLElement | null) => el?.scrollIntoView?.({ block: "nearest" });

const fold = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Every word typed is somewhere in the choice's words. */
function matches(choice: Choice, typed: string): boolean {
  const words = fold(typed).split(/\s+/).filter(Boolean);
  const hay = fold(choice.label);
  return words.every((w) => hay.includes(w));
}

export function Select(props: SelectProps) {
  const { id, name, className, value, defaultValue, disabled, required, autoFocus, title, filter, children, onChange, onBlur, onFocus, ref } = props;
  const { t } = useWords();
  const choices = useMemo(() => choicesOf(children), [children]);
  const [own, setOwn] = useState<string>(defaultValue === undefined ? "" : String(defaultValue));
  const held = value === undefined ? own : String(value);
  const picked = choices.find((c) => c.value === held) ?? choices[0];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);
  const listOpen = useRef(false);
  const giveBack = useRef(false);
  const listBox = useRef<HTMLUListElement | null>(null);
  const filterBox = useRef<HTMLInputElement | null>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();
  const withFilter = filter ?? choices.length > LONG_LIST;
  const shown = query.trim() ? choices.filter((c) => matches(c, query)) : choices;
  const enabled = shown.filter((c) => !c.disabled);
  // The choices in runs of one group, in order; while the list is filtered the headings go and every choice stands alone.
  const runs: Array<{ group: string | null; choices: Choice[] }> = [];
  for (const c of shown) {
    const group = query.trim() || c.group === "" ? null : c.group;
    const last = runs.at(-1);
    if (last && last.group === group && group !== null) last.choices.push(c);
    else if (last && group === null && last.group === null) last.choices.push(c);
    else runs.push({ group, choices: [c] });
  }
  const activeChoice = shown.find((c) => c.value === active && !c.disabled) ?? null;
  const [label, setLabel] = useState<string | undefined>(undefined);

  const setButton = (el: HTMLButtonElement | null) => {
    button.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as { current: HTMLButtonElement | null }).current = el;
  };
  const openList = (start?: string | null) => {
    if (disabled) return;
    setQuery("");
    // The list is named as its control is: by its own name, or by the label that points at it.
    setLabel(props["aria-label"] ?? (id ? (Array.from(document.getElementsByTagName("label")).find((l) => l.htmlFor === id)?.textContent?.replace(/\s+/g, " ").trim() ?? undefined) : undefined));
    const from = start === undefined ? picked?.value : start;
    setActive(from !== null && from !== undefined && choices.some((c) => c.value === from && !c.disabled) ? from : (choices.find((c) => !c.disabled)?.value ?? null));
    listOpen.current = true;
    typed.current = { text: "", at: 0 };
    setOpen(true);
  };
  const close = () => {
    listOpen.current = false;
    typed.current = { text: "", at: 0 };
    setOpen(false);
    setQuery("");
    // The cursor goes back to the button once the list is gone: the open list holds the cursor in itself until then.
    giveBack.current = true;
  };
  // The cursor goes into the list (or its filter box) once the list is on the page and its focus scope is in place: an overlay that
  // holds this one would otherwise see the cursor leave and close itself.
  useEffect(() => {
    if (open) (filterBox.current ?? listBox.current)?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open && giveBack.current) {
      giveBack.current = false;
      // Not when the choice has already sent the cursor somewhere (a field it opened): that one keeps it.
      const now = document.activeElement;
      if (!now || now === document.body || now === button.current || now.closest("[data-select-panel]")) button.current?.focus();
    }
  }, [open]);
  const choose = (choice: Choice) => {
    if (choice.disabled) return;
    if (value === undefined) setOwn(choice.value);
    const who = { value: choice.value, name: name ?? "", id: id ?? "" };
    if (choice.value !== held) onChange?.({ target: who, currentTarget: who });
    close();
  };
  const move = (to: Choice | undefined) => {
    if (to) setActive(to.value);
  };
  const step = (by: number) => {
    if (enabled.length === 0) return;
    const at = enabled.findIndex((c) => c.value === activeChoice?.value);
    move(enabled[Math.min(enabled.length - 1, Math.max(0, at < 0 ? (by > 0 ? 0 : enabled.length - 1) : at + by))]);
  };
  /** Typing letters on a list with no filter box jumps to the next choice that starts with them. */
  const jump = (key: string, from: string | null): string | null => {
    const now = Date.now();
    const text = now - typed.current.at > 700 ? key : typed.current.text + key;
    typed.current = { text, at: now };
    const wanted = fold(text);
    const same = [...wanted].every((c) => c === wanted[0]);
    const pool = enabled.filter((c) => fold(c.label).startsWith(same ? wanted[0] : wanted));
    if (pool.length === 0) return null;
    if (!same) return pool[0].value;
    const after = pool.findIndex((c) => c.value === from);
    return pool[(after + 1) % pool.length].value;
  };
  const onListKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      step(-1);
    } else if (e.key === "PageDown") {
      e.preventDefault();
      step(10);
    } else if (e.key === "PageUp") {
      e.preventDefault();
      step(-10);
    } else if (e.key === "Home" && !withFilter) {
      e.preventDefault();
      move(enabled[0]);
    } else if (e.key === "End" && !withFilter) {
      e.preventDefault();
      move(enabled[enabled.length - 1]);
    } else if (e.key === "Enter" || (e.key === " " && !withFilter)) {
      e.preventDefault();
      const target = activeChoice ?? (withFilter ? enabled[0] : undefined);
      if (target) choose(target);
    } else if (e.key === "Tab") {
      // The cursor goes back to the button; the next press of Tab moves on from there.
      e.preventDefault();
      close();
    } else if (!withFilter && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const found = jump(e.key, activeChoice?.value ?? null);
      if (found) setActive(found);
    }
  };
  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    props.onKeyDown?.(e);
    if (disabled || e.defaultPrevented) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openList();
    } else if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const found = jump(e.key, picked?.value ?? null);
      openList(found ?? undefined);
    }
  };
  const optionId = (c: Choice) => `${listId}-${choices.indexOf(c)}`;

  const control = (
    <button
      ref={setButton}
      id={id}
      name={name}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      aria-describedby={props["aria-describedby"]}
      aria-invalid={props["aria-invalid"]}
      aria-required={required || undefined}
      value={picked?.value ?? ""}
      title={title}
      disabled={disabled}
      autoFocus={autoFocus}
      data-ui="select"
      className={[styles.select, className ?? ""].filter(Boolean).join(" ")}
      onClick={() => (open ? close() : openList())}
      onKeyDown={onButtonKey}
      onBlur={() => {
        // The cursor moves into the list as it opens, and back as it closes: neither is leaving the control.
        if (!listOpen.current) onBlur?.();
      }}
      onFocus={onFocus}
    >
      <span className={styles.value}>{picked?.label ?? ""}</span>
    </button>
  );
  return (
    <>
      {required ? (
        // A form that needs a choice is stopped by the browser as it was by a select: a text box under the button, hidden from
        // the screen, is empty until a choice is made. It sends the cursor to the button when the browser points at it.
        <span className={styles.guard}>
          {control}
          <input type="text" required disabled={disabled} tabIndex={-1} aria-hidden="true" readOnly className={styles.guarded} value={picked?.value ?? ""} onFocus={() => button.current?.focus()} />
        </span>
      ) : (
        control
      )}
      <AriaPopover triggerRef={button} isOpen={open} onOpenChange={(next) => (next ? setOpen(true) : close())} placement="bottom start" offset={4} className={styles.popover}>
        <div className={styles.panel} data-select-panel="" {...contained}>
          {withFilter && (
            <input
              ref={filterBox}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeChoice ? optionId(activeChoice) : undefined}
              aria-label={t("select.filter")}
              placeholder={t("select.filter")}
              autoComplete="off"
              className={styles.filter}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                const first = choices.filter((c) => !c.disabled && matches(c, e.target.value))[0];
                setActive(first?.value ?? null);
              }}
              onKeyDown={onListKey}
            />
          )}
          <ul
            ref={listBox}
            id={listId}
            role="listbox"
            aria-label={label}
            tabIndex={withFilter ? undefined : -1}
            aria-activedescendant={!withFilter && activeChoice ? optionId(activeChoice) : undefined}
            className={styles.list}
            onKeyDown={withFilter ? undefined : onListKey}
          >
            {runs.map((run, r) => {
              const options = run.choices.map((c) => (
                <li
                  key={c.value + choices.indexOf(c)}
                  id={optionId(c)}
                  role="option"
                  aria-selected={c.value === picked?.value}
                  aria-disabled={c.disabled || undefined}
                  data-active={c.value === activeChoice?.value ? "" : undefined}
                  data-value={c.value}
                  className={styles.option}
                  ref={c.value === activeChoice?.value ? keepInView : undefined}
                  // The press lands before the box loses the cursor, so the list is still there to be clicked.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseMove={() => !c.disabled && c.value !== active && setActive(c.value)}
                  onClick={() => choose(c)}
                >
                  <span className={styles.check}>{c.value === picked?.value && <Icon name="check" size={16} />}</span>
                  <span className={styles.text}>{c.label}</span>
                </li>
              ));
              // A group of choices is a group with its own heading (a filtered list has no headings: its choices stand alone).
              return run.group ? (
                <li key={`${r}-${run.group}`} role="presentation">
                  <span id={`${listId}-g${r}`} className={`${groupStyles.label} ${styles.group}`}>
                    {run.group}
                  </span>
                  <ul role="group" aria-labelledby={`${listId}-g${r}`} className={styles.run}>
                    {options}
                  </ul>
                </li>
              ) : (
                <Fragment key={`${r}-run`}>{options}</Fragment>
              );
            })}
          </ul>
          {shown.length === 0 && (
            <p className={styles.none} role="status">
              {t("select.none")}
            </p>
          )}
        </div>
      </AriaPopover>
    </>
  );
}
