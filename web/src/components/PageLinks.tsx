// The person's quick links (design 7.9), a section of Settings of their own: a name and a web address each, shown in the menu
// under the person's initials. A link is added from a name and an address and removed from its row; both are saved at once with Undo, like
// every other setting. The server checks the list (how many, how long, a web address); this checks the address first so
// the person is told in plain words before anything is sent.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, ApiError } from "../lib/api";
import { problemText } from "../lib/problem";
import { knownFingerprint, useAfterSave } from "../lib/settings-save";
import { useWords } from "../lib/wording";
import { pageLinks, type PageLink } from "../shell/HeaderLinks";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { Actions } from "../ui/Actions";
import { Row } from "../ui/Row";
import { RowList } from "../ui/RowList";
import { StateMark } from "../ui/StateMark";

const WEB = /^https?:\/\/\S+$/i;
/** The longest name a link can have (the server's limit, shown beside the field rather than cut without a word). */
const NAME_MAX = 40;
/** What was typed as an address: a bare web address ("example.org/bank") gets https:// in front; anything that names another
 * kind of address (it has a scheme other than http or https) is left as typed so it is refused. */
export function webAddress(typed: string): string {
  const text = typed.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^[^/\s]+:\d+(\/|$)/.test(text)) return text;
  return /^[^\s/]+\.[^\s/]+/.test(text) ? `https://${text.replace(/^\/\//, "")}` : text;
}

/** An address cut in the middle when it is long, so the site and the end of the path both show. */
export function middleCut(address: string, most = 56): string {
  if (address.length <= most) return address;
  const head = Math.ceil((most - 1) * 0.6);
  return `${address.slice(0, head)}…${address.slice(address.length - (most - 1 - head))}`;
}

export function PageLinks() {
  const { t } = useWords();
  const client = useQueryClient();
  const afterSave = useAfterSave();
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const base = useId();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [problem, setProblem] = useState("");
  const item = settings.data?.items.find((i) => i.key === "ui.links");
  // Without the setting there is nothing to edit (an older server): the section says nothing.
  if (!item) return null;
  const links = pageLinks(item.value);
  const locked = item.locked || !item.editable;

  const save = async (next: PageLink[], message: string): Promise<boolean> => {
    const fingerprint = knownFingerprint(client, settings.data?.fingerprint);
    if (!fingerprint) return false;
    try {
      const saved = await api.saveSettings({ changes: { "ui.links": next }, reset: [], fingerprint });
      setProblem("");
      await afterSave(saved, { message });
      return true;
    } catch (err) {
      setProblem(err instanceof ApiError && err.detail ? err.detail : problemText(err, t));
      return false;
    }
  };

  const add = async () => {
    const entry = { name: name.trim(), address: webAddress(address) };
    if (!entry.name || !entry.address) return;
    if (!WEB.test(entry.address)) {
      setProblem(t("pages.bad_address", { name: entry.name }));
      return;
    }
    if (await save([...links, entry], t("pages.added", { name: entry.name }))) {
      setName("");
      setAddress("");
    }
  };

  return (
    <section className="settings-group" aria-labelledby="settings-section-links">
      <p className="hint">{t("pages.intro")}</p>
      <RowList aria-label={t("pages.list")} data-quick-links="">
        {links.length === 0 && <Row as="li" loop={false} title={<StateMark tone="neutral">{t("pages.none")}</StateMark>} />}
        {links.map((l, i) => (
          <Row
            key={`${i}:${l.address}`}
            as="li"
            loop={false}
            title={l.name}
            meta={<span title={l.address}>{middleCut(l.address)}</span>}
            oneLine
            actions={
              !locked && (
                <Button
                  size="sm"
                  variant="quiet"
                  aria-label={t("pages.remove_named", { name: l.name })}
                  onClick={() => void save(links.filter((_, k) => k !== i), t("pages.removed", { name: l.name }))}
                >
                  {t("pages.remove")}
                </Button>
              )
            }
          />
        ))}
      </RowList>
      {!locked && (
        <form
          className="answer-form settings-column"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <FormField id={`${base}-name`} label={t("pages.name")} hint={t("pages.name_hint", { n: name.length, max: NAME_MAX })}>
            <input id={`${base}-name`} type="text" maxLength={NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} aria-describedby={`${base}-name-hint`} />
          </FormField>
          <FormField id={`${base}-address`} label={t("pages.address")} hint={t("pages.address_hint")}>
            <input id={`${base}-address`} type="url" inputMode="url" value={address} onChange={(e) => setAddress(e.target.value)} aria-describedby={[`${base}-address-hint`, problem ? `${base}-problem` : ""].filter(Boolean).join(" ")} />
          </FormField>
          {problem && (
            <p className="problem-note" id={`${base}-problem`} role="alert">
              {problem}
            </p>
          )}
          <Actions align="start">
            <Button type="submit" variant="primary" disabled={!name.trim() || !address.trim()}>
              {t("pages.add")}
            </Button>
          </Actions>
        </form>
      )}
    </section>
  );
}
