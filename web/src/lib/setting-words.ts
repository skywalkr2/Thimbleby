// A setting's value in the words a person reads: the one writer behind a setting's control, its default, its read-only value,
// the line after a save and every other place a setting's value is said. A choice is its label (the name of a language, a
// city, a person, a tier, today's date written that way), an amount of money is written as money, anything else as the sheet
// writes values. Nothing here shows a code the settings file holds.
import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { S } from "./api";
import { dateFormatChoices } from "./date-formats";
import { languageChoices } from "./languages";
import { useWriteAmount } from "./money";
import { formatValue, type Item } from "./settings";
import { useTierName } from "./ai-routing";
import { zoneChoices } from "./time-zones";
import { useWords } from "./wording";

type Choice = { tag: string; label: string };

export interface SettingWordsContext {
  t: (key: string, vars?: Record<string, string | number>) => string;
  has: (key: string) => boolean;
  writeAmount: (amount: number) => string;
  tierName: (tier: string) => string;
  personName: (id: string) => string;
}

/** The choices a setting offers, each with its label, in the order a person looks for them. */
export function settingChoices(item: Pick<Item, "key" | "choices" | "options">, c: SettingWordsContext): Choice[] {
  const options = item.options ?? [];
  const option = (o: string) => (c.has(`settings.option.${item.key}.${o}`) ? c.t(`settings.option.${item.key}.${o}`) : o);
  switch (item.choices) {
    case "languages":
      return languageChoices(options)
        .map((l) => ({ tag: l.tag, label: c.has(`settings.option.${item.key}.${l.tag}`) ? c.t(`settings.option.${item.key}.${l.tag}`) : l.label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    case "time_zones":
      return zoneChoices(options).map((z) => ({ tag: z.id, label: z.label }));
    case "date_formats":
    case "date_time_formats":
      return dateFormatChoices(options);
    case "people":
      return options.map((o) => ({ tag: o, label: c.personName(o) }));
    case "tiers":
      return options.map((o) => ({ tag: o, label: c.tierName(o) }));
    case "owner_formats":
      return options.map((o) => ({
        tag: o,
        label: o.replace("{full_name}", c.t("settings.owner_example_name")).replace("{team}", c.t("settings.owner_example_team")),
      }));
    case "media_types":
      return options.map((o) => ({ tag: o, label: c.has(`settings.media.${o}`) ? c.t(`settings.media.${o}`) : o }));
    default:
      return options.map((o) => ({ tag: o, label: option(o) }));
  }
}

/** A setting's value in words. */
export function settingValue(item: Pick<Item, "key" | "type" | "choices" | "options" | "money">, value: unknown, c: SettingWordsContext): string {
  if (item.type === "choice" && value !== null && value !== undefined && value !== "") {
    return settingChoices(item, c).find((o) => o.tag === String(value))?.label ?? formatValue(value, c.t);
  }
  if (item.money === true && typeof value === "number") return c.writeAmount(value);
  return formatValue(value, c.t);
}

/** The words for settings' values from a screen that already holds the people's names. */
export function useSettingWords(personName: (id: string) => string) {
  const { t, has } = useWords();
  const writeAmount = useWriteAmount();
  const tierName = useTierName();
  return useMemo(() => {
    const context: SettingWordsContext = { t, has, writeAmount, tierName, personName };
    return {
      choices: (item: Pick<Item, "key" | "choices" | "options">) => settingChoices(item, context),
      value: (item: Pick<Item, "key" | "type" | "choices" | "options" | "money">, value: unknown) => settingValue(item, value, context),
    };
  }, [t, has, writeAmount, tierName, personName]);
}

/** The same words from anywhere: the people's names are read from what the app already holds, never fetched. */
export function useSettingWordsFromCache() {
  const client = useQueryClient();
  const personName = useCallback(
    (id: string) => client.getQueryData<S["PersonView"][]>(["people"])?.find((p) => p.id === id)?.name ?? "",
    [client],
  );
  return useSettingWords(personName);
}
