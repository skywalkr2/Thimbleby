// The offline bar (design 7.12, "States"): the app cannot reach its server. It is one slim line on every screen, drawn from the one
// connection state: what is shown was loaded at a time and stays readable, the app reconnects by itself, and Try now looks at
// once. The header's status chip says "Offline", so the bar does not say it again. It goes away when the connection is back.
import { useConnection } from "../lib/connection";
import { time } from "../lib/dates";
import { useWords } from "../lib/wording";
import { Button } from "./Button";
import { Icon } from "./Icon";
import styles from "./OfflineBanner.module.css";

/** `words` names a screen's own wording for the same state (its title key, and one text key used with or without the time). */
export function OfflineBanner(props: { words?: { title: string; text: string } }) {
  const { t } = useWords();
  const connection = useConnection();
  if (!connection.offline) return null;
  return (
    <div className={styles.banner} role="status" data-offline-banner="">
      <Icon name="alert" size={16} />
      <p className={styles.text}>
        {props.words && <strong>{t(props.words.title)} </strong>}
        {props.words ? t(props.words.text) : connection.since ? t("state.offline.text", { time: time(connection.since) }) : t("state.offline.text_unknown")}
      </p>
      <Button size="sm" variant="quiet" icon="refresh" onClick={connection.retry}>
        {t("state.offline.try")}
      </Button>
    </div>
  );
}
