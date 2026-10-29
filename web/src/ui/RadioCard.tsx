// A choice drawn as a card (design 7.12, VC11): a title, the words under it in full (never cut short), and an optional tag
// ("Recommended"). One level only: a card holds no card. The chosen card has a 2px accent ring and a soft tint; an unchosen one
// has a hairline, not a heavy border. It is a real radio button inside, hidden but focusable, so the keyboard, the group's
// arrow keys and a screen reader work as they do for any radio; the card is its label.
import type { ComponentPropsWithRef, ReactNode } from "react";
import styles from "./RadioCard.module.css";

export interface RadioCardProps extends Omit<ComponentPropsWithRef<"input">, "type" | "title"> {
  title: ReactNode;
  /** The words under the title. */
  description?: ReactNode;
  /** A small mark before the title: "Recommended". */
  tag?: ReactNode;
}

export function RadioCard(props: RadioCardProps) {
  const { title, description, tag, className, ...rest } = props;
  return (
    <label className={[styles.card, className ?? ""].filter(Boolean).join(" ")} data-radio-card="" data-chosen={rest.checked ? "" : undefined} data-disabled={rest.disabled ? "" : undefined}>
      <input {...rest} type="radio" className={styles.input} />
      <span className={styles.body}>
        {tag && (
          <>
            <span className={styles.tag}>{tag}</span>{" "}
          </>
        )}
        <strong className={styles.title}>{title}</strong>
        {description && (
          <>
            {" "}
            <span className={styles.description} data-radio-description="">
              {description}
            </span>
          </>
        )}
      </span>
    </label>
  );
}

/** The cards of one choice, side by side where they fit and one under another where they do not. */
export function RadioCards(props: { children: ReactNode; className?: string; ref?: ComponentPropsWithRef<"div">["ref"] }) {
  return (
    <div ref={props.ref} className={[styles.cards, props.className ?? ""].filter(Boolean).join(" ")} data-radio-cards="">
      {props.children}
    </div>
  );
}
