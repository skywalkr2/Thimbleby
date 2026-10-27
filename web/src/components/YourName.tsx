// "Your name" on the You page of Settings (design 7.9): the name on the person's own record in People, the one place it is
// kept. It is not a setting and never an id. It is saved as the person leaves the box or presses Enter, with a toast that
// reads it back and offers Undo; a name another person already has is refused in the server's own words.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";

export function YourName() {
  const { t } = useWords();
  const client = useQueryClient();
  const { push } = useToasts();
  const me = useQuery({ queryKey: ["me"], queryFn: api.me });
  const [typed, setTyped] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const id = useId();
  if (!me.data) return null;
  const saved = me.data.full_name;
  const shown = typed ?? saved;
  const save = async (to: string) => {
    const name = to.split(/\s+/).filter(Boolean).join(" ");
    if (name === "" || name === saved) {
      setTyped(null);
      setProblem(name === "" && saved !== "" ? t("settings.row.your_name.empty") : "");
      return;
    }
    setProblem("");
    try {
      const done = await api.saveMe(name);
      client.setQueryData(["me"], done);
      setTyped(null);
      const before = saved;
      push({
        message: t("settings.row.your_name.saved", { name: done.full_name }),
        // A name given for the first time has nothing to go back to.
        undo: before
          ? async () => {
              client.setQueryData(["me"], await api.saveMe(before));
              await client.invalidateQueries();
            }
          : undefined,
      });
      await client.invalidateQueries();
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    }
  };
  return (
    <div className="setting beside" data-key="person.full_name">
      <div className="setting-main" data-main>
        <div className="setting-head">
          <label className="setting-label" htmlFor={id}>
            {t("settings.row.your_name")}
          </label>
        </div>
        <input
          id={id}
          type="text"
          value={shown}
          autoComplete="name"
          aria-invalid={problem ? true : undefined}
          aria-describedby={`${id}-hint${problem ? ` ${id}-problem` : ""}`}
          onChange={(e) => setTyped(e.target.value)}
          onBlur={(e) => void save(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save(e.currentTarget.value);
            }
          }}
        />
        {problem && (
          <p className="problem-note" id={`${id}-problem`} role="alert">
            {problem}
          </p>
        )}
      </div>
      <div className="setting-help" data-help>
        <p className="hint" id={`${id}-hint`}>
          {t("settings.row.your_name.hint")}
        </p>
      </div>
    </div>
  );
}
