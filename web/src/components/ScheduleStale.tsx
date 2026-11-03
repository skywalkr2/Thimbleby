// A calendar that can't be read until the person signs in again (design 7.7, 7.15): one line above the calendar naming it, the
// account and when the entries shown are from, with the one button that fixes it. The entries it last read stay shown. Told from the
// same account states the header and Connections read.
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { accountsNeedingYou, accountStates, type AccountState } from "../lib/connections";
import { whenWords } from "../lib/coverage";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { useSignInAgain } from "./AccountRow";
import styles from "./Schedule.module.css";

function Line(props: { account: AccountState }) {
  const { t } = useWords();
  const { account } = props;
  const again = useSignInAgain(account);
  const calendars = account.sources.filter((s) => (s.reads ?? []).includes("calendar"));
  const read = calendars.flatMap((s) => (s.read_at ? [s.read_at] : [])).sort().at(-1);
  const named = calendars.map((s) => s.label).join(", ");
  const text = read
    ? t("schedule.stale.line_since", { calendar: named, account: account.name, when: whenWords(read, new Date(), t) })
    : t("schedule.stale.line", { calendar: named, account: account.name });
  return (
    <li className={styles.stale} data-schedule-stale={account.key}>
      <span className={styles.staleText}>
        <Icon name="alert" size={16} />
        <span>{text}</span>
      </span>
      {again.item && (
        <Button size="sm" variant="primary" disabled={again.busy || !again.item.ready} aria-label={t("sign_in.sign_in_again_account", { account: account.name })} onClick={() => void again.start()}>
          {t("account.sign_in_again")}
        </Button>
      )}
    </li>
  );
}

export function ScheduleStale() {
  const { t } = useWords();
  const watch = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const calendars = (watch.data ?? []).filter((s) => (s.reads ?? []).includes("calendar"));
  const needing = accountsNeedingYou(accountStates(calendars));
  if (needing.length === 0) return null;
  return (
    <ul className={styles.staleList} aria-label={t("schedule.stale.label")} data-schedule-stale-list="">
      {needing.map((account) => (
        <Line key={account.key} account={account} />
      ))}
    </ul>
  );
}
