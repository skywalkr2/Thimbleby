// A time zone picked from one searchable list (design 7.8, 7.9): type to narrow it by city, region or offset ("Pacific",
// "UTC-8"), then choose "Los Angeles (Pacific time)". The setting holds the zone's id; the person only ever sees cities.
import { useId, useMemo, useState } from "react";
import { zoneChoices, zoneLabel, zoneOffset, zoneSearch } from "../lib/time-zones";
import { useWords } from "../lib/wording";

export function TimeZoneSelect(props: {
  id: string;
  value: string;
  /** The ids of the zones to offer. */
  options: string[];
  onChange: (id: string) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  const { t } = useWords();
  const listId = useId();
  const [typed, setTyped] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const all = useMemo(() => zoneChoices(props.options.includes(props.value) || !props.value ? props.options : [props.value, ...props.options]), [props.options, props.value]);
  const shown = typed === null ? all : zoneSearch(all, typed);
  // What was typed that is no place in the list stays on show, with what the zone still is, until it is changed or cleared.
  const [kept, setKept] = useState(false);
  const chosenLabel = props.value ? zoneLabel(props.value) : "";
  const pick = (id: string) => {
    props.onChange(id);
    setTyped(null);
    setKept(false);
    setOpen(false);
  };
  return (
    <div className="time-zone-select">
      <input
        id={props.id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        aria-describedby={props.describedBy}
        value={typed ?? chosenLabel}
        autoComplete="off"
        disabled={props.disabled}
        placeholder={t("timezone.find")}
        onFocus={(e) => {
          setOpen(true);
          e.currentTarget.select();
        }}
        // A click lands after the focus, and would put the caret back; select again so typing replaces the shown city.
        onClick={(e) => {
          if (typed === null) e.currentTarget.select();
        }}
        aria-invalid={kept || undefined}
        onBlur={() => {
          setOpen(false);
          const text = (typed ?? "").trim().toLowerCase();
          const exact = shown.filter((c) => c.label.toLowerCase() === text);
          if (text && exact.length === 1) {
            pick(exact[0].id);
          } else if (text) {
            setKept(true);
          } else {
            setTyped(null);
          }
        }}
        onChange={(e) => {
          setKept(false);
          setTyped(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive(Math.min(active + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive(Math.max(active - 1, 0));
          } else if (e.key === "Enter" && open && shown[active]) {
            e.preventDefault();
            pick(shown[active].id);
          } else if (e.key === "Escape") {
            setOpen(false);
            setKept(false);
            setTyped(null);
          }
        }}
      />
      {open && (
        <ul id={listId} role="listbox" aria-label={t("timezone.find")} className="time-zone-list">
          {shown.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={c.id === props.value}
              data-active={i === active || undefined}
              // Choosing before the input loses focus, so the list is still there to be clicked.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c.id);
              }}
            >
              {c.label}
              <span className="hint"> {zoneOffset(c.id)}</span>
            </li>
          ))}
        </ul>
      )}
      {open && typed !== null && typed.trim() !== "" && shown.length === 0 && (
        <p className="hint" role="status">
          {t("timezone.none")}
        </p>
      )}
      {kept && !open && typed !== null && (
        <p className="problem-note" role="alert">
          {t("timezone.kept", { typed: typed.trim(), zone: chosenLabel })}
        </p>
      )}
    </div>
  );
}
