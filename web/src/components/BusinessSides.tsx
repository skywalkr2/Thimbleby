// The business on its page of Settings (design 7.9, "Your business"): each side of the person's work beside their own
// life by name, with Rename (an edit of its project) and Remove, which asks each time whether its projects and to-dos move
// to Personal or end with it (one change with Undo).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { useWords } from "../lib/wording";
import { SavedSide } from "./WalkthroughWork";

export function BusinessSides() {
  const { t } = useWords();
  const client = useQueryClient();
  const state = useQuery({ queryKey: ["business"], queryFn: api.business });
  const projects = useQuery({ queryKey: ["projects"], queryFn: api.projects });
  const [problem, setProblem] = useState("");
  const sides = state.data?.sides ?? [];
  if (sides.length === 0) return null;
  // Removing a side moves or ends what was filed under it, so every list is read again.
  const refresh = () => client.invalidateQueries();
  return (
    <section aria-labelledby="business-sides">
      <h3 id="business-sides">{t("settings.business.sides")}</h3>
      <ul className="queue">
        {sides.map((side, position) => (
          <SavedSide
            key={side.project}
            side={side}
            position={position}
            inside={(projects.data ?? []).filter((p) => p.parent === side.project).map((p) => p.name)}
            onChanged={refresh}
            onProblem={(err) => setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t))}
            onClear={() => setProblem("")}
            removal="ask"
          />
        ))}
      </ul>
      {problem && (
        <p className="problem-note" role="alert">
          {problem}
        </p>
      )}
    </section>
  );
}
