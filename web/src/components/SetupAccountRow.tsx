// One account on setup's mail step as a card (design 7.8): its address and what is read there, how it stands (connected, or the
// service no longer lets it in, with Sign in again), how private it is, and who it is for as chips with Change.
import type { ReactNode } from "react";
import type { S } from "../lib/api";
import type { AccountState } from "../lib/connections";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { StateMark } from "../ui/StateMark";
import { useAccountWords, useSignInAgain } from "./AccountRow";
import { AccountSidesLine } from "./AccountSidesLine";
import { privacyFact } from "./Sources";
import styles from "./SetupAccountRow.module.css";

type Source = S["WatchSourceView"];

function SignInAgain(props: { account: AccountState }) {
  const { t } = useWords();
  const { item, start, busy } = useSignInAgain(props.account);
  if (!item) return null;
  return (
    <Button size="sm" variant="primary" disabled={busy || !item.ready} aria-label={t("sign_in.sign_in_again_account", { account: props.account.name })} onClick={() => void start()}>
      {t("account.sign_in_again")}
    </Button>
  );
}

export function SetupAccountRow(props: {
  /** The address, or "" when the service has one account. */
  address: string;
  /** The service as the person knows it. */
  service: string;
  /** What is read there, said in a few words. */
  reads: string;
  sources: Source[];
  /** Set when the service no longer lets the account in. */
  need?: AccountState;
  /** The editor for who it is for; none when the person has no sides to pick from. */
  sidesEditor?: ReactNode;
}) {
  const { t } = useWords();
  const words = useAccountWords();
  const first = props.sources[0];
  const level = first && props.sources.every((s) => (s.data_level ?? "internal") === (first.data_level ?? "internal")) ? (first.data_level ?? "internal") : null;
  const name = props.address || props.service;
  return (
    <li
      className={`account-row ${styles.row}`}
      data-account-row={props.address}
      data-need={props.need?.need ?? undefined}
      data-account={props.need?.key}
      data-sign-in-need={props.need ? props.need.key : undefined}
    >
      <span className="account-icon" aria-hidden="true">
        <Icon name="inbox" size={18} />
      </span>
      <div className="account-main">
        <span className="account-name">
          <strong title={props.address || undefined}>{name}</strong>
          <span className="hint">{props.reads}</span>
        </span>
        <span className="account-state">
          <span className="meta-line">
            <span>{props.service}</span>
            {props.need ? (
              <StateMark tone={props.need.tone}>{words(props.need)}</StateMark>
            ) : (
              <span className="account-ok">
                <Icon name="check" size={14} />
                <span>{t("walkthrough.mail.account.connected")}</span>
              </span>
            )}
            {level && (
              <span className={styles.privacy} title={first ? privacyFact(first, t) : undefined}>
                {level === "restricted" ? t("walkthrough.mail.account.private") : t(`sources.level.${level}`)}
              </span>
            )}
          </span>
        </span>
        {props.sidesEditor && <AccountSidesLine sources={props.sources} account={name} editor={props.sidesEditor} />}
      </div>
      {props.need && (
        <div className={styles.acts}>
          <SignInAgain account={props.need} />
        </div>
      )}
    </li>
  );
}
