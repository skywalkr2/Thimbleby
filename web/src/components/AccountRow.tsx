// One account's state as a row (design 7.1, 7.9): its name, a dot and a word that say how it stands, and, when it needs the
// person to sign in, the edge and the tint of a row that needs them and the one button that fixes it. The header's popover and the
// Connections screen both draw an account with this row from the same `accountStates`, so they say the same thing in the same words.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "../lib/api";
import type { AccountState } from "../lib/connections";
import { whenWords } from "../lib/coverage";
import { useSignInWindow } from "../lib/sign-in-window";
import { useToasts } from "../lib/toasts";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Row } from "../ui/Row";
import { StateMark, needsYou } from "../ui/StateMark";
import { addonOfConnector } from "./MissingAddon";
import { addonOfSignIn } from "./SignIns";

/** The words an account's state is said in. */
export function useAccountWords(): (account: AccountState) => string {
  const { t } = useWords();
  return (account) => {
    const when = (iso: string) => whenWords(iso, new Date(), t);
    if (account.need === "again") return account.since ? t("account.state.again", { when: when(account.since) }) : t("account.state.again_now");
    if (account.need === "signed_out") return account.since ? t("account.state.signed_out", { when: when(account.since) }) : t("account.state.signed_out_now");
    if (account.fare === "failed") return account.since ? t("account.state.failed", { when: when(account.since) }) : t("account.state.failed_now");
    if (account.fare === "offline") return t("account.state.offline");
    if (account.fare === "never" || !account.latest) return t("account.state.never");
    return t("account.state.read", { when: when(account.latest) });
  };
}

export function AccountRow(props: { account: AccountState; onNavigate?: () => void }) {
  const { t, tn } = useWords();
  const client = useQueryClient();
  const { push } = useToasts();
  const words = useAccountWords();
  const { account } = props;
  const signIns = useQuery({ queryKey: ["sign-ins"], queryFn: api.signIns, enabled: account.need !== null });
  const addon = addonOfConnector(account.connector);
  const item = (signIns.data ?? []).find((s) => addonOfSignIn(s.name) === addon);
  const { start, phase, busy } = useSignInWindow(item?.name ?? "");
  // The window that was opened says how it went: every list is read again and the person is told.
  useEffect(() => {
    if (phase !== "done" || !item) return;
    void client.invalidateQueries();
    push({ message: t("sign_in.return.done", { label: item.label }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  const attention = needsYou(account.tone === "neutral" ? "ok" : account.tone);
  const titleId = `account-${account.key.replace(/[^A-Za-z0-9_-]/g, "-")}`;
  return (
    <Row
      as="li"
      loop={false}
      state={attention ? (account.tone as "warn" | "danger") : undefined}
      title={<span id={titleId}>{account.name}</span>}
      aria-labelledby={titleId}
      data-account={account.key}
      data-need={account.need ?? undefined}
      data-sign-in-need={account.need ? account.key : undefined}
      meta={
        <>
          <StateMark tone={account.tone}>{words(account)}</StateMark>
          <span> · {tn("account.connections", account.sources.length)}</span>
        </>
      }
      primary={
        account.need && item ? (
          <Button size="sm" variant="primary" disabled={busy || !item.ready} aria-label={t("sign_in.sign_in_again_account", { account: account.name })} onClick={() => void start()}>
            {t("account.sign_in_again")}
          </Button>
        ) : undefined
      }
    />
  );
}
