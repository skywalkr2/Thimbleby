// Wording helpers for files: sizes and accepted types in plain words.
import { useWords } from "./wording";

export function useSize() {
  const { t } = useWords();
  return (bytes: number): string => {
    const one = (n: number) => (n >= 10 || Number.isInteger(n) ? Math.round(n) : Math.round(n * 10) / 10);
    if (bytes < 1024) return t("size.b", { n: bytes });
    if (bytes < 1024 ** 2) return t("size.kb", { n: one(bytes / 1024) });
    if (bytes < 1024 ** 3) return t("size.mb", { n: one(bytes / 1024 ** 2) });
    return t("size.gb", { n: one(bytes / 1024 ** 3) });
  };
}

/** The kind of file a media type is, for saying what is accepted without naming types. */
export function fileGroup(type: string): "picture" | "sound" | "font" | "document" {
  if (type.startsWith("image/")) return "picture";
  if (type.startsWith("audio/")) return "sound";
  if (type.startsWith("font/")) return "font";
  return "document";
}

/** What a file kind accepts, in words and never as media types: "Any document, picture or sound file" when it takes all
 * three, else the kinds it takes ("Picture files only"), each with the size limit. */
export function useAcceptWords() {
  const { t } = useWords();
  return (types: string[], max: number): string => {
    const groups = new Set(types.map(fileGroup));
    if (groups.has("document") && groups.has("picture") && groups.has("sound")) return t("addfile.accepts_any", { max });
    const named = ["document", "picture", "sound", "font"].filter((g) => groups.has(g as ReturnType<typeof fileGroup>)).map((g) => t(`media.group.${g}`));
    const list = named.length < 2 ? named.join("") : t("media.list", { first: named.slice(0, -1).join(", "), last: named[named.length - 1] });
    return t("addfile.accepts_some", { types: list, max });
  };
}
