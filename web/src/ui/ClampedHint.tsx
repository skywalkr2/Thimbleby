// A setting's help (design 7.9): two lines, with "More" for the rest. A short hint is shown whole with no button. The full text
// is always in the page, so a screen reader reads all of it and find-in-page finds it; "More" only opens the clamp.
import { useState } from "react";
import { useWords } from "../lib/wording";

/** About two lines of the help column; a hint shorter than this is never clamped. */
const WHOLE = 150;

export function ClampedHint(props: { id?: string; text: string }) {
  const { t } = useWords();
  const [open, setOpen] = useState(false);
  const long = props.text.length > WHOLE;
  return (
    <>
      <p className={long && !open ? "hint clamped" : "hint"} id={props.id}>
        {props.text}
      </p>
      {long && (
        <button type="button" className="link-button hint-more" aria-expanded={open} aria-controls={props.id} onClick={() => setOpen(!open)}>
          {t(open ? "settings.hint.less" : "settings.hint.more")}
        </button>
      )}
    </>
  );
}
