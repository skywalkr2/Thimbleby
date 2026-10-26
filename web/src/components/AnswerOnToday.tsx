// A decision or a question to the person is answered on Today's queue line, and acted on nowhere else (design 7.7, "One place to
// act"). Anywhere else it is shown, this link opens that line on Today, with the cursor on it.
import { revealOrKeep } from "../lib/reveal";
import { toHash, viewHref } from "../lib/views";
import { useWords } from "../lib/wording";

/** Opens the question's line on Today: when Today is showing, its list opens the line; from another screen, Today opens and
 * does. */
export function openOnToday(question: string): void {
  if (!revealOrKeep("question", question)) window.location.hash = toHash("today");
}

/** The link to a question's line on Today. A modified click (a new tab) keeps the link's own address. */
export function AnswerOnToday(props: { question: string; describedBy?: string }) {
  const { t } = useWords();
  return (
    <a
      className="link-button"
      href={viewHref("today")}
      aria-describedby={props.describedBy}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openOnToday(props.question);
      }}
    >
      {t("followups.answer_on_today")}
    </a>
  );
}
