// The list of rows (design 7.12, 7.14): one surface with hairline dividers, never a card per row. `detail` is the same list
// inside a pane that has its own frame, drawn with none. It is a list (`ul`) unless it is an ordered one (`ol`).
import type { HTMLAttributes, LiHTMLAttributes, Ref } from "react";
import styles from "./RowList.module.css";

export function RowList(props: HTMLAttributes<HTMLUListElement> & { as?: "ul" | "ol"; detail?: boolean }) {
  const { as: Tag = "ul", detail, className, ...rest } = props;
  return <Tag {...(rest as HTMLAttributes<HTMLOListElement>)} data-row-list="" data-detail={detail ? "" : undefined} className={[styles.list, detail ? styles.detail : "", className ?? ""].filter(Boolean).join(" ")} />;
}

/** An item of a detail list (a list inside a pane, `detail`): no frame of its own. It holds the pane's content for one thing. */
export function DetailItem(props: LiHTMLAttributes<HTMLLIElement> & { ref?: Ref<HTMLLIElement> }) {
  const { className, ...rest } = props;
  return <li {...rest} data-detail-item="" className={[styles.item, className ?? ""].filter(Boolean).join(" ")} />;
}
