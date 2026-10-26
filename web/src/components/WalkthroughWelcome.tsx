// The walkthrough's opening screen (design 7.8): what the app does for the person, what they will need, and Start. It is not
// a step and nothing about it is counted; the Start button is the walkthrough's own primary button.
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAmount } from "../lib/money";
import { useWords } from "../lib/wording";
import styles from "./Walkthrough.module.css";

/** The app's own daily AI limit, read from the setting that holds it: nothing here names an amount. */
const DAY = "ai.budgets.per_day_usd";
/** Days in a month, for "about this much a month" at the daily limit. */
const MONTH_DAYS = 30;

export function WalkthroughWelcome() {
  const { t } = useWords();
  const amount = useAmount();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const perDay = Number(settings.data?.items.find((i) => i.key === DAY)?.value ?? 0);
  const ai = perDay > 0 ? t("walkthrough.welcome.need.ai", { amount: amount(Math.round(perDay * MONTH_DAYS)) }) : t("walkthrough.welcome.need.ai_plain");
  return (
    <>
      <p className={styles.lead}>{t("walkthrough.welcome.line")}</p>
      <section aria-labelledby="walkthrough-need" className={styles.needs}>
        <h3 id="walkthrough-need">{t("walkthrough.welcome.need")}</h3>
        <ul>
          <li>{ai}</li>
          <li>{t("walkthrough.welcome.need.mail")}</li>
          <li>{t("walkthrough.welcome.need.backup")}</li>
        </ul>
      </section>
    </>
  );
}
