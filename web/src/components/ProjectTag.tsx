// An action's project as a small tag, with the project it is part of when there is one ("Parent › Project"). An item filed on
// a side and in none of its projects shows the side as "<side>: not in a project", never as a project (design 6.32). Shared by
// every list that shows an action, so the same row reads the same everywhere (design 7.5, 7.7).
import { usePlaceText, type Place } from "../lib/place";
import styles from "./ProjectTag.module.css";

export function ProjectTag(props: Place & { className?: string }) {
  const text = usePlaceText()(props);
  if (!text) return null;
  return (
    <span className={props.className ?? styles.project} data-tag="">
      {text}
    </span>
  );
}
