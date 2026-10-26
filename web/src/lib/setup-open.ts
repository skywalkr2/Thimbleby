// Whether first-run setup is still open (design 7.7). While it is, the setup line is the one place that offers to connect
// mail or a calendar, so no card of Today offers it too. Until the answer is known setup counts as open, so a connect
// button never flashes up and goes away.
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export function useSetupOpen(): boolean {
  const setup = useQuery({ queryKey: ["setup"], queryFn: api.setup });
  return setup.isPending || (!!setup.data && !setup.data.finished);
}
