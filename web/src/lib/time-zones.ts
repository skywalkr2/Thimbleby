// A time zone by its city, as a person says it: "New York (Eastern time)", never the id the settings hold
// ("America/New_York"). The city is the last part of the id; the zone's general name is the browser's own.

/** The city of a time zone id, with spaces for underscores. */
export function zoneCity(id: string): string {
  const last = id.split("/").pop() ?? id;
  return last.replace(/_/g, " ");
}

/** The zone's general name in English ("Eastern time"), or empty where the browser has none. */
function zoneName(id: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: id, timeZoneName: "longGeneric" }).formatToParts(new Date(0));
    return (parts.find((p) => p.type === "timeZoneName")?.value ?? "").replace(/ (Standard|Daylight|Summer) /, " ").replace(/ Time$/, " time");
  } catch {
    return "";
  }
}

/** "New York (Eastern time)". A zone whose general name is its city's (or that has none) shows the city alone. */
export function zoneLabel(id: string): string {
  if (!id.includes("/")) return id; // UTC and the like name no city
  const city = zoneCity(id);
  const name = zoneName(id);
  return name && name !== city && name !== id ? `${city} (${name})` : city;
}

/** The zones with their labels, in the order a person looks them up: by label. */
export function zoneChoices(ids: string[]): { id: string; label: string }[] {
  const seen = new Set<string>();
  return ids
    .filter((id) => id && !seen.has(id) && !!seen.add(id))
    .map((id) => ({ id, label: zoneLabel(id) }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"));
}

/** The zone's offset from UTC now, as a person writes it: "UTC-8", "UTC+5:30", "UTC". */
export function zoneOffset(id: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: id, timeZoneName: "shortOffset" }).formatToParts(new Date());
    return (parts.find((p) => p.type === "timeZoneName")?.value ?? "").replace("GMT", "UTC").replace("\u2212", "-");
  } catch {
    return "";
  }
}

/** Whether a zone matches what was typed: by its label, its id's words ("new york", "pacific", "america") or its offset ("utc-8"). */
export function zoneMatches(choice: { id: string; label: string }, typed: string): boolean {
  const wanted = typed.trim().toLowerCase().replace(/_/g, " ").replace(/^gmt/, "utc");
  return (
    !wanted ||
    choice.label.toLowerCase().includes(wanted) ||
    choice.id.toLowerCase().replace(/_/g, " ").includes(wanted) ||
    zoneOffset(choice.id).toLowerCase().includes(wanted)
  );
}

/** The zones of the cities most people are in, the best known first. A search lists these ahead of the rest, so the city a
 * person means is near the top and not thirtieth in an alphabetical run. */
const COMMON = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "America/Anchorage",
  "Pacific/Honolulu", "America/Toronto", "America/Vancouver", "America/Mexico_City", "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires", "America/Bogota", "America/Lima", "America/Santiago", "Europe/London", "Europe/Dublin",
  "Europe/Lisbon", "Europe/Paris", "Europe/Berlin", "Europe/Madrid", "Europe/Rome", "Europe/Amsterdam", "Europe/Stockholm",
  "Europe/Athens", "Europe/Helsinki", "Europe/Istanbul", "Europe/Moscow", "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos",
  "Africa/Nairobi", "Asia/Dubai", "Asia/Tehran", "Asia/Karachi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Bangkok", "Asia/Jakarta",
  "Asia/Singapore", "Asia/Hong_Kong", "Asia/Shanghai", "Asia/Manila", "Asia/Seoul", "Asia/Tokyo", "Australia/Perth",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland", "UTC",
];

/** The zones that match what was typed, the likeliest first: the well-known cities, then those matching by the city or the
 * zone's name, then those matching only by their region or offset, each group by label. With nothing typed, all of them by
 * label. */
export function zoneSearch(choices: { id: string; label: string }[], typed: string): { id: string; label: string }[] {
  const wanted = typed.trim().toLowerCase();
  if (!wanted) return choices;
  const rank = (c: { id: string; label: string }) => {
    const known = COMMON.indexOf(c.id);
    const named = c.label.toLowerCase().includes(wanted);
    return [named ? (known >= 0 ? 0 : 1) : 2, known >= 0 ? known : COMMON.length] as const;
  };
  return choices
    .filter((c) => zoneMatches(c, typed))
    .sort((a, b) => rank(a)[0] - rank(b)[0] || rank(a)[1] - rank(b)[1] || a.label.localeCompare(b.label, "en"));
}
