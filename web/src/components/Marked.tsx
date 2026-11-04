// A text with the words a search matched marked in it: each place the typed words occur (any case) is wrapped in a `mark`, so
// a person sees why a result is there. The text itself is unchanged, so a screen reader reads it as it was.
import type { ReactNode } from "react";

export function Marked(props: { text: string; query?: string }): ReactNode {
  const words = (props.query ?? "")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
  if (words.length === 0) return props.text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = props.text.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part));
}
