// Notices that something needs the person (design 7.19): the ways of getting one, each with "Send me a test". The browser
// needs its own permission, asked for only from a button here. A chat app or push topic is the person's own address, kept
// on this computer like a key, and the app it belongs to is picked by name from a list (the app's own, and the person's) with
// one line on where to find the address in it. Mail to themselves isn't listed until something can send it.
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, ApiError } from "../lib/api";
import { askNotify, notifyState, showNotification, type NotifyState } from "../lib/notify";
import { problemText } from "../lib/problem";
import { useAfterSave, useFreshFingerprint } from "../lib/settings-save";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { heldOf, KeptSecretRow } from "./KeptSecrets";
import styles from "./Notifications.module.css";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";
import { FormField } from "../ui/FormField";
/** One target's test: runs it, and says how it went in a toast, or in the card when it didn't work. */
function useTest(target: "browser" | "webhook") {
  const { t } = useWords();
  const { push } = useToasts();
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setProblem("");
    try {
      const answer = await api.testNotify(target);
      if (!answer.ok) {
        setProblem(answer.problem ?? t("notices.test_failed"));
        return;
      }
      if (target === "browser") {
        if (notifyState() !== "granted") {
          setProblem(t("notices.browser.allow_first"));
          return;
        }
        showNotification(answer.message, undefined, "notices-test");
      }
      push({ message: t(target === "browser" ? "notices.test_shown" : "notices.test_sent") });
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, problem };
}

function BrowserTarget() {
  const { t } = useWords();
  const [state, setState] = useState<NotifyState>(notifyState);
  const test = useTest("browser");
  const base = useId();
  return (
    <li className={styles.target} aria-labelledby={`${base}-name`}>
      <h4 id={`${base}-name`}>{t("notices.browser.title")}</h4>
      <p>{t("notices.browser.hint")}</p>
      {state === "granted" && <p role="status">{t("notify.granted")}</p>}
      {state === "denied" && <p role="status">{t("notify.denied")}</p>}
      {state === "unsupported" && <p role="status">{t("notify.unsupported")}</p>}
      {test.problem && (
        <p className="problem-note" role="alert">
          {test.problem}
        </p>
      )}
      <div className={styles.actions}>
        {state === "default" && (
          <Button variant="primary" size="sm" onClick={() => void askNotify().then(setState)}>
            {t("notify.allow")}
          </Button>
        )}
        {state === "granted" && (
          <Button size="sm" disabled={test.busy} onClick={() => void test.run()}>
            {t("notices.test")}
          </Button>
        )}
      </div>
    </li>
  );
}

function WebhookTarget(props: { local: boolean }) {
  const { t } = useWords();
  const afterSave = useAfterSave();
  const fingerprint = useFreshFingerprint();
  const view = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });
  const test = useTest("webhook");
  const base = useId();
  const held = view.data ? heldOf(view.data.webhook) : null;
  const apps = view.data?.apps ?? [];
  const chosen = apps.find((a) => a.id === view.data?.app);
  return (
    <li className={styles.target} aria-labelledby={`${base}-name`}>
      <h4 id={`${base}-name`}>{t("notices.webhook.title")}</h4>
      <p>{t("notices.webhook.hint")}</p>
      {apps.length > 0 && (
        <FormField id={`${base}-app`} label={t("notices.app.label")}>
          <Select
            id={`${base}-app`}
            value={chosen?.id ?? ""}
            aria-describedby={chosen ? `${base}-app-where` : undefined}
            onChange={(e) =>
              void (async () => {
                const saved = await api.setNotifyApp({ app: e.target.value, fingerprint: await fingerprint() });
                await afterSave(saved, { message: t("notices.app.saved") });
              })()
            }
          >
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          {chosen && (
            <p className="hint" id={`${base}-app-where`}>
              {t("notices.app.where", { where: chosen.where })}
            </p>
          )}
        </FormField>
      )}
      <KeptSecretRow
        id={`${base}-address`}
        label={t("notices.webhook.label")}
        saveLabel={t("notices.webhook.save")}
        local={props.local}
        held={held}
        hint={t("notices.webhook.kept")}
        onSave={async (body) => {
          const saved = await api.setNotifyWebhook({ ...body, fingerprint: await fingerprint() });
          await afterSave(saved, { message: t("notices.webhook.saved") });
        }}
        more={
          held ? (
            <Button size="sm" disabled={test.busy} onClick={() => void test.run()}>
              {t("notices.test")}
            </Button>
          ) : null
        }
      />
      {(test.problem || view.data?.problem) && (
        <p className="problem-note" role="alert">
          {test.problem || view.data?.problem}
        </p>
      )}
    </li>
  );
}

/** The ways of getting a notice, under the settings that turn notices on. `part` shows only the browser's way (on the
 * Notices page) or only the person's own chat or phone app (behind Advanced); left out, both. */
export function Notifications(props: { part?: "browser" | "webhook" }) {
  const { t } = useWords();
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  const view = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });
  const base = useId();
  if (props.part === "webhook") {
    return (
      <section className="notice-targets" aria-labelledby={`${base}-title`}>
        <h4 id={`${base}-title`}>{t("notices.advanced")}</h4>
        <ul className={styles.targets}>
          <WebhookTarget local={setup.data?.local ?? true} />
        </ul>
      </section>
    );
  }
  return (
    <section className="notice-targets" aria-labelledby={`${base}-title`}>
      <h3 id={`${base}-title`}>{t("notices.title")}</h3>
      <p className="hint">{t("notices.intro")}</p>
      {view.data && !view.data.enabled && <p className="hint">{t("notices.off")}</p>}
      <ul className={styles.targets}>
        <BrowserTarget />
        {props.part === undefined && (
          <li className={styles.target}>
            <details className="more-options advanced">
              <summary>{t("notices.advanced")}</summary>
              <ul className={styles.targets}>
                <WebhookTarget local={setup.data?.local ?? true} />
              </ul>
            </details>
          </li>
        )}
      </ul>
    </section>
  );
}
