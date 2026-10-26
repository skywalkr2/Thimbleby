// The panels running add-ons put on Today (design 7.7, a panel whose tab is "today"): each below the rail's cards, folded to
// one line that opens it. They are the add-on's own, so they are not counted among the cards and never decide whether the
// rail is empty.
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { api, type S } from "../lib/api";
import { Panel } from "./Panel";
import styles from "./Today.module.css";

function Folded(props: { panel: S["PanelView"]; onOpenRecord: (kind: string, id: string) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className={styles.fold} aria-labelledby={`${id}-head`} data-plugin-panel={props.panel.name}>
      <h2 id={`${id}-head`} className={styles.foldHead}>
        <button type="button" className={styles.foldToggle} aria-expanded={open} aria-controls={`${id}-body`} onClick={() => setOpen(!open)}>
          {props.panel.title}
        </button>
      </h2>
      {open && (
        <div id={`${id}-body`} className={styles.railBody}>
          <Panel name={props.panel.name} embedded onOpenRecord={props.onOpenRecord} />
        </div>
      )}
    </section>
  );
}

/** The add-ons' Today panels, one folded line each; nothing when there are none. */
export function PluginPanels(props: { onOpenRecord: (kind: string, id: string) => void }) {
  const panels = useQuery({ queryKey: ["panels"], queryFn: () => api.panels() });
  const mine = (panels.data ?? []).filter((p) => p.tab === "today");
  if (mine.length === 0) return null;
  return (
    <div data-col="plugin-panels" className={styles.pluginPanels}>
      {mine.map((panel) => (
        <Folded key={panel.name} panel={panel} onOpenRecord={props.onOpenRecord} />
      ))}
    </div>
  );
}
