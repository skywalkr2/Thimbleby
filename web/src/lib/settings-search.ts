// What was typed in the search box of a page that has no settings to search (Connections, Add-ons, what each account can do):
// the box hands it to Settings, which opens with that search already made. Held once, read once.
let pending = "";

/** Keeps what was typed for the Settings page that opens next. */
export function handOffSearch(query: string): void {
  pending = query;
}

/** What was handed off, once: the next read finds nothing. */
export function takeSearch(): string {
  const query = pending;
  pending = "";
  return query;
}
