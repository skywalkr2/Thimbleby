// The one button (design 7.12): three weights. Primary is the solid one: the likeliest next step of a region, and one per
// region. Secondary is the outline, for the other visible actions. Quiet is plain text, for a way out or a small extra.
// A row's actions are never solid: inside a row (ui/Row) a primary draws as an outline. `danger` is the primary weight in
// the danger colour, for a confirm that cannot be undone, never in a row. A disabled button says why (`reason`), beside it
// and wired to it for screen readers; a disabled primary still reads as a primary, and nothing is shown by opacity alone.
// `ButtonLink` is the same button drawn as a link, for something that opens a page.
import { useId, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export type ButtonSize = "md" | "sm";

interface Look {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A leading icon. */
  icon?: IconName;
}

export interface ButtonProps extends Look, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** A spinner replaces the icon; the label stays and the button does nothing until it is done. */
  loading?: boolean;
  /** Why the button is disabled, shown beside it. Ignored while it is enabled. */
  reason?: string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

function classesOf(variant: ButtonVariant, size: ButtonSize, extra: Array<string | false | undefined>): string {
  return [styles.btn, styles[variant], size === "sm" ? styles.sm : "", ...extra].filter(Boolean).join(" ");
}

export function Button(props: ButtonProps) {
  const { variant = "secondary", size = "md", icon, loading, reason, disabled, className, children, onClick, ref, ...rest } = props;
  const hintId = useId();
  const hint = disabled && reason ? reason : null;
  const button = (
    <button
      type="button"
      {...rest}
      ref={ref}
      className={classesOf(variant, size, [loading && styles.loading, className])}
      disabled={disabled}
      aria-busy={loading || rest["aria-busy"]}
      aria-describedby={[rest["aria-describedby"], hint ? hintId : null].filter(Boolean).join(" ") || undefined}
      onClick={loading ? undefined : onClick}
      data-variant={variant}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
  if (!hint) return button;
  return (
    <span className={styles.wrap}>
      {button}
      <p id={hintId} className={styles.reason}>
        {hint}
      </p>
    </span>
  );
}

export interface ButtonLinkProps extends Look, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  children: ReactNode;
  ref?: Ref<HTMLAnchorElement>;
}

export function ButtonLink(props: ButtonLinkProps) {
  const { variant = "secondary", size = "md", icon, className, children, ref, ...rest } = props;
  return (
    <a {...rest} ref={ref} className={classesOf(variant, size, [className])} data-variant={variant}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </a>
  );
}
