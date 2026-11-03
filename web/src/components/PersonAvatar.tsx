// A person's initials on a round disc in the color of the side they belong to (design 7.12). It is for the eye only: the name
// stands beside it. A person on more than one side takes the first side's color; one on none takes the quiet color.
import styles from "./PersonAvatar.module.css";

/** Up to two letters: the first letters of the first and last words of the name. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : (Array.from(words[0])[1] ?? "");
  return `${first}${last}`.toLocaleUpperCase();
}

export function PersonAvatar(props: { name: string; /** 1 to 5, the side's slot, or none */ slot?: number | null; size?: "md" | "lg" }) {
  return (
    <span className={styles.avatar} data-avatar="" data-size={props.size ?? "lg"} data-slot={props.slot ?? undefined} aria-hidden="true">
      {initialsOf(props.name)}
    </span>
  );
}
