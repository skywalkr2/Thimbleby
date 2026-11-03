// Which mailbox a copied message is sent from (design 7.5): each follow-up draft names the mailbox, a list to pick from when
// the person reads more than one. It starts on the mailbox their conversation with the person came through. The message is
// copied and sent from the person's own mail program, so the pick is a reminder of which mailbox to use; it is remembered
// per person on this browser, as the view is.
import { useState } from "react";
import type { S } from "../lib/api";
import { useWords } from "../lib/wording";
import { Select } from "../ui/Select";

const KEY = "cockpit:followups:send-from:";

function remembered(person: string): string | null {
  try {
    return window.localStorage.getItem(KEY + person);
  } catch {
    return null;
  }
}

export function SendFrom(props: { section: S["FollowupSection"] }) {
  const { t } = useWords();
  const s = props.section;
  const boxes = s.send_from ?? [];
  const [picked, setPicked] = useState<string>(() => {
    const last = remembered(s.person);
    return last && boxes.includes(last) ? last : (s.send_from_default ?? boxes[0] ?? "");
  });
  if (boxes.length === 0) return null;
  if (boxes.length === 1) {
    return (
      <p className="hint" data-send-from={boxes[0]}>
        {t("followups.send_from_one", { account: boxes[0] })}
      </p>
    );
  }
  const id = `send-from-${s.person}`;
  return (
    <div className="send-from" data-send-from={picked}>
      <label className="hint" htmlFor={id}>
        {t("followups.send_from", { name: s.name })}
      </label>
      <Select
        id={id}
        value={picked}
        onChange={(e) => {
          setPicked(e.target.value);
          try {
            window.localStorage.setItem(KEY + s.person, e.target.value);
          } catch {
            // Storage can be blocked; the pick then lasts until the page is closed.
          }
        }}
      >
        {boxes.map((box) => (
          <option key={box} value={box}>
            {box}
          </option>
        ))}
      </Select>
    </div>
  );
}
