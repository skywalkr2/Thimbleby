// A setting's help (design 7.9): shown in full unless it is genuinely long; a long one is four lines with "More" for the rest.
// A hint that fits is never clamped and has no button. The full text is always in the page, so a screen reader reads all of
// it and find-in-page finds it; "More" only opens the clamp.
import { useState } from "react";
import { useWords } from "../lib/wording";

/** Longer than about six lines of the help column: only a hint this long is clamped (to four lines). */
const WHOLE = 300;

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
