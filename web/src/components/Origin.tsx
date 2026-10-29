// "Where it came from" on an action, a question or a decision (design 7.5). The server decides what exists, in this
// order: the original page (shown with its real domain), the saved text of the input, or the change that made the item
// with the request behind it in What changed. An item with no origin shows no link.
import { useQuery } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { api, type S } from "../lib/api";
import { dayAndTime } from "../lib/dates";
import { revealOrKeep } from "../lib/reveal";
import { toHash } from "../lib/views";
import { useWords } from "../lib/wording";
import { ModalPanel, restoreFocus, DialogFooter } from "./ModalPanel";
import { SafeLink } from "./SafeText";
import { SourceLimit } from "./SourceLimit";
import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";
/** Whether an origin has a link to show: a line that holds it must not leave a dot beside nothing when it has none. */
export function hasOrigin(origin?: S["Origin"] | null): boolean {
  if (!origin) return false;
  return (origin.kind === "link" && !!origin.url) || (origin.kind === "source" && !!origin.source) || (origin.kind === "change" && !!origin.changeset);
}

function isOwnAddress(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === window.location.hostname || ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
  } catch {
    return false;
  }
}

export function OriginLink(props: {
  origin?: S["Origin"] | null;
  /** The link's words, when they are more than "Where it came from". */
  label?: string;
  /** Sits in a line of words after a separator, so it is a span and not a block that would strand the separator. */
  inline?: boolean;
}) {
  const { t } = useWords();
  const origin = props.origin;
  if (!origin) return null;
  const Box = props.inline ? "span" : "div";
  const kind = props.inline ? "origin inline" : "origin";
  // An address of this app itself is not an outside page: it opens the saved text like any input.
  if (origin.kind === "link" && origin.url && origin.source && isOwnAddress(origin.url)) {
    return <SourceLink source={origin.source} label={props.label} as={Box} className={kind} />;
  }
  if (origin.kind === "link" && origin.url) {
    return (
      <Box className={kind}>
        <SafeLink label={props.label ?? t("origin.link")} url={origin.url} />
      </Box>
    );
  }
  if (origin.kind === "source" && origin.source) return <SourceLink source={origin.source} label={props.label} as={Box} className={kind} />;
  if (origin.kind === "change" && origin.changeset) return <ChangeLink changeset={origin.changeset} label={props.label} as={Box} className={kind} />;
  return null;
}

/** Opens the saved text of the input in a dialog. */
function SourceLink(props: { source: string; label?: string; as: "div" | "span"; className: string }) {
  const { t } = useWords();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    restoreFocus(() => button.current);
  };
  const Box = props.as;
  return (
    <Box className={props.className}>
      <button ref={button} type="button" className="link-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {props.label ?? t("origin.link")}
      </button>
      {open && <SourceDialog source={props.source} onClose={close} />}
    </Box>
  );
}

function SourceDialog(props: { source: string; onClose: () => void }) {
  const { t } = useWords();
  const titleId = useId();
  const source = useQuery({ queryKey: ["source", props.source], queryFn: () => api.source(props.source) });
  const s = source.data;
  return (
    <ModalPanel titleId={titleId} onClose={props.onClose} dismissable>
      <h2 id={titleId}>{t("origin.title")}</h2>
      {source.isPending ? (
        <Skeleton rows={2} />
      ) : source.isError || !s ? (
        <p className="hint">{t("source.missing")}</p>
      ) : (
        <div className="source">
          <div className="src">
            {s.title} · {dayAndTime(s.received_at)}
            {s.trust === "untrusted" && <span className="tag">{t("source.outside")}</span>}
          </div>
          {s.limit && <SourceLimit source={props.source} limit={s.limit} />}
          {s.text ? <div className="source-text">{s.text}</div> : <p className="hint">{t("source.not_kept")}</p>}
        </div>
      )}
      <DialogFooter>
        <Button variant="primary" autoFocus onClick={props.onClose}>
          {t("origin.close")}
        </Button>
      </DialogFooter>
    </ModalPanel>
  );
}

/** Opens the change in What changed: on this screen when the list is here, else on that screen. */
function ChangeLink(props: { changeset: string; label?: string; as: "div" | "span"; className: string }) {
  const { t } = useWords();
  const Box = props.as;
  return (
    <Box className={props.className}>
      <button
        type="button"
        className="link-button"
        onClick={() => {
          if (!revealOrKeep("changeset", props.changeset)) window.location.hash = toHash("work/changed");
        }}
      >
        {props.label ?? t("origin.link")}
      </button>
    </Box>
  );
}
