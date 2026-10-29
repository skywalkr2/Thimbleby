// Why the assistant filed an item under a project when words or the sender's mail domain did it (design 6.32), said in
// words, and the one step that moves it to the other side as the person: an edit of the item's own project with Undo,
// which the server records as a correction like any other change of a field the assistant set.
import { useId } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
type T = (key: string, vars?: Record<string, string | number>) => string;
type Filed = S["FiledView"];

/** "Filed under <project>: it names <word>", or "it's from <domain>" when the sender's domain, or the source it was read
 * from, placed it. A side is a group, not a project, so an item filed on one reads "Filed in <side>, not in a project". */
export function filedWords(filed: Filed, t: T): string {
  const from = filed.by === "domain" || filed.by === "source";
  if (filed.side_name) {
    const vars = { side: filed.side_name, word: filed.word ?? "" };
    return from ? t("filed.from_side", vars) : t("filed.names_side", vars);
  }
  const vars = { project: filed.project_name, word: filed.word ?? "" };
  return from ? t("filed.from", vars) : t("filed.names", vars);
}

/** The sides an item can move to: a side to pick when there are several, none to pick from when there is one (it moves in a
 * single step, to `move_to`) or none. */
export function movesToPick(filed: Filed): S["FiledMove"][] {
  return (filed.move_options ?? []).length > 1 ? (filed.move_options ?? []) : [];
}

/** Moves an item to the top project of another side (the one it can move to, or the one named); the toast says so and has Undo. */
export function useMoveFiled() {
  const act = useAct();
  const { t } = useWords();
  return (kind: string, id: string, filed: Filed, side?: S["FiledMove"]) => {
    const to = side?.project ?? filed.move_to;
    if (!to) return Promise.resolve(undefined);
    const name = side?.name ?? filed.move_to_name ?? "";
    return act(
      () => api.editRecord({ kind, id, fields: { [filed.field]: filed.field === "projects" ? [to] : to }, read_version: filed.version }),
      (done) => ({
        message: t("filed.moved", { project: name }),
        undo: async () => {
          const report = await api.undo(done.changeset);
          if (!report.restored.length) throw new Error("not undone");
        },
      }),
    );
  };
}

/** The line on an item's page: why it is where it is, and the button that moves it to the other side. */
export function FiledLine(props: { kind: string; id: string; filed: Filed }) {
  const { t } = useWords();
  const move = useMoveFiled();
  const { filed } = props;
  const options = movesToPick(filed);
  const pick = useId();
  return (
    <p className="filed-line" data-filed-by={filed.by}>
      <span>{filedWords(filed, t)}</span>
      {filed.move_to && (
        <>
          {" "}
          <Button size="sm" onClick={() => void move(props.kind, props.id, filed)}>
            {t("filed.move", { project: filed.move_to_name ?? "" })}
          </Button>
        </>
      )}
      {options.length > 0 && (
        <>
          {" "}
          {/* Several other sides: a list to pick one from, which moves the item as soon as one is chosen. */}
          <label className="sr" htmlFor={pick}>
            {t("filed.move_choose")}
          </label>
          <Select
            id={pick}
            className="small"
            value=""
            onChange={(e) => {
              const side = options.find((o) => o.project === e.target.value);
              if (side) void move(props.kind, props.id, filed, side);
            }}
          >
            <option value="">{t("filed.move_choose")}</option>
            {options.map((o) => (
              <option key={o.project} value={o.project}>
                {o.name}
              </option>
            ))}
          </Select>
        </>
      )}
    </p>
  );
}
