// Today's setup line (design 7.7): one row while first-run setup is unfinished, with how far along it is, the next step and
// a button that opens the setup guide at it. It replaces the start-here card; hiding it is remembered in this browser only.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";
import { MenuButton } from "../ui/MenuButton";
import { Pill } from "../ui/Pill";
import styles from "./SetupLine.module.css";

const KEY = "start-here-hidden";

function hidden(workspace: string): boolean {
  try {
    return window.localStorage.getItem(`${KEY}:${workspace}`) === "1";
  } catch {
    return false;
  }
}

function remember(workspace: string) {
  try {
    window.localStorage.setItem(`${KEY}:${workspace}`, "1");
  } catch {
    // Storage can be blocked; the line then comes back next time, which is harmless.
  }
}

export function SetupLine(props: { workspace: string; onOpenGuide: (step: string) => void }) {
  const { t, has } = useWords();
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  const [gone, setGone] = useState(() => hidden(props.workspace));
  if (gone || !setup.data) return null;
  // The count is worked out from the steps the server serves, the ones that count: done is done, never skipped or still to do.
  // The line stays while any of them is not done, a skipped one included, so what was passed by is one click away.
  const steps = setup.data.steps.filter((s) => s.counted);
  const next = steps.find((s) => !s.done && !s.skipped) ?? steps.find((s) => !s.done);
  if (!next) return null;
  const finished = steps.filter((s) => s.done).length;
  const total = steps.length;
  const label = next.label || (has(`setup_step.${next.id}`) ? t(`setup_step.${next.id}`) : next.id);
  return (
    <section className={styles.line} aria-label={t("setup_line.label")} data-setup-line="">
      <Pill>{t("setup_line.count", { done: finished, total })}</Pill>
      <div
        className={styles.progress}
        role="progressbar"
        aria-label={t("setup_line.progress")}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={finished}
        aria-valuetext={t("setup_line.count", { done: finished, total })}
      >
        <span className={styles.bar} style={{ width: `${(finished / Math.max(total, 1)) * 100}%` }} />
      </div>
      <p className={styles.next}>{t("setup_line.next", { step: label })}</p>
      <div className={styles.actions}>
        <Button size="sm" onClick={() => props.onOpenGuide(next.id)}>
          {t("setup_line.continue")}
        </Button>
        <MenuButton
          groups={[
            {
              id: "setup",
              entries: [
                {
                  id: "hide",
                  label: t("setup_line.hide"),
                  run: () => {
                    remember(props.workspace);
                    setGone(true);
                  },
                },
              ],
            },
          ]}
          trigger={<IconButton icon="more" size="sm" label={t("menu.more", { what: t("setup_line.what") })} tooltip={false} />}
        />
      </div>
    </section>
  );
}
