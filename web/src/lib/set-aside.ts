// Mail set aside as not work (design 6.5): the corrections the screens offer, shared by Today's Came in, What changed and
// the Set aside folder. Each acts at once with an undo toast; the toast also offers a sorting rule for the sender or the
// domain, written through the settings save path as the person's own change with a read-back and Undo.
import { useCallback } from "react";
import { api, type S } from "./api";
import { useAct } from "./act";
import { useAfterSave, useFreshFingerprint } from "./settings-save";
import { useWords } from "./wording";

export type Section = S["SetAsideIn"]["section"];
type Choice = S["SortingRuleIn"]["choice"];
/** What the screen needs of a message to correct it: its id in the app and its title for the toast. */
export interface MailRef {
  id: string;
  title: string;
}

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

  /** "Set aside: personal" or "Set aside: sales" on a message in Came in or What changed. */
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

  /** "This is work" on a message in the folder: handed in after all. Undo sets it aside again. */
  const isWork = useCallback(
    (mail: MailRef & { version: number }) =>
      act(
        () => api.isWork(mail.id, mail.version),
        (done) => ({
          message: t("setaside.work_done", { title: mail.title }),
          undo: () => api.setAsideMail(done.id, done.section),
          ...offers("never", done, ""),
        }),
      ),
    [act, offers, t],
  );

  /** "Treat as personal" on a message in the folder: handed in to be read for the Personal project. Undo sets it
   * aside again. */
  const isPersonal = useCallback(
    (mail: MailRef & { version: number }) =>
      act(
        () => api.isPersonal(mail.id, mail.version),
        (done) => ({
          message: t("setaside.personal_done", { title: mail.title }),
          undo: () => api.setAsideMail(done.id, done.section),
          ...offers("never", done, ""),
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

  return { setAside, isWork, isPersonal, alwaysLikeThis, always };
}
