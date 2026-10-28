// What happened at a calendar entry (design 6.32, 7.14): a short box for the person's own words, on Today's line and on the
// entry's page. The words are handed in like any note typed on a record, so the promises, questions and facts in them are
// found for the person to review; "Nothing to note" ends the question with no run, and Undo asks it again. The cursor starts in the box, Enter
// saves, Escape closes. A save that didn't go through leaves the words where they are.
import { useEffect, useId, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAct } from "../lib/act";
import { useWords } from "../lib/wording";
import { useNoted } from "./NoteBox";
import { Button } from "../ui/Button";
export function CaptureForm(props: { event: string; title: string; onClose: () => void }) {
  const { t } = useWords();
  const act = useAct();
  const noted = useNoted();
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => area.current?.focus(), []);
  const words = text.trim();

  const save = async (said: string) => {
    if (busy) return;
    setBusy(true);
    const done = await act(
      () => api.captureMeeting(props.event, said),
      (result) => ({
        message: noted(t(said ? "meeting.capture.saved" : "meeting.capture.nothing_saved", { title: props.title }), result.request),
        // Saying there is nothing to note is taken back by asking again; words that made a run are undone where that run's changes are.
        undo: said ? undefined : () => api.undoCapture(props.event, result.captured_at),
      }),
    );
    if (done === undefined) setBusy(false);
    else props.onClose();
  };

  return (
    <form
      className="answer-form note-box"
      data-capture={props.event}
      onSubmit={(e) => {
        e.preventDefault();
        if (words) void save(words);
      }}
    >
      <label className="hint" htmlFor={id}>
        {t("meeting.capture.label", { title: props.title })}
      </label>
      <textarea
        id={id}
        ref={area}
        className="short"
        value={text}
        aria-describedby={`${id}-hint`}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            props.onClose();
          } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (words) void save(words);
          }
        }}
      />
      <span id={`${id}-hint`} className="hint">
        {t("meeting.capture.hint")}
      </span>
      <div className="row-end">
        <Button variant="quiet" onClick={props.onClose}>
          {t("action.cancel")}
        </Button>
        <Button disabled={busy} onClick={() => void save("")}>
          {t("meeting.capture.nothing")}
        </Button>
        <Button variant="primary" type="submit" disabled={!words || busy}>
          {t("meeting.capture.save")}
        </Button>
      </div>
    </form>
  );
}
