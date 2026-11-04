// The states of a list that reads from the server (design 7.12, "States"), the same on every screen: while it loads, skeleton
// rows at row height; when it could not be loaded, the plain reason and Try again (`LoadFailed`), with the offline words when the
// connection is down; and when it loaded once and a later read failed, what was loaded stays readable with the failure above it.
// The screen gives only what to show when there is something to show.
import type { ReactNode } from "react";
import { ApiError } from "../lib/api";
import { useConnection } from "../lib/connection";
import { useWords } from "../lib/wording";
import { LoadFailed } from "./LoadFailed";
import { Skeleton, type SkeletonRow } from "./Skeleton";

/** The parts of a query this reads; any `useQuery` result has them. */
export interface QueryLike<T> {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
  refetch: () => unknown;
}

export function ListState<T>(props: {
  query: QueryLike<T>;
  /** What could not be loaded, in the screen's words ("The to-dos couldn't be loaded."). */
  failed: string;
  /** Skeleton rows while it loads. */
  rows?: number;
  /** What the loaded list starts with (a group's label), drawn above the skeleton so the page does not shift when it loads. */
  above?: ReactNode;
  /** The skeleton's shape: rows (the default), or a table's head and rows for a screen whose list is a table. */
  shape?: "rows" | "table";
  /** What a skeleton row draws, as the loaded rows do (a lead, an end action). */
  row?: SkeletonRow;
  /** What to show once there is data. */
  children: (data: T) => ReactNode;
}) {
  const { t } = useWords();
  const connection = useConnection();
  const { query } = props;
  if (query.data !== undefined) {
    return (
      <>
        {query.isError && !connection.offline && <LoadFailed message={props.failed} detail={detailOf(query.error)} onRetry={() => void query.refetch()} />}
        {props.children(query.data)}
      </>
    );
  }
  if (query.isError) {
    return <LoadFailed message={connection.offline ? t("state.load_failed.offline", { what: props.failed }) : props.failed} detail={detailOf(query.error)} onRetry={() => void query.refetch()} />;
  }
  return (
    <>
      {props.above}
      <Skeleton rows={props.rows} shape={props.shape} row={props.row} />
    </>
  );
}

function detailOf(err: unknown): string | null {
  return err instanceof ApiError && err.detail ? err.detail : null;
}
