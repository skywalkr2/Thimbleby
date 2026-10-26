// The business on its page of Settings (design 7.9, "Your business"): each side of the person's work beside their own
// life by name, with Rename (an edit of its project) and, while setup is open and nothing is filed under it, Remove.
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
  const refresh = () => Promise.all(["business", "setup", "projects"].map((key) => client.invalidateQueries({ queryKey: [key] })));
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
