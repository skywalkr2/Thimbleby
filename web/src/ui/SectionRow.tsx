// A part of a list that is a heading with its content under it (design 7.13, 7.14): one person's messages, one project's
// items. In the list it is a row (the heading and a meta line) with its content under it; in the detail pane beside the list the
// pane's own heading says whose it is, so it is the content alone. It is not a stop of the keyboard loop: it only holds a list.
import type { LiHTMLAttributes, ReactNode, Ref } from "react";
import { Row } from "./Row";
import { RowBody } from "./RowBody";
import { DetailItem } from "./RowList";

export function SectionRow(
  props: Omit<LiHTMLAttributes<HTMLLIElement>, "title"> & {
    pane?: boolean;
    title: ReactNode;
    /** The id of the title's own text, which names the row. */
    titleId?: string;
    /** The id of a heading inside `title`, when it already has one. */
    labelledBy?: string;
    meta?: ReactNode | ReactNode[];
    children: ReactNode;
    ref?: Ref<HTMLLIElement>;
  },
) {
  const { pane, title, titleId, labelledBy, meta, children, ...rest } = props;
  if (pane) {
    return (
      <DetailItem {...rest}>
        <RowBody pane>{children}</RowBody>
      </DetailItem>
    );
  }
  return (
    <Row {...rest} loop={false} aria-labelledby={labelledBy ?? titleId} title={title} titleId={titleId} meta={meta}>
      <RowBody>{children}</RowBody>
    </Row>
  );
}
