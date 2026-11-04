// One account's card on Connections (design 7.9): its address, what kind of service it is, how it stands, the sides it is
// for (as chips, with Change to pick them again), the one button that fixes it when it needs the person, and its connections
// as rows underneath. A sign-in that came back as another account is refused in words, in the card, with Try again. The state
// is told from the same account states the header reads, so the card and the header never say different things.
import { useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState, type ReactNode } from "react";
import { api, type S } from "../lib/api";
import { useAct } from "../lib/act";
import type { ConnectionCard } from "../lib/connection-cards";
import { sourceState, type AccountState } from "../lib/connections";
import { useConnection } from "../lib/connection";
import { useSideSlot } from "../lib/marks";
import { useSideFilter, useSides } from "../lib/sides";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { MarkDot } from "../ui/MarkDot";
import { StateMark, type StateTone } from "../ui/StateMark";
import { useAccountWords, useSignInAgain } from "./AccountRow";
import { restoreFocus } from "./ModalPanel";
import { RowMenu, type MenuAction } from "./RowMenu";
import { SignOutConfirm, addonOfSignIn } from "./SignIns";
import { SourceSides } from "./SourceSides";
import styles from "./ConnectionCard.module.css";

type Source = S["WatchSourceView"];

/** The icon of an account by what it reads: mail, a calendar, or a mailbox with a calendar. */
const iconOf = (sources: Source[]): "inbox" | "calendar" => ((sources.flatMap((s) => s.reads ?? []).includes("mail") || sources.length === 0) ? "inbox" : "calendar");

const slug = (text: string) => text.replace(/[^A-Za-z0-9_-]/g, "-");

