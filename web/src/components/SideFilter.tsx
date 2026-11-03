// The All / Personal / <side> choice beside the heading of every list that can hold both sides (design 6.32, 7.8): Today,
// What changed, Handled for you, Follow-ups, To-dos, People and Files. One option for each side of the person's work. It is
// there only for a person who has set one, and nothing is drawn without a side; the pick is the same on every screen and is
// remembered on this browser. A screen that has something waiting for the person passes it as `waiting`, and each choice
// then says how many wait in it, in words for a screen reader.
import { useIsNarrow } from "../lib/media";
import { useSideFilter, type SideChoice } from "../lib/sides";
import { useTabCounts, type WaitingScreen } from "../lib/waiting";
import { useWords } from "../lib/wording";
import { Select } from "../ui/Select";
import { SegmentedControl } from "../ui/SegmentedControl";

export function SideFilter(props: { waiting?: WaitingScreen }) {
  const { t, tn } = useWords();
  const filter = useSideFilter();
  const counted = useTabCounts(props.waiting ?? "changed");
  const narrow = useIsNarrow();
  if (!filter.offered) return null;
  const option = (value: SideChoice, label: string) => {
    const count = props.waiting ? counted(value) : 0;
    return { value, label, count, countWords: count ? tn("sides.filter.waiting", count) : undefined };
  };
  const options = [
    option("all", t("sides.filter.all")),
    // A side's views follow it, each named with its side so a choice is never a bare name.
    ...filter.options.flatMap((o) => [option(o.id, o.name), ...filter.views.filter((v) => v.side === o.id).map((v) => option(v.id, t("sides.filter.view", { side: v.sideName, view: v.name })))]),
  ];
  // On a phone the choices are a list to pick from, one control as wide as the window at most, however long the names are:
  // a row of chips with long names has no room.
  if (narrow) {
    return (
      <Select aria-label={t("sides.filter.label")} value={filter.picked} onChange={(e) => filter.set(e.target.value as SideChoice)} data-side-select="">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.count ? `${o.label} (${o.countWords ?? o.count})` : o.label}
          </option>
        ))}
      </Select>
    );
  }
  return <SegmentedControl<SideChoice> label={t("sides.filter.label")} value={filter.picked} onChange={filter.set} options={options} />;
}
