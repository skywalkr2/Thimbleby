// A save that failed (design 7.12, "States"): the row keeps what the person changed, says "Not saved" in words, an icon and the
// danger edge, gives the reason when there is one, and offers Try again. Nothing is lost: the screen holds the change until it
// saves. It is drawn inline where the change was made, never as a toast.
import { ApiError } from "../lib/api";
import { useWords } from "../lib/wording";
import { Button } from "./Button";
import { StateMark } from "./StateMark";
import styles from "./NotSaved.module.css";

/** The plain reason a save failed, when the server gave one the person can read; empty otherwise. */
export function reasonOf(err: unknown): string {
  return err instanceof ApiError ? err.detail : "";
}

export function NotSaved(props: {
  /** What was being saved, in the person's words ("Pay the deposit"); left out, the line says "That". */
  what?: string;
  /** Why, when it is known. */
  reason?: string;
  onRetry: () => void;
  busy?: boolean;
  className?: string;
}) {
  const { t } = useWords();
  const reason = (props.reason ?? "").trim();
  return (
    <div className={[styles.row, props.className ?? ""].filter(Boolean).join(" ")} role="alert" data-not-saved="">
      <StateMark tone="danger">{t("state.not_saved")}</StateMark>
      <p className={styles.text}>
        {props.what ? t("state.not_saved.what", { what: props.what }) : t("state.not_saved.that")} {reason && `${reason} `}
        {t("state.not_saved.kept")}
      </p>
      <Button size="sm" icon="refresh" loading={props.busy} onClick={props.onRetry}>
        {t("action.try_again")}
      </Button>
    </div>
  );
}