export function ConnectionCardView(props: {
  card: ConnectionCard;
  /** Draws one of the card's connections as a row; `showPrivacy` is false when the card says it once for them all. */
  renderPart: (source: Source, showPrivacy: boolean, hideStatus: boolean) => ReactNode;
  /** The card's privacy, said once for the account when all its connections share it; none when they differ. */
  privacy: ReactNode | null;
  onChooseSource: (plugin: string | null, kind?: string, account?: string) => void;
}) {
  const { t } = useWords();
  const act = useAct();
  const client = useQueryClient();
  const { card } = props;
  const offline = useConnection().offline;
  // Every connection of the account is waiting for its first read: said once for the account, with the one action, and not once for each.
  const waitingFirst = card.kind === "account" && card.sources.length > 1 && card.sources.every((s) => sourceState(s) === "never");
  const [reading, setReading] = useState(false);
  const readAll = async () => {
    setReading(true);
    await act(
      async () => {
        const fresh: Source[] = [];
        for (const source of card.sources) fresh.push(await api.readSource(source.id));
        client.setQueryData<Source[]>(["watch"], (all) => all?.map((s) => fresh.find((f) => f.id === s.id) ?? s));
        return fresh;
      },
      () => ({ message: t("connection.read_all_toast", { account: card.address ?? card.name }) }),
    );
    setReading(false);
  };
  const titleId = `connection-${slug(card.key)}`;
  const words = useAccountWords();
  const filter = useSideFilter();
  const slotOf = useSideSlot();
  const { personal, sides } = useSides();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const changeRef = useRef<HTMLButtonElement>(null);
  const editorId = useId();
  // The account as the header reads it; a card that reads nothing (or nothing is on) has a quiet state of its own.
  const stub: AccountState = card.state ?? { key: card.key, name: card.name, connector: card.sources[0]?.connector ?? "", sources: card.sources, need: null, fare: "never", since: null, latest: null, tone: "neutral" };
  const again = useSignInAgain(stub);
  const need = card.state?.need ?? null;
  const tone: StateTone = card.state ? card.state.tone : card.signedIn?.status === "expired" ? "danger" : "neutral";
  const stateWords = card.state
    ? tone === "ok"
      ? t("connection.connected")
      : words(card.state)
    : card.signedIn
      ? t(card.signedIn.status === "expired" ? "sign_in.status.expired" : "sign_in.status.signed_in")
      : t("connection.off");
  const chips = card.sides.flatMap((id) => {
    const option = filter.options.find((o) => o.id === id);
    return option ? [{ id, name: option.name, slot: slotOf(id) }] : [];
  });
  const showSides = filter.offered && card.kind === "account" && card.sources.length > 0;
  const accountName = card.address ?? card.name;
  const signIn = card.signIn;
  const signedIn = card.signedIn;
  const menu: MenuAction[] = [];
  if (signIn && signedIn) {
    menu.push({ id: "choose", label: t("sign_in.choose_source"), run: () => props.onChooseSource(addonOfSignIn(signIn.name), undefined, card.address ?? undefined), disabled: offline });
    menu.push({ id: "sign-out", label: t("sign_in.sign_out"), run: () => setConfirming(true), disabled: signingOut || offline });
  }
  const signOut = async () => {
    if (!signIn || !signedIn) return;
    setSigningOut(true);
    await act(
      () => api.signOut(signIn.name, signedIn.key),
      () => ({ message: t("sign_in.signed_out_account_toast", { account: accountName, label: signIn.label }) }),
    );
    void client.invalidateQueries();
    setSigningOut(false);
  };
  const menuId = `${titleId}-menu`;
  const refused = again.phase === "different";
  const problem = again.phase === "done" || again.phase === "waiting" || again.phase === "starting" ? "" : again.problem;
  return (
    <section className={styles.card} aria-labelledby={titleId} data-connection-card={card.key} data-need={need ?? undefined} data-kind={card.kind}>
      {card.kind === "account" ? (
        <header className={styles.head}>
          <div className={styles.avatar} aria-hidden="true">
            <Icon name={iconOf(card.sources)} />
          </div>
          <h3 className={styles.name} id={titleId}>
            {card.name}
          </h3>
          <div className={styles.line}>
            {card.service && <span className={styles.service}>{card.service}</span>}
            {card.service && <span className={`${styles.sep} ${styles.service}`} aria-hidden="true">·</span>}
            <StateMark tone={tone} className={styles.state}>
              {stateWords}
            </StateMark>
            {props.privacy && <span className={`${styles.sep} ${styles.privacy}`} aria-hidden="true">·</span>}
            {props.privacy && <span className={styles.privacy}>{props.privacy}</span>}
          </div>
          {showSides && (
            <div className={styles.sides} data-card-sides="">
              <span>{t("connection.for")}</span>
              {chips.length === 0 && <span>{t("connection.for_none")}</span>}
              {chips.map((chip) => (
                <span key={chip.id} className={styles.chip} data-side-chip="" title={chip.name}>
                  {chip.slot !== null && <MarkDot kind="side" slot={chip.slot} />}
                  <span className={styles.chipName}>{chip.name}</span>
                </span>
              ))}
              <Button
                ref={changeRef}
                variant="quiet"
                size="sm"
                className={styles.change}
                aria-expanded={editing}
                aria-controls={editing ? editorId : undefined}
                aria-label={t("connection.change_named", { account: accountName })}
                onClick={() => setEditing((on) => !on)}
              >
                {t("connection.change")}
              </Button>
            </div>
          )}
          <div className={styles.acts}>
            {need && again.item && (
              <Button
                size="sm"
                variant={refused || problem ? "secondary" : "primary"}
                className={styles.again}
                disabled={again.busy || !again.item.ready || offline}
                aria-label={t("sign_in.sign_in_again_account", { account: accountName })}
                onClick={() => void again.start()}
              >
                {t("account.sign_in_again")}
              </Button>
            )}
            {menu.length > 0 && (
              <span className={styles.menuHead}>
                <RowMenu label={accountName} actions={menu} buttonId={menuId} />
              </span>
            )}
          </div>
        </header>
      ) : (
        <header className={styles.otherHead}>
          <h3 className={styles.name} id={titleId}>
            {t("connection.other.title")}
          </h3>
          <p className={styles.meta}>{t("connection.other.sub")}</p>
        </header>
      )}
      {editing && showSides && (
        <div className={styles.editor} id={editorId} data-card-sides-editor="">
          <SourceSides group sources={card.sources} account={accountName} personal={personal} sides={sides} />
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              setEditing(false);
              restoreFocus(() => changeRef.current);
            }}
          >
            {t("connection.sides_done")}
          </Button>
        </div>
      )}
      {(again.phase === "waiting" || again.phase === "starting") && (
        <p className={styles.waiting} role="status" data-sign-in-waiting="">
          <span>{again.phase === "starting" ? t("sign_in.working") : t("sign_in.window.waiting")}</span>
          <Button size="sm" onClick={again.cancel} aria-label={t("connection.cancel_named", { account: accountName })}>
            {t("action.cancel")}
          </Button>
        </p>
      )}
      {(refused || problem) && (
        <div className={styles.refused} role="alert" data-sign-in-refused={refused ? "" : undefined}>
          <span className={styles.refusedText}>
            <Icon name="alert" size={16} />
            <span>{refused ? again.text : problem}</span>
          </span>
          <Button size="sm" variant="primary" disabled={again.busy || !again.item?.ready} onClick={() => void again.start()}>
            {t("action.try_again")}
          </Button>
        </div>
      )}
      {waitingFirst && (
        <div className={styles.waitingFirst} data-waiting-first="">
          <span>{t("connection.waiting_first")}</span>
          <Button size="sm" disabled={reading || offline} onClick={() => void readAll()}>
            {t(reading ? "connection.reading_now" : "connection.read_now")}
          </Button>
        </div>
      )}
      {card.sources.length > 0 ? (
        <ul className={styles.parts} aria-label={t("connection.parts_of", { account: card.kind === "account" ? accountName : t("connection.other.title") })}>
          {card.sources.map((source) => props.renderPart(source, props.privacy === null, waitingFirst))}
        </ul>
      ) : (
        <p className={styles.empty}>{t("connection.empty_account")}</p>
      )}
      {confirming && signIn && signedIn && (
        <SignOutConfirm
          label={signIn.label}
          account={accountName}
          acting={signedIn.acting}
          onCancel={() => {
            setConfirming(false);
            restoreFocus(() => document.getElementById(menuId) ?? document.getElementById(titleId));
          }}
          onConfirm={() => {
            setConfirming(false);
            void signOut();
            restoreFocus(() => document.getElementById(titleId));
          }}
        />
      )}
    </section>
  );
}
