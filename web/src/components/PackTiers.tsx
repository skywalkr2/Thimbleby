// The tiers add-ons declare for their own work (design 3.3, 4.8), listed under the add-on in Settings' AI section and in
// the setup guide, for the person to map to an account and model. Until one is mapped its work uses the core's kind of
// work the add-on named, which is said beside it; nothing is ever chosen for the person, and what the measurements back
// is only suggested. A choice is saved at once with Undo.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, type S } from "../lib/api";
import { accountName, type Account } from "../lib/ai-accounts";
import { useAccountActs } from "../lib/ai-account-acts";
import { useTierName } from "../lib/ai-routing";
import { problemText } from "../lib/problem";
import { addonLabel } from "../lib/settings";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Actions } from "../ui/Actions";
import { Select } from "../ui/Select";

type PackTier = S["PackTierView"];

export function PackTiers(props: {
  /** The level of the heading: 3 beside other settings, 4 inside a step of the setup guide. */
  level?: 3 | 4;
  /** Only this add-on's tiers; every add-on's when left out. */
  plugin?: string;
}) {
  const { t, has } = useWords();
  const tiers = useQuery({ queryKey: ["pack-tiers"], queryFn: api.packTiers });
  const accounts = useQuery({ queryKey: ["ai-accounts"], queryFn: api.aiAccounts });
  if (tiers.isPending || accounts.isPending) return null;
  const list = accounts.data ?? [];
  if (tiers.isError) return <p className="hint">{t("pack_tiers.load_failed")}</p>;
  const shown = tiers.data.tiers.filter((x) => !props.plugin || x.plugin === props.plugin);
  if (shown.length === 0) return null;
  const Heading = props.level === 4 ? "h4" : "h3";
  const plugins = [...new Set(shown.map((x) => x.plugin))];
  return (
    <>
      {plugins.map((plugin) => {
        const addon = addonLabel(plugin, t, has);
        const id = `pack-tiers-${plugin}`;
        return (
          <section key={plugin} className="pack-tiers" aria-labelledby={`${id}-title`} data-pack-tiers={plugin}>
            <div className="heading">
              <Heading id={`${id}-title`}>{t("pack_tiers.title", { addon })}</Heading>
            </div>
            {list.length === 0 && <p className="hint">{t("pack_tiers.no_accounts")}</p>}
            <ul className="plain-list">
              {shown
                .filter((x) => x.plugin === plugin)
                .map((tier) => (
                  <TierRow key={tier.id} tier={tier} accounts={list} />
                ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function TierRow(props: { tier: PackTier; accounts: Account[] }) {
  const { t } = useWords();
  const tierName = useTierName();
  const acts = useAccountActs();
  const { tier, accounts } = props;
  const withModels = accounts.filter((a) => Object.keys(a.models).length > 0);
  const [account, setAccount] = useState(tier.account ?? "");
  const [model, setModel] = useState(tier.model ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const chosen = withModels.find((a) => a.name === account);
  const shorts = chosen ? Object.keys(chosen.models) : [];
  const nameOf = (a: Account) => accountName(a, undefined, t);
  const pick = (name: string) => {
    setAccount(name);
    setModel(Object.keys(withModels.find((a) => a.name === name)?.models ?? {})[0] ?? "");
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setProblem("");
    try {
      await work();
    } catch (err) {
      setProblem(problemText(err, t));
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(() =>
      acts.save(
        (fingerprint) => api.changeAccount(account, { fingerprint, use: { [tier.id]: model } }),
        t("pack_tiers.saved", { label: tier.label, account: chosen ? nameOf(chosen) : account }),
      ),
    );
  const stop = () =>
    run(() =>
      acts.save(
        (fingerprint) => api.saveSettings({ changes: {}, reset: [`ai.tiers.${tier.id}.use`], fingerprint }),
        t("pack_tiers.stopped", { label: tier.label, fallback: tierName(tier.falls_back_to) }),
      ),
    );
  const mappedAccount = withModels.find((a) => a.name === tier.account);
  const suggested = tier.recommended;
  const base = `pack-tier-${tier.id.replace(/[^A-Za-z0-9_-]/g, "-")}`;
  return (
    <li className="setting" data-pack-tier={tier.id}>
      <div className="setting-main">
        <strong>{tier.label}</strong>
        {tier.description && <p className="hint">{tier.description}</p>}
        {tier.used_by.length > 0 && <p className="hint">{t("pack_tiers.used_by", { work: tier.used_by.join(", ") })}</p>}
        <p className="hint" id={`${base}-state`}>
          {tier.mapped
            ? t("pack_tiers.mapped", { account: mappedAccount ? nameOf(mappedAccount) : (tier.account ?? ""), model: tier.model ?? "" })
            : t("pack_tiers.unmapped", { fallback: tierName(tier.falls_back_to) })}
        </p>
        {withModels.length > 0 && (
          <Actions align="end">
            <Select
              aria-label={t("pack_tiers.account", { label: tier.label })}
              value={account}
              disabled={busy}
              onChange={(e) => pick(e.target.value)}
            >
              <option value="">{t("pack_tiers.choose")}</option>
              {withModels.map((a) => (
                <option key={a.name} value={a.name}>
                  {nameOf(a)}
                </option>
              ))}
            </Select>
            {shorts.length > 1 && (
              <Select aria-label={t("pack_tiers.model", { label: tier.label })} value={model} disabled={busy} onChange={(e) => setModel(e.target.value)}>
                {shorts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            )}
            <Button
              variant="primary"
              disabled={busy || !chosen || !model || (account === tier.account && model === tier.model)}
              onClick={() => void save()}
            >
              {t("pack_tiers.save", { label: tier.label })}
            </Button>
            {tier.mapped && (
              <Button
                disabled={busy}
                aria-label={t("pack_tiers.stop_named", { label: tier.label })}
                onClick={() => void stop()}
              >
                {t("pack_tiers.stop", { fallback: tierName(tier.falls_back_to) })}
              </Button>
            )}
          </Actions>
        )}
        {suggested && (suggested.account !== tier.account || suggested.model !== tier.model) && (
          <p className="hint" data-suggestion="">
            <span>
              {t("pack_tiers.suggest", {
                account: (() => {
                  const found = accounts.find((a) => a.name === suggested.account);
                  return found ? nameOf(found) : suggested.account;
                })(),
                model: suggested.model,
              })}
            </span>{" "}
            <Button
              size="sm"
              aria-label={t("pack_tiers.suggest_use_named", { label: tier.label })}
              onClick={() => {
                setAccount(suggested.account);
                setModel(suggested.model);
              }}
            >
              {t("pack_tiers.suggest_use")}
            </Button>
          </p>
        )}
        {!suggested && tier.recommended_why_not && ["not_measured", "stale", "none_passes"].includes(tier.recommended_why_not) && (
          <p className="hint">{t(`ai_routing.suggest.why.${tier.recommended_why_not}`)}</p>
        )}
        {problem && (
          <p className="problem-note" role="alert">
            {problem}
          </p>
        )}
      </div>
    </li>
  );
}
