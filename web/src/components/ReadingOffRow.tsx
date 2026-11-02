// Today's line for a connection that can't be read because the add-on it needs isn't running (design 6.12, 7.9): reading has
// stopped, and nothing else on the screen says so. It starts with the verb, names the add-on the way Add-ons does, and opens
// Add-ons, where it is turned on or found. One line for each add-on, however many connections need it.
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAddonName } from "../lib/addon-names";
import { settingsView, type View } from "../lib/views";
import { useWords } from "../lib/wording";
import { Button } from "../ui/Button";
import { Row } from "../ui/Row";
import { addonOfConnector } from "./MissingAddon";

/** The add-ons whose connections are switched on but can't be read, each with how many and whether it is installed. */
export function useReadingOff() {
  const sources = useQuery({ queryKey: ["watch"], queryFn: api.watchSources });
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const counts = new Map<string, number>();
  for (const s of sources.data ?? []) {
    const plugin = addonOfConnector(s.connector ?? "");
    if (s.enabled && !s.connector_label && plugin) counts.set(plugin, (counts.get(plugin) ?? 0) + 1);
  }
  const installed = new Set((packs.data?.installed ?? []).map((i) => i.name));
  return [...counts].map(([plugin, count]) => ({ plugin, count, installed: installed.has(plugin) }));
}

export function ReadingOffRows(props: { onView?: (view: View) => void }) {
  const { t, tn } = useWords();
  const nameOf = useAddonName();
  return (
    <>
      {useReadingOff().map((off) => (
        <Row
          key={off.plugin}
          aria-label={nameOf(off.plugin)}
          data-reading-off={off.plugin}
          title={tn(off.installed ? "today.reading_off.turn_on" : "today.reading_off.install", off.count, { name: nameOf(off.plugin) })}
          oneLine
          primary={
            <Button size="sm" variant="primary" data-key="primary" onClick={() => props.onView?.(settingsView("addons"))}>
              {t("today.reading_off.open")}
            </Button>
          }
        />
      ))}
    </>
  );
}
