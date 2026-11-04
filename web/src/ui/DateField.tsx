// A date, a time or a date with a time (design 7.12), drawn in the app's look and the same in every browser. A date is a text
// box that reads what a person types in their locale (numbers in its order, a month name, "tomorrow") and shows the day through the app's
// date formatter, with a calendar button that opens a month grid (the WAI-ARIA date picker dialog: arrows move by a day or a
// week, Page Up and Down by a month, Home and End to the week's edges, Enter picks, Escape closes and the cursor goes back to
// the button). The week starts on the person's day, and the days they don't work are underlined. A time is a TimeField, and a
// date with a time is the two side by side. The value in and out is the ISO text the callers hold ("yyyy-mm-dd", "hh:mm",
// "yyyy-mm-ddThh:mm"), so nothing a caller stores changes. `kind` says which one it is.
import { getDayOfWeek, parseDate } from "@internationalized/date";
import { useContext, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { Button as AriaButton, Calendar, CalendarCell, CalendarGrid, CalendarStateContext, useLocale, CalendarGridBody, CalendarGridHeader, CalendarHeaderCell, Dialog, Heading, I18nProvider, Popover as AriaPopover } from "react-aria-components";
import { useDatePrefs } from "../lib/date-prefs";
import { parseDay } from "../lib/date-input";
import { fieldDay, todayOn } from "../lib/dates";
import { useWords } from "../lib/wording";
import { contained } from "./containEvents";
import { Icon } from "./Icon";
import { TimeField, type FieldChange } from "./TimeField";
import styles from "./DateField.module.css";

export type { FieldChange } from "./TimeField";

export interface DateFieldProps {
  id?: string;
  name?: string;
  className?: string;
  /** A day, a time of day, or a day and a time, as ISO text. */
  value?: string;
  defaultValue?: string;
  kind?: "date" | "time" | "datetime-local";
  /** What an empty time box says instead of an example time. */
  placeholder?: string;
  /** The first and the last day that can be chosen (a day, as ISO text). */
  min?: string;
  max?: string;
  /** Days the person doesn't work, beyond the weekly ones the schedule knows: marked in the calendar. */
  daysOff?: string[];
  /** The minutes between the times offered in a time list. */
  step?: number;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange?: (event: FieldChange) => void;
  onBlur?: () => void;
  ref?: Ref<HTMLInputElement>;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
/** A date that is whole as typed (a year of four digits), so it is taken as the text is typed rather than when the box is left. */
const WHOLE = /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4})$/;

export function DateField(props: DateFieldProps) {
  const { kind = "date" } = props;
  if (kind === "time") return <TimeField placeholder={props.placeholder} id={props.id} name={props.name} className={props.className} value={props.value} defaultValue={props.defaultValue} step={props.step} required={props.required} disabled={props.disabled} autoFocus={props.autoFocus} onChange={props.onChange} onBlur={props.onBlur} ref={props.ref} aria-label={props["aria-label"]} aria-describedby={props["aria-describedby"]} aria-invalid={props["aria-invalid"]} />;
  if (kind === "datetime-local") return <DayAndTime {...props} />;
  return <Day {...props} />;
}

/** A day and a time of day side by side. The value is whole only when both are chosen; until then the part chosen stays shown. */
function DayAndTime(props: DateFieldProps) {
  const { id, name, className, value, defaultValue, onChange, step, required, disabled, autoFocus, ref } = props;
  const { t } = useWords();
  const split = (v: string | undefined) => ({ day: v ? v.slice(0, 10) : "", time: v && v.length >= 16 ? v.slice(11, 16) : "" });
  const compose = (p: { day: string; time: string }) => (p.day && p.time ? `${p.day}T${p.time}` : "");
  const [own, setOwn] = useState(defaultValue ?? "");
  const held = value === undefined ? own : value;
  const [parts, setParts] = useState(split(held));
  const [seen, setSeen] = useState(held);
  // A value that comes from outside replaces what is shown; one this box just sent (or the half of one) doesn't.
  if (held !== seen) {
    setSeen(held);
    if (compose(parts) !== held) setParts(split(held));
  }
  const send = (next: { day: string; time: string }) => {
    setParts(next);
    const whole = compose(next);
    setSeen(whole);
    if (value === undefined) setOwn(whole);
    if (whole !== held) onChange?.({ target: { value: whole, name: name ?? "", id: id ?? "" }, currentTarget: { value: whole, name: name ?? "", id: id ?? "" } });
  };
  return (
    <div className={[styles.both, className ?? ""].filter(Boolean).join(" ")} data-ui="datetime">
      <Day
        id={id}
        value={parts.day}
        min={props.min}
        max={props.max}
        daysOff={props.daysOff}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        ref={ref}
        aria-describedby={props["aria-describedby"]}
        aria-label={props["aria-label"]}
        onChange={(e) => send({ ...parts, day: e.target.value })}
        onBlur={props.onBlur}
      />
      <TimeField value={parts.time} step={step} required={required} disabled={disabled} aria-label={t("datefield.time")} onChange={(e) => send({ ...parts, time: e.target.value })} />
    </div>
  );
}

