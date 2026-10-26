// The All / Personal / <side> choice beside the heading of Today and of Follow-ups (design 6.32): one option for each side
// of the person's work. It is there only for a person who has set one; the pick is the same on both screens and is
// remembered on this browser.
import { useSideFilter, type SideChoice } from "../lib/sides";
import { useWords } from "../lib/wording";
import { SegmentedControl } from "../ui/SegmentedControl";

export function SideFilter() {
  const { t } = useWords();
  const filter = useSideFilter();
  if (!filter.offered) return null;
  return (
    <SegmentedControl<SideChoice>
      label={t("sides.filter.label")}
      value={filter.choice}
      onChange={filter.set}
      options={[
        { value: "all", label: t("sides.filter.all") },
        ...filter.options.map((o) => ({ value: o.id, label: o.name })),
      ]}
    />
  );
}
