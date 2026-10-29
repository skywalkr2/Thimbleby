// A search box (design 7.12): a magnifier and a placeholder in the box, and its label kept for screen readers only. The
// label's words are the placeholder unless `placeholder` says something shorter. A search box never has the cursor when a
// screen opens; the person puts it there (the search key does).
import type { ComponentPropsWithRef } from "react";
import { Icon } from "./Icon";
import styles from "./SearchField.module.css";

export interface SearchFieldProps extends Omit<ComponentPropsWithRef<"input">, "type" | "onChange" | "value" | "id"> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function SearchField(props: SearchFieldProps) {
  const { id, label, value, onChange, className, placeholder, ...rest } = props;
  return (
    <div className={[styles.search, className ?? ""].filter(Boolean).join(" ")} data-field="" data-search="">
      <label htmlFor={id} className="sr">
        {label}
      </label>
      <span className={styles.icon} aria-hidden="true">
        <Icon name="search" size={16} />
      </span>
      <input {...rest} id={id} type="search" autoComplete="off" placeholder={placeholder ?? label} value={value} onChange={(e) => onChange(e.target.value)} className={styles.input} />
    </div>
  );
}
