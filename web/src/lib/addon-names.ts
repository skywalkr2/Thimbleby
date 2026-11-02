// An add-on's name for showing, the same on every screen: the name its catalog gives it, else the wording sheet's, else its own
// name made readable. The Add-ons lists and the Settings menu all use this one, so one add-on never has three names.
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { addonLabel } from "./settings";
import { useWords } from "./wording";

export function useAddonName(): (name: string) => string {
  const { t, has } = useWords();
  const packs = useQuery({ queryKey: ["packs"], queryFn: api.packs });
  const titles = new Map((packs.data?.available ?? []).map((p) => [p.id, p.name]));
  return (name) => titles.get(name) || addonLabel(name, t, has);
}
