// Add-ons, For developers (design 7.9): the catalog settings, in a closed section at the foot of the Add-ons screen. They
// are for a developer or a team that keeps its own catalog: whether catalogs are listed at all, the app's own catalog, more
// catalogs to read, and the access keys for private downloads. A key is only ever a place it is kept, never the key itself.
// Each is saved as it is changed, with the same read-back and Undo as on Settings.
import { useId, useState } from "react";
import { asReference } from "../lib/secret-ref";
import { isOff, switchOf, type Item } from "../lib/settings";
import { useSettingEdits } from "../lib/use-setting-edits";
import { useWords } from "../lib/wording";
import { SettingRow } from "./SettingRow";

const ENABLED = "workspace.plugins.catalog.enabled";
const SHIPPED = "workspace.plugins.catalog.shipped_feed";
const FEEDS = "workspace.plugins.catalog.feeds";
const TOKENS = "workspace.plugins.catalog.release_tokens";

export function DeveloperSettings() {
  const { t } = useWords();
  const edit = useSettingEdits();
  const base = useId();
  const items = [ENABLED, SHIPPED, FEEDS].flatMap((key) => edit.item(key) ?? []);
  const tokens = edit.item(TOKENS);
  if (!edit.ready || (items.length === 0 && !tokens)) return null;
  return (
    <details className="more-options developer-settings">
      <summary>{t("addons.for_developers")}</summary>
      <div className="settings-groups" aria-label={t("addons.for_developers")} id={base}>
        <p className="hint">{t("addons.dev.intro")}</p>
        {items.map((item) => {
          const gate = switchOf(item, edit.items);
          return (
            <SettingRow
              key={item.key}
              item={item}
              idPrefix="dev-"
              draft={edit.draftOf(item)}
              onChange={(draft) => edit.edit(item.key, draft)}
              commit={(draft) => void edit.commit(item, draft)}
              onReset={() => void edit.reset(item)}
              problem={edit.problems[item.key]}
              beside
              disabled={false}
              depth={0}
              gate={gate && isOff(gate, { [gate.key]: edit.draftOf(gate) }) ? gate : null}
              canList={false}
            />
          );
        })}
        {tokens && <ReleaseTokens item={tokens} edit={edit} />}
      </div>
    </details>
  );
}

/** The access keys for hosts that keep private downloads: each host with where its key is kept, and a way to add or remove one. */
function ReleaseTokens(props: { item: Item; edit: ReturnType<typeof useSettingEdits> }) {
  const { t } = useWords();
  const { item, edit } = props;
  const [host, setHost] = useState("");
  const [where, setWhere] = useState("");
  const [problem, setProblem] = useState("");
  const id = useId();
  const held = (item.value && typeof item.value === "object" ? item.value : {}) as Record<string, string>;
  const words = (reference: string) =>
    reference.startsWith("env:")
      ? t("secret.read_from_env", { name: reference.slice(4) })
      : reference.startsWith("file:")
        ? t("secret.read_from_file", { name: reference.slice(5) })
        : t("secret.read_from_other");
  const add = async () => {
    const name = host.trim().toLowerCase();
    const reference = asReference(where);
    if (!name || /[\s/]/.test(name)) return setProblem(t("addons.dev.tokens.host_bad"));
    if (!/^(env|file):\S/.test(reference)) return setProblem(t("addons.dev.tokens.where_bad"));
    setProblem("");
    if (await edit.save(item.key, { changes: { [item.key]: { ...held, [name]: reference } } }, t("addons.dev.tokens.saved", { host: name }))) {
      setHost("");
      setWhere("");
    }
  };
  const remove = (name: string) => {
    const rest = Object.fromEntries(Object.entries(held).filter(([host]) => host !== name));
    void edit.save(item.key, { changes: { [item.key]: rest } }, t("addons.dev.tokens.removed", { host: name }));
  };
  const shown = problem || edit.problems[item.key];
  return (
    <div className="setting beside" data-key={item.key} role="group" aria-labelledby={`${id}-label`}>
      <div className="setting-main" data-main>
        <div className="setting-head">
          <span className="setting-label" id={`${id}-label`}>
            {t(`settings.key.${TOKENS}`)}
          </span>
        </div>
        {Object.keys(held).length === 0 ? (
          <p className="hint">{t("addons.dev.tokens.none")}</p>
        ) : (
          <ul className="plain-list">
            {Object.entries(held)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([name, reference]) => (
                <li key={name} className="inline-field">
                  <span>{t("addons.dev.tokens.line", { host: name, where: words(reference) })}</span>
                  <button type="button" className="btn quiet small" aria-label={t("addons.dev.tokens.remove_named", { host: name })} onClick={() => remove(name)}>
                    {t("addons.catalog_remove")}
                  </button>
                </li>
              ))}
          </ul>
        )}
        <div className="inline-field">
          <label htmlFor={`${id}-host`}>{t("addons.dev.tokens.host")}</label>
          <input id={`${id}-host`} type="text" value={host} autoComplete="off" onChange={(e) => setHost(e.target.value)} />
          <label htmlFor={`${id}-where`}>{t("addons.dev.tokens.where")}</label>
          <input id={`${id}-where`} type="text" value={where} autoComplete="off" onChange={(e) => setWhere(e.target.value)} />
          <button type="button" className="btn" disabled={!host.trim() || !where.trim()} onClick={() => void add()}>
            {t("addons.dev.tokens.add")}
          </button>
        </div>
        {shown && (
          <p className="problem-note" role="alert">
            {shown}
          </p>
        )}
      </div>
      <div className="setting-help" data-help>
        <p className="hint">{t("addons.dev.tokens.hint")}</p>
      </div>
    </div>
  );
}
