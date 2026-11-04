// A page the address names that this copy of the app doesn't have (a development page in a real workspace, or an address nobody
// knows: the Not here page): it says so
// in a sentence and offers the way back, never a blank page. The cursor starts on its heading (design 7.1).
import { useEffect, useRef } from "react";
import { useWords } from "../lib/wording";
import { EmptyState } from "../ui/EmptyState";
import { PageHeader } from "../ui/PageHeader";

export function NotAvailable(props: { title: string; onBack: () => void; /** The sentence, when it is not the general one. */ text?: string; /** The way back's label. */ back?: string }) {
  const { t } = useWords();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <section className="panel-section" aria-labelledby="not-available-title" data-not-available="">
      <PageHeader id="not-available-title" headingRef={heading} focusable title={props.title} />
      <EmptyState text={props.text ?? t("not_available.text")} action={{ label: props.back ?? t("quality.back"), onClick: props.onBack }} />
    </section>
  );
}