/** Home and End go to the first and last day of the week the cursor is in (the calendar's own go to the month's); the week is the
 * one the calendar draws, so it starts on the day the person's week does. */
function WeekEdges(props: { firstDay: (typeof WEEK)[number]; children: ReactNode }) {
  const state = useContext(CalendarStateContext);
  const { locale } = useLocale();
  return (
    <div
      onKeyDownCapture={(e) => {
        if ((e.key !== "Home" && e.key !== "End") || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || !state) return;
        e.preventDefault();
        e.stopPropagation();
        const first = state.focusedDate.subtract({ days: getDayOfWeek(state.focusedDate, locale, props.firstDay) });
        state.setFocusedDate(e.key === "Home" ? first : first.add({ days: 6 }));
      }}
    >
      {props.children}
    </div>
  );
}

/** One day: the text box, the calendar button and the calendar. */
function Day(props: DateFieldProps) {
  const { id, name, className, value, defaultValue, min, max, daysOff, required, disabled, autoFocus, onChange, onBlur, ref } = props;
  const { t, locale } = useWords();
  const [own, setOwn] = useState(defaultValue ?? "");
  const held = value === undefined ? own : value.slice(0, 10);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState<"invalid" | null>(null);
  const [named, setNamed] = useState<string | undefined>(undefined);
  const wrap = useRef<HTMLDivElement | null>(null);
  const button = useRef<HTMLButtonElement | null>(null);
  const prefs = useDatePrefs(open, locale);
  const helpId = `${id ?? "date"}-help`;
  const today = todayOn(new Date());
  const lowest = min ? min.slice(0, 10) : null;
  const highest = max ? max.slice(0, 10) : null;
  const words = { today: t("datefield.today"), tomorrow: t("datefield.tomorrow"), yesterday: t("datefield.yesterday") };
  const who = (v: string) => ({ value: v, name: name ?? "", id: id ?? "" });
  const inRange = (iso: string) => (!lowest || iso >= lowest) && (!highest || iso <= highest);

  // The calendar button is named for the field it belongs to, so a form with several says which one each opens.
  useEffect(() => {
    if (!id) return;
    const found = Array.from(document.getElementsByTagName("label")).find((l) => l.htmlFor === id);
    setNamed(found?.textContent?.replace(/\s+/g, " ").trim() || undefined);
  }, [id]);

  const input = useRef<HTMLInputElement | null>(null);
  const setBox = (el: HTMLInputElement | null) => {
    input.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as { current: HTMLInputElement | null }).current = el;
  };
  const send = (v: string) => {
    if (value === undefined) setOwn(v);
    if (v !== held) onChange?.({ target: who(v), currentTarget: who(v) });
  };
  const apply = (text: string, final: boolean): boolean => {
    const trimmed = text.trim();
    if (!trimmed) {
      if (final || held) send("");
      setProblem(null);
      return true;
    }
    const parsed = parseDay(trimmed, { today, locale, words });
    if (!parsed) {
      if (final) setProblem("invalid");
      return false;
    }
    // A day outside the first and last day is handed on as typed, as the browser's date box did: the caller says what it makes of
    // it, and the box can't be submitted in a form while it holds one (the calendar greys those days out).
    send(parsed);
    setProblem(null);
    return true;
  };
  const commit = () => {
    if (draft === null) return;
    if (apply(draft, true)) setDraft(null);
  };
  // The cursor goes back to the calendar button once the calendar is gone: the open one holds it until then.
  const giveBack = useRef(false);
  useEffect(() => {
    if (!open && giveBack.current) {
      giveBack.current = false;
      // Not when the choice has already sent the cursor somewhere (a field it opened): that one keeps it.
      const now = document.activeElement;
      if (!now || now === document.body || now === button.current || now.closest(`.${styles.dialog}`)) button.current?.focus();
    }
  }, [open]);
  const closeCalendar = () => {
    giveBack.current = true;
    setOpen(false);
  };
  const pick = (iso: string) => {
    send(iso);
    setDraft(null);
    setProblem(null);
    closeCalendar();
  };
  useEffect(() => {
    input.current?.setCustomValidity(held && !inRange(held) ? t("datefield.out_of_range") : "");
  });
  const isOff = (iso: string) => {
    if (daysOff?.includes(iso)) return true;
    if (!prefs.workDays) return false;
    const [y, m, d] = iso.split("-").map(Number);
    return !prefs.workDays.includes((new Date(y, m - 1, d).getDay() + 6) % 7);
  };
  const anyOff = !!daysOff?.length || (prefs.workDays !== null && prefs.workDays.length < 7);
  const shown = draft ?? fieldDay(held, locale);
  const example = fieldDay(today, locale);
  const calendar = (
    <Calendar
      aria-label={t("datefield.calendar")}
      autoFocus
      value={held ? parseDate(held) : null}
      defaultFocusedValue={parseDate(held || (lowest && today < lowest ? lowest : highest && today > highest ? highest : today))}
      minValue={lowest ? parseDate(lowest) : undefined}
      maxValue={highest ? parseDate(highest) : undefined}
      firstDayOfWeek={WEEK[prefs.weekStartsOn]}
      onChange={(d) => pick(d.toString())}
      className={styles.calendar}
    >
      <header className={styles.head}>
        <AriaButton slot="previous" className={`${styles.step} ${styles.back}`}>
          <Icon name="chevron" size={16} />
        </AriaButton>
        <Heading className={styles.title} />
        <AriaButton slot="next" className={styles.step}>
          <Icon name="chevron" size={16} />
        </AriaButton>
      </header>
      <WeekEdges firstDay={WEEK[prefs.weekStartsOn]}>
      <CalendarGrid className={styles.grid}>
        <CalendarGridHeader>{(name) => <CalendarHeaderCell className={styles.weekday}>{name}</CalendarHeaderCell>}</CalendarGridHeader>
        <CalendarGridBody>
          {(date) => {
            const iso = date.toString();
            return <CalendarCell date={date} className={styles.cell} data-today={iso === today ? "" : undefined} data-off={isOff(iso) ? "" : undefined} />;
          }}
        </CalendarGridBody>
      </CalendarGrid>
      </WeekEdges>
      {anyOff && <p className={styles.legend}>{t("datefield.off_legend")}</p>}
    </Calendar>
  );

  return (
    <div className={[styles.wrap, className ?? ""].filter(Boolean).join(" ")} data-ui="date-wrap">
      <div className={styles.row} ref={wrap}>
        <input
          ref={setBox}
          id={id}
          name={name}
          type="text"
          autoComplete="off"
          aria-describedby={[props["aria-describedby"], problem ? helpId : ""].filter(Boolean).join(" ") || undefined}
          aria-label={props["aria-label"]}
          aria-invalid={problem !== null || props["aria-invalid"] || undefined}
          required={required}
          autoFocus={autoFocus}
          disabled={disabled}
          data-ui="date"
          data-kind="date"
          className={styles.input}
          value={shown}
          placeholder={example}
          onChange={(e) => {
            setDraft(e.target.value);
            setProblem(null);
            // A date that is whole as typed is taken as it is typed; the rest is read when the box is left or Enter is pressed.
            if (WHOLE.test(e.target.value.trim())) apply(e.target.value, false);
            else if (e.target.value.trim() === "" && held) send("");
          }}
          onBlur={() => {
            commit();
            onBlur?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            else if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <button
          ref={button}
          type="button"
          className={styles.open}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={named ? t("datefield.open_for", { label: named }) : t("datefield.open")}
          onClick={() => setOpen(!open)}
        >
          <Icon name="calendar" size={18} />
        </button>
      </div>
      <AriaPopover triggerRef={wrap} isOpen={open} onOpenChange={(next) => (next ? setOpen(true) : closeCalendar())} placement="bottom start" offset={4} className={styles.popover}>
        <Dialog aria-label={t("datefield.calendar")} className={styles.dialog} {...contained}>
          {locale ? <I18nProvider locale={locale}>{calendar}</I18nProvider> : calendar}
        </Dialog>
      </AriaPopover>
      {problem && (
        <p id={helpId} className={`problem-note ${styles.problem}`} role="alert">
          {t("datefield.invalid", { example })}
        </p>
      )}
    </div>
  );
}

