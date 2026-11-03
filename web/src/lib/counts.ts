// A count as the screen writes it (design 7.12, "Large counts"): the number itself up to a limit, and the limit with a plus
// after it above that ("99+"), so a count never grows a pill past its row or a menu entry past its width. The number a screen
// reader hears is the real one: callers keep the exact figure in the accessible name.

/** The largest count written in full. */
export const COUNT_MAX = 99;

/** A count for the eye: "7", "99", "99+". */
export function countText(n: number, max: number = COUNT_MAX): string {
  return n > max ? `${max}+` : String(n);
}
