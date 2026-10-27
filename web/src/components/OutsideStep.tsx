// The warning at an outward step whose words came from an email (design 7.7): a link to open, a bill to pay, an address to
// send to. It says where the step came from and what to check first, in the wording sheet's words.
import { useWords } from "../lib/wording";

export function OutsideStep(props: { word: "outside.step.send" | "outside.step.open" | "outside.step.pay"; className?: string }) {
  const { t } = useWords();
  return (
    <p className={props.className ?? "hint"} data-outside-step="">
      {t(props.word)}
    </p>
  );
}
