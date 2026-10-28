// The All / <area> choice beside Today's heading (design 6.32): one Today across the areas of life, narrowed to one area when the
// person picks it. Drawn only while Today's lines are in more than one place; every line carries its area as a tag.
import { useAreaFilter, type AreaChoice } from "../lib/area-filter";
import { useWords } from "../lib/wording";
import { SegmentedControl } from "../ui/SegmentedControl";

export function AreaFilter() {
  const { t } = useWords();
  const filter = useAreaFilter();
  if (!filter.offered) return null;
  return (
    <SegmentedControl<AreaChoice>
      label={t("areas.filter.label")}
      value={filter.choice}
      onChange={filter.set}
      options={[{ value: "all", label: t("areas.filter.all") }, ...filter.options.map((o) => ({ value: o.id, label: o.name }))]}
    />
  );
}
