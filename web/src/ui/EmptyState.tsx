// An empty state (design 7.12): a centred block with a 40px icon, a title, one sentence at most 44 characters wide, and one
// action. It is used on every list, page and card, so every empty place looks the same. A screen with a single sentence gives
// `text` alone; a title is for the place that can name what it holds. Controls that need data are not shown while empty. In a
// rail card (`inline`) it is one line with no icon.
import type { HTMLAttributes, ReactNode } from "react";
import { Button, ButtonLink } from "./Button";
import { Icon, type IconName } from "./Icon";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** What this place holds, in a few words: the 16px title. */
  title?: string;
  /** One sentence: what will appear, or why nothing does. */
  text?: ReactNode;
  /** The one button; omit it only where nothing can be done from here. It is the screen's primary only when the screen has no other (`primary`). */
  action?: { label: string; onClick?: () => void; href?: string; primary?: boolean } | null;
  /** One line, for a rail card. */
  inline?: boolean;
  /** The 40px icon; every full empty state has one. */
  icon?: IconName;
  children?: ReactNode;
}

export function EmptyState(props: EmptyStateProps) {
  const { title, text, action, inline, icon, className, children, ...rest } = props;
  const classes = [styles.empty, inline ? styles.inline : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <div {...rest} className={classes} data-empty="">
      {!inline && (
        <span className={styles.glyph} aria-hidden="true">
          <Icon name={icon ?? "inbox"} size={20} />
        </span>
      )}
      {title && <p className={styles.title}>{title}</p>}
      {text && <p className={styles.text}>{text}</p>}
      {children}
      {action &&
        (action.href ? (
          <ButtonLink size={inline ? "sm" : "md"} variant={action.primary ? "primary" : "secondary"} href={action.href}>
            {action.label}
          </ButtonLink>
        ) : (
          <Button size={inline ? "sm" : "md"} variant={action.primary ? "primary" : "secondary"} onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}
