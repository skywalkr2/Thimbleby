// Mail set aside as not work (design 6.5): the corrections the screens offer, shared by Today's Came in, What changed and
// Handled for you. Each acts at once with an undo toast; the toast also offers a sorting rule for the sender or the
// domain, written through the settings save path as the person's own change with a read-back and Undo.
import { useCallback, useMemo } from "react";
import { api, type S } from "./api";
import { useAct } from "./act";
import { useAfterSave, useFreshFingerprint } from "./settings-save";
import { useWords } from "./wording";

/** What a screen sets mail aside as: sales mail or automated notices. Personal mail is never set aside. */
export type Section = S["SortingRuleIn"]["choice"] & S["SetAsideIn"]["section"];
type Choice = S["SortingRuleIn"]["choice"];
/** What the screen needs of a message to correct it: its id in the app and its title for the toast. */
export interface MailRef {
  id: string;
  title: string;
}
/** A message on Handled for you: which list it is on decides what Undo does. */
export type HandledMail = MailRef & { version: number; tab: S["HandledRow"]["tab"] };

export function useSetAside() {
  const { t, has } = useWords();
  const act = useAct();
  const afterSave = useAfterSave();
  const fresh = useFreshFingerprint();

  const what = useCallback((section: Section | null) => (section && has(`setaside.what.${section}`) ? t(`setaside.what.${section}`) : t("setaside.what.mixed")), [t, has]);

  /** Always set aside (or keep) mail from a sender or a domain: one saved rule, read back with Undo. */
  const always = useCallback(
    async (choice: Choice, senders: string[], domains: string[], message: string) => {
      const fingerprint = await fresh();
      const saved = await act(() => api.sortingRule({ fingerprint, choice, senders, domains }));
      if (saved) await afterSave(saved, { message });
    },
    [act, afterSave, fresh],
  );

  /** The toast's choices for a sender and a domain: a rule that sets mail aside in `choice`, or keeps it. */
  const offers = useCallback(
    (choice: Choice, who: { address: string; domain?: string | null }, words: string) => {
      const keep = choice === "never";
      const sender = who.address
        ? {
            label: t("setaside.always_sender"),
            run: () => always(choice, [who.address], [], t(keep ? "setaside.rule_keep_sender" : "setaside.rule_sender", { sender: who.address, what: words })),
          }
        : undefined;
      const name = who.domain;
      const domain = name
        ? {
            label: t("setaside.always_domain"),
            run: () => always(choice, [], [name], t(keep ? "setaside.rule_keep_domain" : "setaside.rule_domain", { domain: name, what: words })),
          }
        : undefined;
      return { action: sender ?? domain, more: sender && domain ? [domain] : [] };
    },
    [always, t],
  );

  /** "Set aside: sales" on a message in Came in or What changed. */
  const setAside = useCallback(
    (mail: MailRef, section: Section) =>
      act(
        () => api.setAsideMail(mail.id, section),
        (done) => ({
          message: t("setaside.done", { title: mail.title, what: what(section) }),
          undo: () => api.putBack(done.id, done.version),
          ...offers(section, done, what(section)),
        }),
      ),
    [act, offers, t, what],
  );

  /** Treat as work (or as personal) on a message of Handled for you: a set-aside message is handed in after all, and a
   * message the assistant read with nothing to do is read again. Undo sets it aside again, or takes the new read back. */
  const treat = useCallback(
    (personal: boolean) => (mail: HandledMail) =>
      act(
        () => (personal ? api.handledPersonal(mail.id, mail.version) : api.handledWork(mail.id, mail.version)),
        (done) => ({
          message: t(personal ? "setaside.personal_done" : "setaside.work_done", { title: mail.title }),
          undo: () => (mail.tab === "read" ? api.handledUndo(done.id, done.version) : api.setAsideMail(done.id, done.section)),
          ...(mail.tab === "read" ? {} : offers("never", done, "")),
        }),
      ),
    [act, offers, t],
  );
  const isWork = useMemo(() => treat(false), [treat]);
  const isPersonal = useMemo(() => treat(true), [treat]);
  /** Treat as one of the person's sides (Personal or a business): handed in and filed under that side's project. */
  const isSide = useCallback(
    (side: { id: string; name: string }) => (mail: HandledMail) =>
      act(
        () => api.handledAs(mail.id, mail.version, side.id),
        (done) => ({
          message: t("setaside.treat_as_done", { title: mail.title, side: side.name }),
          undo: () => (mail.tab === "read" ? api.handledUndo(done.id, done.version) : api.setAsideMail(done.id, done.section)),
          ...(mail.tab === "read" ? {} : offers("never", done, "")),
        }),
      ),
    [act, offers, t],
  );

  /** "Always set aside mail like this": a saved rule for the sender, read back with Undo, kept as a correction. */
  const alwaysLikeThis = useCallback(
    async (mail: MailRef & { section: Section; address: string }) => {
      const fingerprint = await fresh();
      const saved = await act(() => api.sortingRule({ fingerprint, choice: mail.section, senders: [mail.address], domains: [], mail: mail.id }));
      if (saved) await afterSave(saved, { message: t("setaside.rule_sender", { sender: mail.address, what: what(mail.section) }) });
    },
    [act, afterSave, fresh, t, what],
  );

  return { setAside, isWork, isPersonal, isSide, alwaysLikeThis, always };
}
