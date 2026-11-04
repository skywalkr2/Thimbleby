// The way back from a page to the one it was opened from (design 7.12): one quiet button with a chevron pointing back, drawn the
// same on every page that has one (a record, a to-do's page, Knowledge's rules, Settings' sub-pages), so the page-to-page way back
// is never a bare "Back" on one page and a crumb on the next. A page header takes it as `back`.
import { Button } from "./Button";
import styles from "./BackLink.module.css";

export function BackLink(props: { label: string; onClick: () => void; /** The name for a screen reader, when it says more than the label ("Back to Today"). */ name?: string }) {
  return (
    <span className={styles.back} data-back-link="">
      <Button size="sm" variant="quiet" icon="chevron" aria-label={props.name} onClick={props.onClick}>
        {props.label}
      </Button>
    </span>
  );
}
