// How the screens word the backup state (design 4.15, 7.1, 7.7): the same words in the status popover and Today's line.
import type { S } from "./api";

type T = (key: string, vars?: Record<string, string | number>) => string;

/** How long ago the last backup was, in words; null when none has succeeded. */
export function backupAge(b: { age_hours: number | null }, t: T): string | null {
  if (b.age_hours === null) return null;
  const h = b.age_hours;
  const hours = Math.floor(h);
  return h < 1 ? t("age.under_hour") : h < 48 ? t(`age.hours.${hours === 1 ? "one" : "other"}`, { n: hours }) : t("age.days", { n: Math.floor(h / 24) });
}

/** The backup in one phrase: none set up, none yet, the last one failed, overdue, or how long ago it ran. */
export function backupText(b: S["BackupStatus"], t: T): string {
  if (!b.configured) return t("backup.none");
  const age = backupAge(b, t);
  const text = age === null ? (b.last_error ? t("backup.failed") : t("backup.never")) : b.needs_attention ? t("backup.overdue", { age }) : t("backup.ok", { age });
  return b.encrypted ? `${text} · ${t("backup.encrypted")}` : text;
}

/** How the backup stands, for the state mark: a danger when the last try failed, a warning when one is due, fine when it is
 * recent, and quiet when none is set up. */
export function backupTone(b: S["BackupStatus"]): "ok" | "warn" | "danger" | "neutral" {
  if (!b.configured) return "neutral";
  if (b.last_error) return "danger";
  return b.needs_attention ? "warn" : "ok";
}

/** A folder by its own name, the last part of its path (a trailing separator ignored), for where a full path would crowd the page. */
export function folderName(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] ?? path;
}
