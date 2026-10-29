// The items inside an open row (design 7.14): the parts of a request, the questions of a person, the steps of a stage. They
// are divided by dashed hairlines, never boxed. An Item holds what it is on the left and its actions at the right; anything
// else it carries (a form, what was learned) runs under them. In a pane (`pane`) the actions go under the words.
import type { HTMLAttributes, Ref } from "react";
import styles from "./ItemList.module.css";

export function ItemList(props: HTMLAttributes<HTMLUListElement> & { pane?: boolean }) {
  const { pane, className, ...rest } = props;
  return <ul {...rest} data-item-list="" data-pane={pane ? "" : undefined} className={[styles.list, className ?? ""].filter(Boolean).join(" ")} />;
}

/** `row` puts the item in the keyboard loop (the cursor can stop on it); `single` is an item with no actions. */
export function Item(props: HTMLAttributes<HTMLLIElement> & { row?: boolean; single?: boolean; ref?: Ref<HTMLLIElement> }) {
  const { row, single, className, ...rest } = props;
  return (
    <li
      {...(row ? { "data-row": "", tabIndex: -1 } : {})}
      {...rest}
      data-item=""
      className={[styles.item, single ? styles.single : "", className ?? ""].filter(Boolean).join(" ")}
    />
  );
}
