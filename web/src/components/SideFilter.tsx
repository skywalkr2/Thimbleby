// The All / Personal / <side> choice beside the heading of every list that can hold both sides (design 6.32, 7.8): Today,
// What changed, Handled for you, Follow-ups, To-dos, People and Files. One option for each side of the person's work. It is
// there only for a person who has set one, and nothing is drawn without a side; the pick is the same on every screen and is
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
