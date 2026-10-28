// The All / Personal / <side> choice beside the heading of every list that can hold both sides (design 6.32, 7.8): Today,
// What changed, Handled for you, Follow-ups, To-dos, People and Files. One option for each side of the person's work. It is
// there only for a person who has set one, and nothing is drawn without a side; the pick is the same on every screen and is
// remembered on this browser. A screen that has something waiting for the person passes it as `waiting`, and each choice
// then says how many wait in it, in words for a screen reader.
import { useSideFilter, type SideChoice } from "../lib/sides";
import { useTabCounts, type WaitingScreen } from "../lib/waiting";
import { useWords } from "../lib/wording";
import { SegmentedControl } from "../ui/SegmentedControl";

export function SideFilter(props: { waiting?: WaitingScreen }) {
  const { t, tn } = useWords();
  const filter = useSideFilter();
  const counted = useTabCounts(props.waiting ?? "changed");
  if (!filter.offered) return null;
  const option = (value: SideChoice, label: string) => {
    const count = props.waiting ? counted(value) : 0;
    return { value, label, count, countWords: count ? tn("sides.filter.waiting", count) : undefined };
  };
  return (
    <SegmentedControl<SideChoice>
      label={t("sides.filter.label")}
      value={filter.choice}
      onChange={filter.set}
      options={[option("all", t("sides.filter.all")), ...filter.options.map((o) => option(o.id, o.name))]}
    />
  );
}
