// Removing something the person set up asks first (UI rules): a dialog that names what goes, says what stays, and has one
// way to go on and one to cancel. The cursor starts on its heading (ModalPanel), and Escape cancels.
import { useId, type ReactNode } from "react";
import { Heading } from "react-aria-components";
import { Button } from "../ui/Button";
import { DialogFooter, ModalPanel } from "./ModalPanel";
import { useWords } from "../lib/wording";

export function ConfirmRemove(props: {
  title: string;
  /** What goes, and what stays. */
  children: ReactNode;
  /** The words on the button that goes on. */
  go: string;
  busy?: boolean;
  onGo: () => void;
  onCancel: () => void;
}) {
  const { t } = useWords();
  const titleId = useId();
  return (
    <ModalPanel titleId={titleId} onClose={props.onCancel}>
      <Heading slot="title" id={titleId} level={2}>
        {props.title}
      </Heading>
      {props.children}
      <DialogFooter>
        <Button onClick={props.onCancel}>{t("action.cancel")}</Button>
        <Button variant="danger" loading={props.busy} onClick={props.onGo}>
          {props.go}
        </Button>
      </DialogFooter>
    </ModalPanel>
  );
}
